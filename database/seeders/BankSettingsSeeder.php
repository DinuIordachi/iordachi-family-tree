<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\LaravelSettings\SettingsRepositories\SettingsRepository;

class BankSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(SettingsRepository::class)->updatePropertiesPayload('bank', [
            'beneficiaryName' => 'Asociația Auditorilor Interni din RM',
            'idno' => '1011620002776',
            'bankName' => 'Trezoreria de Stat - Ministerul Finanțelor',
            'fiscalCode' => '151164',
            'account' => '2206305503',
            'iban' => 'MD24TRSD2206305503MD00LT0T',
            'membershipFeeAmount' => 500,
            'currency' => 'MDL',
            'paymentInstructionsRo' => 'Am înregistrat cererea ta. Te rugăm să efectuezi plata taxei de aderare folosind datele bancare de mai jos.',
        ]);
    }
}
