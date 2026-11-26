<?php

namespace App\Services\Microsoft;

use App\Models\MentorWorkingHour;
use App\Models\User;
use App\Repositories\SessionRepository;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class AvailabilityService
{
    public function __construct(
        private readonly MicrosoftGraphService $graph,
        private readonly SessionRepository $sessions,
    ) {}

    public function getAvailableSlots(User $mentor, Carbon $date, string $timezone = 'UTC'): array
    {
        $slotMinutes = (int) config('services.microsoft.slot_duration_minutes', 30);
        $dayOfWeek = $date->copy()->timezone($timezone)->dayOfWeek;

        $workingHour = MentorWorkingHour::where('mentor_id', $mentor->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (!$workingHour) {
            return [];
        }

        $dayStart = Carbon::parse(
            $date->format('Y-m-d') . ' ' . $workingHour->start_time,
            $timezone
        );
        $dayEnd = Carbon::parse(
            $date->format('Y-m-d') . ' ' . $workingHour->end_time,
            $timezone
        );

        $busySlots = $this->collectBusySlots($mentor, $dayStart, $dayEnd, $timezone);

        return $this->generateAvailableSlots($dayStart, $dayEnd, $busySlots, $slotMinutes);
    }

    public function isSlotAvailable(User $mentor, Carbon $start, Carbon $end, ?int $excludeSessionId = null): bool
    {
        if ($this->sessions->hasConflict($mentor->id, $start, $end, $excludeSessionId)) {
            return false;
        }

        $timezone = $start->timezoneName ?: 'UTC';
        $daySlots = $this->getAvailableSlots($mentor, $start->copy()->startOfDay(), $timezone);

        foreach ($daySlots as $slot) {
            $slotStart = Carbon::parse($slot['start'], $timezone);
            $slotEnd = Carbon::parse($slot['end'], $timezone);

            if ($slotStart->equalTo($start) && $slotEnd->equalTo($end)) {
                return true;
            }
        }

        return false;
    }

    private function collectBusySlots(User $mentor, Carbon $start, Carbon $end, string $timezone): array
    {
        $busy = [];

        try {
            $scheduleItems = $this->graph->getSchedule($mentor, $start, $end, $timezone);

            foreach ($scheduleItems as $item) {
                if (($item['status'] ?? '') === 'free') {
                    continue;
                }

                $busy[] = [
                    'start' => Carbon::parse($item['start']['dateTime'], $timezone),
                    'end' => Carbon::parse($item['end']['dateTime'], $timezone),
                ];
            }
        } catch (\Throwable) {
            // Fall back to local session conflicts only if Graph is unavailable.
        }

        $localSessions = $this->sessions->getUpcomingForMentor($mentor->id)
            ->filter(fn ($s) => $s->start_time->lt($end) && $s->end_time->gt($start));

        foreach ($localSessions as $session) {
            $busy[] = [
                'start' => $session->start_time->copy()->timezone($timezone),
                'end' => $session->end_time->copy()->timezone($timezone),
            ];
        }

        return $this->mergeBusySlots($busy);
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
        int $slotMinutes
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

            $isBusy = false;

            while ($busyIndex < $busyCount && $busySlots[$busyIndex]['end']->lte($cursor)) {
                $busyIndex++;
            }

            if ($busyIndex < $busyCount) {
                $busy = $busySlots[$busyIndex];
                if ($cursor->lt($busy['end']) && $slotEnd->gt($busy['start'])) {
                    $isBusy = true;
                    $cursor = $busy['end']->copy();
                    continue;
                }
            }

            if (!$isBusy && $cursor->gte(now())) {
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

    public function seedDefaultWorkingHours(User $mentor, string $timezone = 'UTC'): void
    {
        if ($mentor->mentorWorkingHours()->exists()) {
            return;
        }

        foreach (range(1, 5) as $day) {
            MentorWorkingHour::create([
                'mentor_id' => $mentor->id,
                'day_of_week' => $day,
                'start_time' => '09:00:00',
                'end_time' => '17:00:00',
                'timezone' => $timezone,
                'is_active' => true,
            ]);
        }
    }
}
