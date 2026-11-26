<?php

namespace App\Http\Resources;

use App\Support\MeetingExtraAttendee;
use App\Support\TimezoneHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlatformMeetingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $manageBase = $this->uuid && $this->manage_token
            ? "{$frontend}/meetings/manage/{$this->uuid}?token={$this->manage_token}"
            : null;

        $timezone = TimezoneHelper::resolve($this->timezone);
        $startLocal = $this->start_time?->copy()->timezone($timezone);
        $endLocal = $this->end_time?->copy()->timezone($timezone);

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'user_id' => $this->user_id,
            'booking_type' => $this->booking_type,
            'name' => $this->name,
            'participant_name' => $this->name,
            'email' => $this->email,
            'participant_email' => $this->email,
            'phone' => $this->phone,
            'participant_phone' => $this->phone,
            'participants' => MeetingExtraAttendee::filterVisible($this->participants ?? []),
            'all_participants' => $this->resource->allAttendeesForDisplay(),
            'meeting_type' => $this->meeting_type,
            'topic' => $this->meeting_type,
            'meeting_type_label' => ucwords(str_replace('_', ' ', $this->meeting_type)),
            'meeting_provider' => $this->resolvedProvider(),
            'meeting_provider_label' => $this->providerLabel(),
            'event_id' => $this->event_id,
            'teams_event_id' => $this->event_id,
            'teams_meeting_id' => $this->teams_meeting_id,
            'teams_join_url' => $this->teams_join_url,
            'teams_meeting_url' => $this->teams_join_url,
            'provider_meeting_id' => $this->provider_meeting_id,
            'provider_join_url' => $this->provider_join_url,
            'provider_start_url' => $this->provider_start_url,
            'join_url' => $this->joinUrl(),
            'organizer_email' => $this->organizer_email,
            'start_time' => $this->start_time?->copy()->utc()->toIso8601String(),
            'meeting_start' => $this->start_time?->copy()->utc()->toIso8601String(),
            'end_time' => $this->end_time?->copy()->utc()->toIso8601String(),
            'meeting_end' => $this->end_time?->copy()->utc()->toIso8601String(),
            'local_date' => $startLocal?->format('Y-m-d'),
            'local_start_time' => $startLocal?->format('H:i'),
            'local_end_time' => $endLocal?->format('H:i'),
            'status' => $this->status,
            'public_status' => $this->public_status,
            'notes' => $this->notes,
            'timezone' => $timezone,
            'reschedule_url' => $manageBase,
            'cancel_url' => $manageBase ? $manageBase . '&action=cancel' : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
