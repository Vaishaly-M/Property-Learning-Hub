<?php

namespace Tests\Feature\Crm;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FreesbyTemplateLeadTest extends TestCase
{
    use RefreshDatabase;

    public function test_freesby_template_request_creates_crm_contact_with_freesby_classification(): void
    {
        $response = $this->postJson('/api/public/freesby/template-request', [
            'full_name' => 'Jane Smith',
            'email' => 'jane@example.com',
            'phone' => '+441234567890',
            'template' => 'Digital Welcome Book',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('contacts', [
            'email' => 'jane@example.com',
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'phone_number' => '+441234567890',
        ]);

        $this->assertDatabaseHas('contact_classifications', [
            'classification' => 'freesby',
        ]);

        $this->assertDatabaseHas('contact_activities', [
            'activity_type' => 'note_added',
            'title' => 'Freesby template requested',
        ]);
    }

    public function test_existing_contact_gets_freesby_classification_without_removing_others(): void
    {
        $this->postJson('/api/public/freesby/template-request', [
            'full_name' => 'John Doe',
            'email' => 'john@example.com',
            'template' => 'Welcome Card',
        ])->assertCreated();

        $contactId = (int) \DB::table('contacts')->where('email', 'john@example.com')->value('id');

        \DB::table('contact_classifications')->insert([
            'contact_id' => $contactId,
            'classification' => 'lead',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/public/freesby/template-request', [
            'full_name' => 'John Doe',
            'email' => 'john@example.com',
            'template' => 'Digital Welcome Book',
        ])->assertCreated();

        $this->assertDatabaseHas('contact_classifications', [
            'contact_id' => $contactId,
            'classification' => 'lead',
        ]);

        $this->assertDatabaseHas('contact_classifications', [
            'contact_id' => $contactId,
            'classification' => 'freesby',
        ]);
    }

    public function test_freesby_template_request_requires_name_email_and_template(): void
    {
        $response = $this->postJson('/api/public/freesby/template-request', [
            'full_name' => '',
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
