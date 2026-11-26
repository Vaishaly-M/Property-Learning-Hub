<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class WeeklyReportRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user()->isAdmin();
    }

    public function rules()
    {
        return [
            'week_start' => 'nullable|date',
            'user_id' => 'nullable|exists:users,id',
        ];
    }
}