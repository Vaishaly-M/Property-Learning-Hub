<?php

namespace Tests\Unit\Meetings;

use App\Services\Zoom\ZoomApiService;
use App\Support\MeetingProviders;
use Mockery;
use Tests\TestCase;

class MeetingProvidersTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_available_providers_include_only_teams_when_zoom_not_configured(): void
    {
        $zoom = Mockery::mock(ZoomApiService::class);
        $zoom->shouldReceive('isConfigured')->andReturn(false);
        $this->app->instance(ZoomApiService::class, $zoom);

        $this->assertFalse(MeetingProviders::zoomEnabled());
        $this->assertSame(['teams'], MeetingProviders::available());
        $this->assertTrue(MeetingProviders::isAllowed('teams'));
        $this->assertFalse(MeetingProviders::isAllowed('zoom'));
    }

    public function test_available_providers_include_zoom_when_configured(): void
    {
        $zoom = Mockery::mock(ZoomApiService::class);
        $zoom->shouldReceive('isConfigured')->andReturn(true);
        $this->app->instance(ZoomApiService::class, $zoom);

        $this->assertTrue(MeetingProviders::zoomEnabled());
        $this->assertSame(['teams', 'zoom'], MeetingProviders::available());
        $this->assertTrue(MeetingProviders::isAllowed('zoom'));
    }

    public function test_default_provider_is_teams(): void
    {
        $this->assertSame('teams', MeetingProviders::default());
    }
}
