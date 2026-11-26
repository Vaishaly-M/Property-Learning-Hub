<?php

namespace Tests\Unit\Support;

use App\Support\FrontendOrigins;
use Tests\TestCase;

class FrontendOriginsTest extends TestCase
{
    public function test_expands_www_and_non_www_variants(): void
    {
        config(['app.frontend_url' => 'https://freedompropertyacademy.com']);

        $origins = FrontendOrigins::allowed();

        $this->assertContains('https://freedompropertyacademy.com', $origins);
        $this->assertContains('https://www.freedompropertyacademy.com', $origins);
    }

    public function test_stateful_domains_include_both_hosts(): void
    {
        config(['app.frontend_url' => 'https://www.freedompropertyacademy.com']);

        $domains = FrontendOrigins::statefulDomains();

        $this->assertContains('freedompropertyacademy.com', $domains);
        $this->assertContains('www.freedompropertyacademy.com', $domains);
    }
}
