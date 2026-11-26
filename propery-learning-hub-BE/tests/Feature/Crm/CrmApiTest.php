<?php

namespace Tests\Feature\Crm;

use App\Models\Communication;
use App\Models\Contact;
use App\Models\User;
use App\Services\Crm\CrmCommunicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CrmApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'first_name'        => 'CRM',
            'last_name'         => 'Admin',
            'email'             => 'crm-admin@test.com',
            'phone_number'      => '+10000000099',
            'password'          => bcrypt('password'),
            'role'              => 'instructor',
            'status'            => 'active',
            'email_verified_at' => now(),
        ]);
    }

    public function test_admin_can_create_contact(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/admin/crm/contacts', [
            'first_name'      => 'Jane',
            'last_name'       => 'Doe',
            'email'           => 'jane@example.com',
            'phone_number'    => '+441234567890',
            'classifications' => ['enquiry', 'lead'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('contacts', ['email' => 'jane@example.com']);
        $this->assertDatabaseHas('contact_classifications', ['classification' => 'lead']);

        $contact = Contact::where('email', 'jane@example.com')->first();
        $this->assertSame('FPA-' . str_pad((string) $contact->id, 6, '0', STR_PAD_LEFT), $contact->contact_ref);
    }

    public function test_admin_can_create_contact_without_email(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/admin/crm/contacts', [
            'first_name'      => 'No',
            'last_name'       => 'Email',
            'email'           => '',
            'phone_number'    => '0541656464599',
            'classifications' => ['lead'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('contacts', [
            'first_name' => 'No',
            'last_name'  => 'Email',
            'email'      => null,
        ]);
    }

    public function test_admin_can_list_contacts(): void
    {
        Sanctum::actingAs($this->admin);

        Contact::create([
            'contact_ref'  => 'FPA-000001',
            'first_name'   => 'Test',
            'last_name'    => 'Contact',
            'email'        => 'test@example.com',
            'status'       => 'active',
            'created_by'   => $this->admin->id,
        ]);

        $response = $this->getJson('/api/admin/crm/contacts');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'pagination']);
    }

    public function test_admin_can_soft_delete_contact(): void
    {
        Sanctum::actingAs($this->admin);

        $contact = Contact::create([
            'contact_ref' => 'FPA-000002',
            'first_name'  => 'Delete',
            'last_name'   => 'Me',
            'email'       => 'delete@example.com',
            'status'      => 'active',
            'created_by'  => $this->admin->id,
        ]);

        $response = $this->deleteJson("/api/admin/crm/contacts/{$contact->id}");

        $response->assertOk();
        $this->assertSoftDeleted('contacts', ['id' => $contact->id]);
    }

    public function test_communication_send_delivers_email(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->admin);

        $contact = Contact::create([
            'contact_ref' => 'FPA-000003',
            'first_name'  => 'Email',
            'last_name'   => 'Recipient',
            'email'       => 'recipient@example.com',
            'status'      => 'active',
            'created_by'  => $this->admin->id,
        ]);

        $communication = Communication::create([
            'type'            => 'email_campaign',
            'subject'         => 'Test Campaign',
            'body'            => 'Hello from CRM',
            'audience_filter' => 'custom',
            'status'          => 'draft',
            'created_by'      => $this->admin->id,
        ]);

        $service = app(CrmCommunicationService::class);
        $service->attachRecipients($communication, [$contact->id]);
        $sent = $service->send($communication, [$contact->id]);

        $this->assertEquals(1, $sent);
        Mail::assertSent(\App\Mail\CrmCommunicationMail::class);
        $this->assertDatabaseHas('communications', ['id' => $communication->id, 'status' => 'sent']);
    }

    public function test_dashboard_returns_metrics(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/crm/dashboard?range=30days');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'membership_metrics',
                    'sales_metrics',
                    'engagement_metrics',
                    'lead_metrics',
                ],
            ]);
    }

    public function test_unauthenticated_cannot_access_crm(): void
    {
        $response = $this->getJson('/api/admin/crm/contacts');
        $response->assertUnauthorized();
    }
}
