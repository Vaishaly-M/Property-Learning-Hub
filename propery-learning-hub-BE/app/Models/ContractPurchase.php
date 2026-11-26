<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ContractPurchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'contract_template_id',
        'status',
        'amount_paid',
        'stripe_payment_intent_id',
        'purchased_at',
    ];

    protected $casts = [
        'amount_paid'  => 'float',
        'purchased_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function template()
    {
        return $this->belongsTo(ContractTemplate::class, 'contract_template_id');
    }
}