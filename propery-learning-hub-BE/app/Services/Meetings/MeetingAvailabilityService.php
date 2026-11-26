<?php

namespace App\Services\Meetings;

use App\DTOs\AvailabilityQueryDTO;
use App\Models\AdminAvailabilityBlock;
use App\Models\Meeting;
use App\Repositories\AvailabilitySettingRepository;
use App\Repositories\PlatformMeetingRepository;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use App\Support\TimezoneHelper;
use Carbon\Carbon;

class MeetingAvailabilityService
{
    public function __construct(
        private readonly AdminMicrosoftGraphService $graph,
        private readonly PlatformMeetingRepository $meetings,
        private readonly AvailabilitySettingRepository $settings,
    ) {}

    public function getAvailableSlots(AvailabilityQueryDTO $query): array
    {
        $settings = $this->settings->getSettings();
        $timezone = TimezoneHelper::resolve($query->timezone ?: $settings->timezone);
        $slotMinutes = $settings->slot_duration;
        $dayOfWeek = $query->date->copy()->timezone($timezone)->dayOfWeek;

        if ($dayOfWeek === 0 || $dayOfWeek === 6) {
            return [];
        }

        $dayStart = Carbon::parse(
            $query->date->format('Y-m-d') . ' ' . $this->normalizeTimeString($settings->working_hours_start),
            $timezone
        );
        $dayEnd = Carbon::parse(
            $query->date->format('Y-m-d') . ' ' . $this->normalizeTimeString($settings->working_hours_end),
            $timezone
        );

        if ($dayEnd->lte($dayStart)) {
            return [];
        }

        $busySlots = $this->collectBusySlots($dayStart, $dayEnd, $timezone, $settings);

        return $this->generateAvailableSlots($dayStart, $dayEnd, $busySlots, $slotMinutes, $timezone);
    }

    public function isSlotAvailable(Carbon $start, Carbon $end, ?int $excludeMeetingId = null, ?string $timezone = null): bool
    {
        $start = $start->copy()->utc();
        $end = $end->copy()->utc();

        if ($start->isPast() || $end->lte($start)) {
            return false;
        }

        if ($this->meetings->hasConflict($start, $end, $excludeMeetingId)) {
            return false;
        }

        $timezone = TimezoneHelper::resolve($timezone ?: $this->settings->getSettings()->timezone);
        $daySlots = $this->getAvailableSlots(
            new AvailabilityQueryDTO($start->copy()->timezone($timezone)->startOfDay(), $timezone)
        );

        foreach ($daySlots as $slot) {
            $slotStart = Carbon::parse($slot['start'])->utc();
            $slotEnd = Carbon::parse($slot['end'])->utc();

            if ($slotStart->equalTo($start) && $slotEnd->equalTo($end)) {
                return true;
            }
        }

        return false;
    }

    private function collectBusySlots(Carbon $start, Carbon $end, string $timezone, $settings): array
    {
        $busy = [];

        if ($settings->lunch_break_start && $settings->lunch_break_end) {
            $busy[] = [
                'start' => Carbon::parse($start->format('Y-m-d') . ' ' . $this->normalizeTimeString($settings->lunch_break_start), $timezone),
                'end' => Carbon::parse($start->format('Y-m-d') . ' ' . $this->normalizeTimeString($settings->lunch_break_end), $timezone),
            ];
        }

        foreach (AdminAvailabilityBlock::where('start_time', '<', $end)->where('end_time', '>', $start)->get() as $block) {
            $busy[] = [
                'start' => $this->parseStoredUtcTime($block->getRawOriginal('start_time'), $timezone),
                'end' => $this->parseStoredUtcTime($block->getRawOriginal('end_time'), $timezone),
            ];
        }

        try {
            foreach ($this->fetchOutlookBusySlots(
                $start,
                $end,
                $timezone,
                $this->meetings->getManagedOutlookEventIds($start, $end),
                $this->meetings->getCancelledBetween($start, $end),
            ) as $slot) {
                $busy[] = $slot;
            }
        } catch (\Throwable $e) {
            report($e);
        }

        foreach ($this->meetings->getActiveBetween($start, $end) as $meeting) {
            $busy[] = [
                'start' => $this->parseStoredUtcTime($meeting->getRawOriginal('start_time'), $timezone),
                'end' => $this->parseStoredUtcTime($meeting->getRawOriginal('end_time'), $timezone),
            ];
        }

        foreach ($this->getCrmMeetingBusySlots($start, $end, $timezone) as $slot) {
            $busy[] = $slot;
        }

        $clipped = [];
        foreach ($busy as $slot) {
            $clippedSlot = $this->clipBusySlotToDay($slot, $start, $end);
            if ($clippedSlot) {
                $clipped[] = $clippedSlot;
            }
        }

        return $this->mergeBusySlots($clipped);
    }

