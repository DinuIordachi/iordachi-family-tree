<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class LegalSettings extends Settings
{
    public ?string $privacyPolicy = null;
    public ?string $termAndConditions = null;
    public ?string $regulations = null;
    public ?string $personalDataProcessing = null;

    /**
     * Settings group
     *
     * @return string
     *
     * @static
     */
    public static function group(): string
    {
        return 'legal';
    }
}