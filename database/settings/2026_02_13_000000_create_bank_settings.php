<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration {
    public function up(): void
    {
        $this->migrator->add('bank.beneficiaryName', 'Asociația Auditorilor Interni din RM');
        $this->migrator->add('bank.idno', '1011620002776');
        $this->migrator->add('bank.bankName', 'Trezoreria de Stat - Ministerul Finanțelor');
        $this->migrator->add('bank.fiscalCode', '151164');
        $this->migrator->add('bank.account', '2206305503');
        $this->migrator->add('bank.iban', 'MD24TRSD2206305503MD00LT0T');
        $this->migrator->add('bank.membershipFeeAmount', 500);
        $this->migrator->add('bank.currency', 'MDL');
        $this->migrator->add(
            'bank.paymentInstructionsRo',
            'Am înregistrat cererea ta. Te rugăm să efectuezi plata taxei de aderare folosind datele bancare de mai jos.'
        );
    }
};
