<?php
// app/Http/Requests/StoreContentRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->isInstructor();
    }

    public function rules(): array
    {
        $rules = [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:content_categories,id',
            'type' => 'required|in:video,document,image',
            'is_published' => 'boolean'
        ];

        // File validation rules
        $fileRules = match ($this->input('type')) {
            'video' => 'required|mimes:mp4,mov,avi,mkv|max:102400',
            'image' => 'required|mimes:jpeg,png,jpg,gif,webp|max:20480',
            default => 'required|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt|max:51200',
        };

        $rules['file'] = $fileRules;

        if ($this->input('type') === 'video') {
            $rules['duration'] = 'required|string|max:20';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'file.mimes' => match ($this->input('type')) {
                'video' => 'Video must be MP4, MOV, AVI, or MKV format',
                'image' => 'Image must be JPEG, PNG, GIF, or WebP format',
                default => 'Document must be PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, or TXT format',
            },
            'file.max' => match ($this->input('type')) {
                'video' => 'Video size must be less than 100MB',
                'image' => 'Image size must be less than 20MB',
                default => 'Document size must be less than 50MB',
            },
        ];
    }
}