<?php

namespace Tests\Feature\Chat;

use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\User;
use Database\Seeders\ChatPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $learner;
    protected User $instructor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ChatPermissionSeeder::class);

        $this->learner = User::create([
            'first_name'        => 'Test',
            'last_name'         => 'Learner',
            'email'             => 'chat-learner@test.com',
            'phone_number'      => '+10000000001',
            'password'          => bcrypt('password'),
            'role'              => 'learner',
            'status'            => 'active',
            'email_verified_at' => now(),
        ]);
        $this->learner->assignRole('learner');

        $this->instructor = User::create([
            'first_name'        => 'Test',
            'last_name'         => 'Instructor',
            'email'             => 'chat-instructor@test.com',
            'phone_number'      => '+10000000002',
            'password'          => bcrypt('password'),
            'role'              => 'instructor',
            'status'            => 'active',
            'email_verified_at' => now(),
        ]);
        $this->instructor->assignRole('instructor');
    }

    public function test_user_can_create_private_chat(): void
    {
        Sanctum::actingAs($this->learner);

        $response = $this->postJson('/api/chats', [
            'type'         => 'private',
            'recipient_id' => $this->instructor->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('chats', ['type' => 'private']);
        $this->assertDatabaseCount('chat_members', 2);
    }

    public function test_user_can_send_text_message(): void
    {
        $chat = $this->createPrivateChat();

        Sanctum::actingAs($this->learner);

        $response = $this->postJson("/api/chats/{$chat->id}/messages", [
            'message'      => 'Hello there',
            'message_type' => 'text',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.message', 'Hello there');
    }

    public function test_user_without_permission_cannot_view_chats(): void
    {
        $user = User::create([
            'first_name'        => 'No',
            'last_name'         => 'Perms',
            'email'             => 'noperms@test.com',
            'phone_number'      => '+10000000003',
            'password'          => bcrypt('password'),
            'role'              => 'learner',
            'status'            => 'active',
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/chats')->assertForbidden();
    }

    public function test_instructor_can_create_group(): void
    {
        Sanctum::actingAs($this->instructor);

        $response = $this->postJson('/api/chats', [
            'type'       => 'group',
            'name'       => 'Test Group',
            'member_ids' => [$this->learner->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Test Group');
    }

    public function test_pending_chat_participant_appears_in_chat_list(): void
    {
        $admin = User::create([
            'first_name'        => 'Chat',
            'last_name'         => 'Admin',
            'email'             => 'chat-admin-list@test.com',
            'phone_number'      => '+10000000006',
            'password'          => bcrypt('password'),
            'role'              => 'admin',
            'status'            => 'active',
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        $pendingLearner = User::create([
            'first_name'        => 'Pending',
            'last_name'         => 'Learner',
            'email'             => 'pending-list@test.com',
            'phone_number'      => '+10000000007',
            'password'          => bcrypt('password'),
            'role'              => 'learner',
            'status'            => 'pending',
            'email_verified_at' => now(),
        ]);
        $pendingLearner->assignRole('learner');

        $chat = Chat::create([
            'type'       => 'private',
            'created_by' => $pendingLearner->id,
            'status'     => 'active',
        ]);

        ChatMember::create(['chat_id' => $chat->id, 'user_id' => $pendingLearner->id, 'role' => 'member']);
        ChatMember::create(['chat_id' => $chat->id, 'user_id' => $admin->id, 'role' => 'member']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/chats')
            ->assertOk()
            ->assertJsonFragment(['id' => $chat->id, 'name' => 'Pending Learner']);
    }

    public function test_pending_chat_participant_appears_in_contacts(): void
    {
        $admin = User::create([
            'first_name'        => 'Chat',
            'last_name'         => 'Admin',
            'email'             => 'chat-admin@test.com',
            'phone_number'      => '+10000000004',
            'password'          => bcrypt('password'),
            'role'              => 'admin',
            'status'            => 'active',
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        $pendingLearner = User::create([
            'first_name'        => 'Pending',
            'last_name'         => 'Learner',
            'email'             => 'pending-learner@test.com',
            'phone_number'      => '+10000000005',
            'password'          => bcrypt('password'),
            'role'              => 'learner',
            'status'            => 'pending',
            'email_verified_at' => now(),
        ]);
        $pendingLearner->assignRole('learner');

        $chat = Chat::create([
            'type'       => 'private',
            'created_by' => $pendingLearner->id,
            'status'     => 'active',
        ]);

        ChatMember::create(['chat_id' => $chat->id, 'user_id' => $pendingLearner->id, 'role' => 'member']);
        ChatMember::create(['chat_id' => $chat->id, 'user_id' => $admin->id, 'role' => 'member']);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/chats/contacts');

        $response->assertOk()
            ->assertJsonFragment(['email' => 'pending-learner@test.com', 'account_status' => 'pending'])
            ->assertJsonFragment(['chat_id' => $chat->id]);
    }

    public function test_user_can_upload_chat_file(): void
    {
        Storage::fake('public');
        $chat = $this->createPrivateChat();

        Sanctum::actingAs($this->learner);

        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->post("/api/chats/{$chat->id}/messages", [
            'message_type' => 'file',
            'message'      => 'See attached',
            'file'         => $file,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('chat_attachments', ['file_name' => 'document.pdf']);
    }

    private function createPrivateChat(): Chat
    {
        $chat = Chat::create([
            'type'       => 'private',
            'created_by' => $this->learner->id,
            'status'     => 'active',
        ]);

        ChatMember::create(['chat_id' => $chat->id, 'user_id' => $this->learner->id, 'role' => 'member']);
        ChatMember::create(['chat_id' => $chat->id, 'user_id' => $this->instructor->id, 'role' => 'member']);

        return $chat;
    }
}
