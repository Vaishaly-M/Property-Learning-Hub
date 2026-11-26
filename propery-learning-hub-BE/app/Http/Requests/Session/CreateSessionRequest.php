<?php

namespace App\Http\Requests\Session;

use Illuminate\Foundation\Http\FormRequest;

class CreateSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'mentor_id' => 'required_without:student_id|exists:users,id',
            'student_id' => 'required_without:mentor_id|exists:users,id',
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'timezone' => 'nullable|string|max:64',
        ];
    }
}
