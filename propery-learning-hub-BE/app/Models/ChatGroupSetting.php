<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatGroupSetting extends Model
{
    protected $fillable = [
        'chat_id',
        'allow_file_share',
        'allow_audio_share',
        'allow_member_invite',
        'allow_member_remove',
        'updated_by',
    ];

    protected $casts = [
        'allow_file_share'    => 'boolean',
        'allow_audio_share'   => 'boolean',
        'allow_member_invite' => 'boolean',
        'allow_member_remove' => 'boolean',
    ];

    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
