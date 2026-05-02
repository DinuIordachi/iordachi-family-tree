<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class BankSettings extends Settings
{
    public ?string $beneficiaryName = null;
    public ?string $idno = null;
    public ?string $bankName = null;
    public ?string $fiscalCode = null;
    public ?string $account = null;
    public ?string $iban = null;
    public ?int $membershipFeeAmount = null;
    public ?string $currency = null;
    public ?string $paymentInstructionsRo = null;

    /**
     * Settings group
     *
     * @return string
     *
     * @static
     */
    public static function group(): string
    {
        return 'bank';
    }
}
