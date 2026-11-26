{{-- Shared booking details for meeting confirmation emails --}}
@if(!empty($showParticipantDetails))
<h3 style="margin: 1.25rem 0 0.75rem; font-size: 1rem;">{{ $detailsHeading ?? 'Your details' }}</h3>
<ul style="margin: 0; padding-left: 1.25rem;">
    <li><strong>Name:</strong> {{ $meeting->name }}</li>
    <li><strong>Email:</strong> {{ $meeting->email }}</li>
    @if($meeting->phone)
    <li><strong>Phone:</strong> {{ $meeting->phone }}</li>
    @endif
</ul>
@endif

@if(!empty($showParticipantDetails) && count($meeting->visibleParticipants()) > 0)
<p style="margin: 1rem 0 0.5rem;"><strong>Additional participants:</strong></p>
<ul style="margin: 0; padding-left: 1.25rem;">
    @foreach($meeting->visibleParticipants() as $participant)
    <li>{{ $participant['name'] ?? '' }} ({{ $participant['email'] ?? '' }})</li>
    @endforeach
</ul>
@endif

@if($meeting->notes)
<div style="margin: 1.25rem 0;">
    <p style="margin: 0 0 0.5rem;"><strong>{{ $meeting->discussionLabel() }}</strong></p>
    @if(count($meeting->discussionPrompts()) > 0)
    <ul style="margin: 0 0 0.75rem; padding-left: 1.25rem; color: #64748b; font-size: 0.95rem;">
        @foreach($meeting->discussionPrompts() as $prompt)
        <li>{{ $prompt }}</li>
        @endforeach
    </ul>
    @endif
    <p style="margin: 0; white-space: pre-wrap;">{{ $meeting->notes }}</p>
</div>
@endif

<h3 style="margin: 1.25rem 0 0.75rem; font-size: 1rem;">Meeting details</h3>
<ul style="margin: 0; padding-left: 1.25rem;">
    <li><strong>Topic:</strong> {{ ucwords(str_replace('_', ' ', $meeting->meeting_type)) }}</li>
    <li><strong>Meeting platform:</strong> {{ $meeting->providerLabel() }}</li>
    <li><strong>Date:</strong> {{ $meeting->formattedMeetingDate() }}</li>
    <li><strong>Time:</strong> {{ $meeting->formattedMeetingTimeRange() }}</li>
</ul>

@if(($showJoinLink ?? true) && $meeting->joinUrl())
<p style="margin: 1rem 0 0;">
    <strong>{{ $meeting->providerLabel() }}:</strong>
    <a href="{{ $meeting->joinUrl() }}">{{ $meeting->joinUrl() }}</a>
</p>
@endif

@php
    $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
    $manageUrl = $meeting->uuid && $meeting->manage_token
        ? "{$frontend}/meetings/manage/{$meeting->uuid}?token={$meeting->manage_token}"
        : null;
@endphp
@if(($showManageLink ?? true) && $manageUrl)
<p style="margin: 1rem 0 0;">
    <a href="{{ $manageUrl }}">Reschedule or cancel this meeting</a>
</p>
@endif
