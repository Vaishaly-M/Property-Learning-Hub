<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MicrosoftAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'display_name' => $this->display_name,
            'microsoft_user_id' => $this->microsoft_user_id,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'connected' => true,
            'connected_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
