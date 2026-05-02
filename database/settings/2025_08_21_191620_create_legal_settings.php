<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration {
    public function up(): void
    {
        $this->migrator->add('legal.privacyPolicy', '');
        $this->migrator->add('legal.termAndConditions', '');
        $this->migrator->add('legal.regulations', '');
        $this->migrator->add('legal.personalDataProcessing', '');
    }
};
