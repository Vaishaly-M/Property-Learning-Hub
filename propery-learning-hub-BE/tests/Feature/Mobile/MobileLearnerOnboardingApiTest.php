<?php

namespace Tests\Feature\Mobile;

use App\Models\AcademyPayment;
use App\Models\User;
use App\Services\Payments\StripeAcademyPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class MobileLearnerOnboardingApiTest extends TestCase
{
    use RefreshDatabase;

    private function tinyPngDataUri(): string
    {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
            . str_repeat('A', 80);
    }

    private function signAgreement(array $overrides = []): array
    {
        $payload = array_merge([
            'client_full_name' => 'Jane Doe',
            'client_address' => '1 High Street, London',
            'client_dob' => '1990-05-12',
            'client_email' => 'jane.mobile@example.com',
            'client_phone' => '+447712345678',
            'client_signature_data' => $this->tinyPngDataUri(),
            'accepted_terms' => true,
            'payment_plan' => 'full',
        ], $overrides);

        $response = $this->postJson('/api/mobile/learner/onboarding/sign-agreement', $payload);
        $response->assertCreated()->assertJsonPath('success', true);

        return [
            'token' => $response->json('data.agreement_token'),
            'payload' => $payload,
        ];
    }

    public function test_onboarding_info_returns_agreement_and_payment_config(): void
    {
        $this->getJson('/api/mobile/learner/onboarding/info')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.agreement_type', 'training')
            ->assertJsonStructure([
                'data' => [
                    'document_paragraphs',
                    'fee_amount_pence',
                    'payment' => ['publishable_key', 'amount', 'currency'],
                    'flow' => ['steps'],
                ],
            ]);
    }

    public function test_register_sets_payment_pending_and_me_exposes_flag(): void
    {
        Notification::fake();

        $signed = $this->signAgreement();

        $register = $this->postJson('/api/mobile/learner/onboarding/register', [
            'agreement_token' => $signed['token'],
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => $signed['payload']['client_email'],
            'phone_number' => $signed['payload']['client_phone'],
            'password' => 'SecretPass1!',
            'password_confirmation' => 'SecretPass1!',
        ]);

        $register->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('payment_pending', true)
            ->assertJsonPath('next_step', 'verify_email')
            ->assertJsonPath('user.payment_pending', true)
            ->assertJsonPath('user.email_verified', false);

        $token = $register->json('access_token');
        $this->assertNotEmpty($token);

        $user = User::query()->where('email', $signed['payload']['client_email'])->first();
        $this->assertNotNull($user);
        $this->assertTrue((bool) $user->learnerProfile?->payment_pending);
        $this->assertSame('free', $user->learnerProfile?->subscription_plan);

        $this->withToken($token)
            ->getJson('/api/mobile/learner/me')
            ->assertOk()
            ->assertJsonPath('data.payment_pending', true)
            ->assertJsonPath('data.full_access', false)
            ->assertJsonPath('data.user.payment_pending', true);
    }

    public function test_register_rejects_email_mismatch_and_reused_agreement(): void
    {
        Notification::fake();

        $signed = $this->signAgreement();

        $this->postJson('/api/mobile/learner/onboarding/register', [
            'agreement_token' => $signed['token'],
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'other@example.com',
            'phone_number' => $signed['payload']['client_phone'],
            'password' => 'SecretPass1!',
            'password_confirmation' => 'SecretPass1!',
        ])->assertStatus(422);

        $this->postJson('/api/mobile/learner/onboarding/register', [
            'agreement_token' => $signed['token'],
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => $signed['payload']['client_email'],
            'phone_number' => $signed['payload']['client_phone'],
            'password' => 'SecretPass1!',
            'password_confirmation' => 'SecretPass1!',
        ])->assertCreated();

        $this->postJson('/api/mobile/learner/onboarding/register', [
            'agreement_token' => $signed['token'],
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => $signed['payload']['client_email'],
            'phone_number' => $signed['payload']['client_phone'],
            'password' => 'SecretPass1!',
            'password_confirmation' => 'SecretPass1!',
        ])->assertStatus(422);
    }

    public function test_verify_email_activates_user_and_keeps_payment_pending(): void
    {
        Notification::fake();

        $signed = $this->signAgreement([
            'client_email' => 'verify.mobile@example.com',
            'client_phone' => '+447700900123',
        ]);

        $register = $this->postJson('/api/mobile/learner/onboarding/register', [
            'agreement_token' => $signed['token'],
            'first_name' => 'Verify',
            'last_name' => 'User',
            'email' => $signed['payload']['client_email'],
            'phone_number' => $signed['payload']['client_phone'],
            'password' => 'SecretPass1!',
            'password_confirmation' => 'SecretPass1!',
        ])->assertCreated();

        $userId = (int) $register->json('user.id');
        $user = User::query()->findOrFail($userId);
        $hash = sha1($user->email);

        $verify = $this->postJson('/api/mobile/learner/onboarding/verify-email', [
            'id' => $userId,
            'hash' => $hash,
        ]);

        $verify->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('payment_pending', true)
            ->assertJsonPath('next_step', 'pay')
            ->assertJsonPath('redirect_to', 'dashboard')
            ->assertJsonPath('user.email_verified', true);

        $this->assertSame('active', $user->fresh()->status);
        $this->assertNotNull($user->fresh()->email_verified_at);

        $token = $verify->json('access_token');
        $this->withToken($token)
            ->getJson('/api/mobile/learner/payment/status')
            ->assertOk()
            ->assertJsonPath('data.payment_pending', true)
            ->assertJsonPath('data.full_access', false);
    }

    public function test_login_returns_payment_pending_flag(): void
    {
        $user = User::create([
            'first_name' => 'Paid',
            'last_name' => 'Later',
            'email' => 'login.mobile@example.com',
            'phone_number' => '+447700900999',
            'password' => 'SecretPass1!',
            'role' => 'learner',
            'status' => 'active',
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->learnerProfile()->create([
            'subscription_plan' => 'free',
            'billing_cycle' => 'yearly',
            'payment_pending' => true,
            'profile_completed' => false,
        ]);

        $this->postJson('/api/mobile/learner/auth/login', [
            'email' => 'login.mobile@example.com',
            'password' => 'SecretPass1!',
        ])
            ->assertOk()
            ->assertJsonPath('payment_pending', true)
            ->assertJsonPath('full_access', false)
            ->assertJsonPath('next_step', 'pay');
    }

    public function test_payment_confirm_clears_pending_and_enables_full_access(): void
    {
        $user = User::create([
            'first_name' => 'Pay',
            'last_name' => 'Now',
            'email' => 'pay.mobile@example.com',
            'phone_number' => '+447700900888',
            'password' => 'SecretPass1!',
            'role' => 'learner',
            'status' => 'active',
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->learnerProfile()->create([
            'subscription_plan' => 'free',
            'billing_cycle' => 'yearly',
            'payment_pending' => true,
            'profile_completed' => false,
        ]);

        $payment = AcademyPayment::create([
            'stripe_payment_intent_id' => 'pi_test_mobile_123',
            'amount' => 300000,
            'currency' => 'gbp',
            'status' => 'consumed',
            'customer_email' => $user->email,
            'user_id' => $user->id,
            'paid_at' => now(),
            'metadata' => ['product' => 'academy_enrollment', 'flow' => 'mobile_post_registration'],
        ]);

        $this->mock(StripeAcademyPaymentService::class, function ($mock) use ($payment, $user) {
            $mock->shouldReceive('confirmPostRegistrationPayment')
                ->once()
                ->with(Mockery::on(fn ($u) => (int) $u->id === (int) $user->id), 'pi_test_mobile_123')
                ->andReturnUsing(function () use ($payment, $user) {
                    $user->learnerProfile->forceFill([
                        'payment_pending' => false,
                        'subscription_plan' => 'pro',
                        'billing_cycle' => 'yearly',
                    ])->save();

                    return $payment->fresh();
                });

            $mock->shouldReceive('sendEnrollmentConfirmationEmail')->once();
            $mock->shouldReceive('getPublicConfig')->andReturn([
                'publishable_key' => 'pk_test',
                'product_name' => 'Academy',
                'amount' => 300000,
                'currency' => 'gbp',
                'formatted_amount' => '£3000.00',
            ]);
        });

        Sanctum::actingAs($user->fresh());

        $this->postJson('/api/mobile/learner/payment/confirm', [
            'payment_intent_id' => 'pi_test_mobile_123',
        ])
            ->assertOk()
            ->assertJsonPath('payment_pending', false)
            ->assertJsonPath('full_access', true)
            ->assertJsonPath('data.user.subscription_plan', 'pro');

        $this->getJson('/api/mobile/learner/me')
            ->assertOk()
            ->assertJsonPath('data.payment_pending', false)
            ->assertJsonPath('data.full_access', true);
    }

    public function test_payment_intent_requires_verified_email_and_pending_flag(): void
    {
        $user = User::create([
            'first_name' => 'No',
            'last_name' => 'Pay',
            'email' => 'nopay.mobile@example.com',
            'phone_number' => '+447700900777',
            'password' => 'SecretPass1!',
            'role' => 'learner',
            'status' => 'active',
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->learnerProfile()->create([
            'subscription_plan' => 'pro',
            'billing_cycle' => 'yearly',
            'payment_pending' => false,
            'profile_completed' => false,
        ]);

        Sanctum::actingAs($user->fresh());

        $this->postJson('/api/mobile/learner/payment/intent')
            ->assertOk()
            ->assertJsonPath('payment_pending', false)
            ->assertJsonPath('full_access', true);
    }
}
