<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration {
    public function up(): void
    {
        $this->migrator->add('contactUs.emails', ['office@aai.md']);
        $this->migrator->add(
            'contactUs.address',
            'mun. Chișinău, bd. Ștefan cel Mare și Sfânt 200, Anexa A, oficiu 4'
        );
        $this->migrator->add('contactUs.responseTime', '24–48 hours (Monday – Friday)');
        $this->migrator->add('contactUs.phone_1', '(+373) 691 85 680');
        $this->migrator->add('contactUs.phone_2', '(+373) 681 34 149');
        $this->migrator->add('contactUs.instagramUsername', 'aaimd');
        $this->migrator->add('contactUs.tiktokUsername', 'aaimd');
        $this->migrator->add('contactUs.twitterUsername', null);
        $this->migrator->add('contactUs.facebookUsername', null);
        $this->migrator->add('contactUs.linkedInUsername', null);
    }
};
