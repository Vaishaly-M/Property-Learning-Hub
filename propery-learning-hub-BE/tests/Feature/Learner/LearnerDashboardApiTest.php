<?php

namespace Tests\Feature\Learner;

use App\Models\ContractTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LearnerDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_learner_dashboard_loads_when_contract_templates_exist(): void
    {
        $learner = User::create([
            'first_name' => 'Diru',
            'last_name' => 'Testing',
            'email' => 'diru-dashboard@test.com',
            'phone_number' => '+10000004001',
            'password' => bcrypt('password'),
            'role' => 'learner',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        ContractTemplate::create([
            'user_id' => $learner->id,
            'title' => 'Purchase Agreement',
            'category' => 'Legal',
            'description' => 'Standard purchase template',
            'price' => 49.99,
            'is_active' => true,
            'is_global' => true,
        ]);

        Sanctum::actingAs($learner);

        $this->getJson('/api/learner/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.contractTemplates.0.name', 'Purchase Agreement')
            ->assertJsonPath('data.contractTemplates.0.popular', false);
    }
}
