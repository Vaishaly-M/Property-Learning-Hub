<?php

namespace Tests\Unit\Support;

use App\Support\PhoneNumber;
use PHPUnit\Framework\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_uk_local_and_international_are_equivalent(): void
    {
        $this->assertTrue(PhoneNumber::areEquivalent('07123456789', '+447123456789'));
        $this->assertTrue(PhoneNumber::areEquivalent('7123456789', '07123456789'));
        $this->assertTrue(PhoneNumber::areEquivalent('7123456789', '+447123456789'));
    }

    public function test_agreement_phone_without_country_code_matches_signup_with_prefix(): void
    {
        // Agreement form stores national digits; signup prepends +44
        $this->assertTrue(PhoneNumber::areEquivalent('32534565645', '+4432534565645'));
        $this->assertTrue(PhoneNumber::areEquivalent('32534565645', '4432534565645'));
        $this->assertTrue(PhoneNumber::areEquivalent('+4432534565645', '32534565645'));
    }

    public function test_different_numbers_are_not_equivalent(): void
    {
        $this->assertFalse(PhoneNumber::areEquivalent('07123456789', '07987654321'));
        $this->assertFalse(PhoneNumber::areEquivalent('32534565645', '+449876543210'));
    }

    public function test_sri_lanka_and_bare_national_are_equivalent(): void
    {
        $this->assertTrue(PhoneNumber::areEquivalent('+94769178622', '769178622'));
        $this->assertTrue(PhoneNumber::areEquivalent('+94769178622', '94769178622'));
    }

    public function test_normalize_for_storage_uses_e164_uk_format(): void
    {
        $this->assertSame('+447123456789', PhoneNumber::normalizeForStorage('07123456789'));
        $this->assertSame('+447123456789', PhoneNumber::normalizeForStorage('7123456789'));
        $this->assertSame('+447123456789', PhoneNumber::normalizeForStorage('+44 7123 456789'));
        $this->assertSame('+94769178622', PhoneNumber::normalizeForStorage('+94 769 178 622'));
    }
}
