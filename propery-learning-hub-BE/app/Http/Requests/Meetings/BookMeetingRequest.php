<?php

namespace App\Http\Requests\Meetings;

use App\Support\MeetingProviders;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class BookMeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('topic') && !$this->filled('meeting_type')) {
            $this->merge(['meeting_type' => $this->input('topic')]);
        }
    }

    public function rules(): array
    {
        $types = implode(',', config('services.microsoft.meeting_types', ['strategy_call']));
        $hasIdentity = $this->user() || $this->bearerToken();

        return [
            'name' => $hasIdentity ? 'nullable|string|max:255' : 'required|string|max:255',
            'email' => $hasIdentity ? 'nullable|email|max:255' : 'required|email|max:255',
            'phone' => 'nullable|string|max:30',
            'meeting_type' => 'required|string|in:' . $types,
            'topic' => 'nullable|string|in:' . $types,
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'timezone' => 'nullable|string|max:64',
            'notes' => 'nullable|string|max:5000',
            'participants' => 'nullable|array|max:10',
            'participants.*.name' => 'required_with:participants.*.email|string|max:255',
            'participants.*.email' => 'required_with:participants.*.name|email|max:255',
            'meeting_provider' => 'nullable|string|in:teams,zoom',
        ];
    }

    protected function passedValidation(): void
    {
        if (!$this->filled('meeting_provider')) {
            $this->merge(['meeting_provider' => MeetingProviders::default()]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $provider = (string) $this->input('meeting_provider', MeetingProviders::default());

            if (!MeetingProviders::isAllowed($provider)) {
                $validator->errors()->add(
                    'meeting_provider',
                    $provider === 'zoom'
                        ? 'Zoom meetings are not available. Please choose Microsoft Teams.'
                        : 'The selected meeting platform is not supported.',
                );
            }
        });
    }
}
