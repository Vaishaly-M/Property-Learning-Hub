<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomField extends Model
{
    protected $fillable = [
        'module_name',
        'field_key',
        'field_name',
        'field_type',
        'validation',
        'field_config',
        'default_value',
        'required',
        'active',
        'hidden',
        'sort_order',
        'created_by',
    ];

    protected $casts = [
        'validation' => 'array',
        'field_config' => 'array',
        'required' => 'boolean',
        'active' => 'boolean',
        'hidden' => 'boolean',
    ];

    public function options(): HasMany
    {
        return $this->hasMany(CustomFieldOption::class)->orderBy('sort_order');
    }

    public function values(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
