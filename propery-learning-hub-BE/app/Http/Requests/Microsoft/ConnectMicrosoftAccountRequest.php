<?php

namespace App\Http\Requests\Microsoft;

use Illuminate\Foundation\Http\FormRequest;

class ConnectMicrosoftAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->isInstructor();
    }

    public function rules(): array
    {
        return [];
    }
}
