<?php

namespace App\DTOs;

use Carbon\Carbon;

readonly class AvailabilityQueryDTO
{
    public function __construct(
        public Carbon $date,
        public string $timezone,
    ) {}
}