    private function clipBusySlotToDay(array $slot, Carbon $dayStart, Carbon $dayEnd): ?array
    {
        $slotStart = $slot['start']->copy();
        $slotEnd = $slot['end']->copy();

        if ($slotEnd->lte($dayStart) || $slotStart->gte($dayEnd)) {
            return null;
        }

        return [
            'start' => $slotStart->lt($dayStart) ? $dayStart->copy() : $slotStart,
            'end' => $slotEnd->gt($dayEnd) ? $dayEnd->copy() : $slotEnd,
        ];
    }

    private function parseStoredUtcTime(mixed $value, string $timezone): Carbon
    {
        if ($value instanceof Carbon) {
            return $value->copy()->utc()->timezone($timezone);
        }

        return Carbon::parse((string) $value, 'UTC')->timezone($timezone);
    }

    private function normalizeTimeString(?string $time): string
    {
        if (!$time) {
            return '00:00:00';
        }

        $time = trim($time);

        if (preg_match('/^\d{2}:\d{2}$/', $time)) {
            return $time . ':00';
        }

        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $time)) {
            return $time;
        }

        return Carbon::parse($time)->format('H:i:s');
    }

    private function getCrmMeetingBusySlots(Carbon $start, Carbon $end, string $timezone): array
    {
        $slots = [];

        $crmMeetings = Meeting::query()
            ->where('date', '>=', $start->toDateString())
            ->where('date', '<=', $end->toDateString())
            ->whereIn('status', ['scheduled', 'live', 'upcoming'])
            ->get();

        foreach ($crmMeetings as $crm) {
            if (!$crm->date || !$crm->time) {
                continue;
            }

            $meetingStart = Carbon::parse($crm->date->format('Y-m-d') . ' ' . $crm->time->format('H:i:s'), $timezone);
            $duration = (int) ($crm->duration ?? 60);
            $meetingEnd = $meetingStart->copy()->addMinutes($duration);

            if ($meetingStart->lt($end) && $meetingEnd->gt($start)) {
                $slots[] = ['start' => $meetingStart, 'end' => $meetingEnd];
            }
        }

        return $slots;
    }

    private function mergeBusySlots(array $slots): array
    {
        if (empty($slots)) {
            return [];
        }

        usort($slots, fn ($a, $b) => $a['start'] <=> $b['start']);

        $merged = [$slots[0]];

        for ($i = 1; $i < count($slots); $i++) {
            $last = &$merged[count($merged) - 1];
            $current = $slots[$i];

            if ($current['start']->lte($last['end'])) {
                $last['end'] = $current['end']->gt($last['end']) ? $current['end'] : $last['end'];
            } else {
                $merged[] = $current;
            }
        }

        return $merged;
    }

    private function generateAvailableSlots(
        Carbon $dayStart,
        Carbon $dayEnd,
        array $busySlots,
        int $slotMinutes,
        string $timezone
    ): array {
        $available = [];
        $cursor = $dayStart->copy();
        $busyIndex = 0;
        $busyCount = count($busySlots);

        while ($cursor->lt($dayEnd)) {
            $slotEnd = $cursor->copy()->addMinutes($slotMinutes);

            if ($slotEnd->gt($dayEnd)) {
                break;
            }

            while ($busyIndex < $busyCount && $busySlots[$busyIndex]['end']->lte($cursor)) {
                $busyIndex++;
            }

            if ($busyIndex < $busyCount) {
                $busy = $busySlots[$busyIndex];
                if ($cursor->lt($busy['end']) && $slotEnd->gt($busy['start'])) {
                    $next = $busy['end']->copy();
                    if ($next->gte($dayEnd)) {
                        break;
                    }
                    $cursor = $next;
                    continue;
                }
            }

            if ($cursor->gte(now($timezone))) {
                $available[] = [
                    'start' => $cursor->toIso8601String(),
                    'end' => $slotEnd->toIso8601String(),
                    'label' => $cursor->format('H:i') . ' - ' . $slotEnd->format('H:i'),
                ];
            }

            $cursor->addMinutes($slotMinutes);
        }

        return $available;
    }

    /**
     * Live Outlook / Teams calendar busy times (always fetched from Microsoft Graph).
     *
     * @param  list<string>  $ignoreEventIds
     * @param  \Illuminate\Support\Collection<int, \App\Models\PlatformMeeting>  $releasedMeetings
     * @return array<int, array{start: Carbon, end: Carbon}>
     */
    public function fetchOutlookBusySlots(
        Carbon $start,
        Carbon $end,
        string $timezone,
        array $ignoreEventIds = [],
        $releasedMeetings = null,
    ): array {
        $busy = [];
        $seen = [];
        $ignoreEventIds = array_values(array_filter(array_unique($ignoreEventIds)));
        $releasedMeetings = $releasedMeetings ?? collect();
        $releasedWindows = $this->buildReleasedWindows($releasedMeetings, $timezone);

        $calendarEvents = [];
        try {
            $calendarEvents = $this->graph->getCalendarEvents($start, $end);
        } catch (\Throwable) {
            //
        }

        foreach ($calendarEvents as $event) {
            if (!in_array((string) ($event['id'] ?? ''), $ignoreEventIds, true)) {
                continue;
            }

            $slot = $this->parseGraphTimeRange($event['start'] ?? [], $event['end'] ?? [], $timezone);
            if ($slot) {
                $releasedWindows[] = $slot;
            }
        }

        try {
            foreach ($this->graph->getSchedule($start, $end, $timezone) as $item) {
                if (!$this->isGraphScheduleItemBusy($item['status'] ?? '')) {
                    continue;
                }

                $slot = $this->parseGraphTimeRange($item['start'] ?? [], $item['end'] ?? [], $timezone);
                if (
                    $slot
                    && !$this->slotMatchesReleasedWindow($slot, $releasedWindows)
                    && $this->rememberBusySlot($seen, $slot)
                ) {
                    $busy[] = $slot;
                }
            }
        } catch (\Throwable) {
            // getSchedule may fail with app-only tokens; calendarView is the fallback.
        }

        foreach ($calendarEvents as $event) {
            if (($event['isCancelled'] ?? false) === true) {
                continue;
            }

            if (in_array((string) ($event['id'] ?? ''), $ignoreEventIds, true)) {
                continue;
            }

            if (!$this->isGraphCalendarEventBusy($event)) {
                continue;
            }

            $slot = $this->parseGraphTimeRange($event['start'] ?? [], $event['end'] ?? [], $timezone);
            if ($slot && $this->rememberBusySlot($seen, $slot)) {
                $busy[] = $slot;
            }
        }

        return $this->mergeBusySlots($busy);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \App\Models\PlatformMeeting>  $releasedMeetings
     * @return list<array{start: Carbon, end: Carbon}>
     */
    private function buildReleasedWindows($releasedMeetings, string $timezone): array
    {
        $windows = [];

        foreach ($releasedMeetings as $meeting) {
            $windows[] = [
                'start' => $this->parseStoredUtcTime($meeting->getRawOriginal('start_time'), $timezone),
                'end' => $this->parseStoredUtcTime($meeting->getRawOriginal('end_time'), $timezone),
            ];
        }

        return $windows;
    }

    /**
     * @param  array{start: Carbon, end: Carbon}  $slot
     * @param  list<array{start: Carbon, end: Carbon}>  $releasedWindows
     */
    private function slotMatchesReleasedWindow(array $slot, array $releasedWindows): bool
    {
        foreach ($releasedWindows as $released) {
            if ($slot['start']->equalTo($released['start']) && $slot['end']->equalTo($released['end'])) {
                return true;
            }
        }

        return false;
    }

    private function rememberBusySlot(array &$seen, array $slot): bool
    {
        $key = $slot['start']->toIso8601String() . '|' . $slot['end']->toIso8601String();

        if (isset($seen[$key])) {
            return false;
        }

        $seen[$key] = true;

        return true;
    }

    private function isGraphScheduleItemBusy(string $status): bool
    {
        return in_array(strtolower($status), ['busy', 'tentative', 'oof', 'workingelsewhere', 'unknown'], true);
    }

    private function isGraphCalendarEventBusy(array $event): bool
    {
        if (!isset($event['showAs'])) {
            return true;
        }

        return $this->isGraphScheduleItemBusy((string) $event['showAs']);
    }

    /** @param  array<string, mixed>  $start */
    /** @param  array<string, mixed>  $end */
    private function parseGraphTimeRange(array $start, array $end, string $fallbackTimezone): ?array
    {
        if (empty($start['dateTime']) || empty($end['dateTime'])) {
            return null;
        }

        $startTz = TimezoneHelper::resolveGraph($start['timeZone'] ?? null, $fallbackTimezone);
        $endTz = TimezoneHelper::resolveGraph($end['timeZone'] ?? null, $fallbackTimezone);
        $startValue = $this->normalizeGraphDateTime((string) $start['dateTime']);
        $endValue = $this->normalizeGraphDateTime((string) $end['dateTime']);

        try {
            $startAt = Carbon::parse($startValue, $startTz)->timezone($fallbackTimezone);
            $endAt = Carbon::parse($endValue, $endTz)->timezone($fallbackTimezone);
        } catch (\Throwable) {
            $startAt = Carbon::parse($startValue, $fallbackTimezone);
            $endAt = Carbon::parse($endValue, $fallbackTimezone);
        }

        if ($endAt->lte($startAt)) {
            return null;
        }

        return [
            'start' => $startAt,
            'end' => $endAt,
        ];
    }

    private function normalizeGraphDateTime(string $dateTime): string
    {
        return substr($dateTime, 0, 19);
    }
}
