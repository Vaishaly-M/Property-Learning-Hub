<?php
// app/Http/Requests/UpdateContentRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->isInstructor();
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:content_categories,id',
            'is_published' => 'boolean',
            'duration' => 'nullable|string|max:20',
            'file' => 'nullable|mimes:mp4,mov,avi,mkv,pdf,doc,docx,xls,xlsx|max:102400'
        ];
    }
}