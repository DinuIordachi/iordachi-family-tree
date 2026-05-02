<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class ContactUsSettings extends Settings
{
    /* @var string[] */
    public array $emails = [];
    public ?string $address = null;
    public ?string $phone_1 = null;
    public ?string $phone_2 = null;
    public ?string $responseTime = null;
    public ?string $instagramUsername = null;
    public ?string $tiktokUsername = null;
    public ?string $twitterUsername = null;
    public ?string $facebookUsername = null;
    public ?string $linkedInUsername = null;

    /**
     * Settings group
     *
     * @return string
     *
     * @static
     */
    public static function group(): string
    {
        return 'contactUs';
    }
}
