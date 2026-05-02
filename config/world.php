<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Embed country flag images over CDN (HTTP API)
    | Country flag images for embedding on your website or for programmatically
    | download to keep flags in your projects up-to-date.
    | Image Sizes: 16x12, 20x15, 24x18, 28x21, 32x24, 36x27, 40x30, 48x36,
    |              56x42, 60x45, 64x48, 72x54, 80x60, 84x63, 96x72, 108x81,
    |              112x84, 120x90, 128x96, 144x108, 160x120, 192x144, 224x168,
    |              256x192
    | Ex: https://flagcdn.com/[IMAGE SIZE]/[ISO2].png
    |--------------------------------------------------------------------------
    */

    'flag_url' => env('WORLD_FLAG_URL', 'https://flagcdn.com'),

    /*
    |--------------------------------------------------------------------------
    | Allowed countries to be loaded.
    | Leave it empty to load all countries else include the country iso2
    | value in the allowed_countries array.
    |--------------------------------------------------------------------------
    */

    'allowed_countries' => [],

    /*
    |--------------------------------------------------------------------------
    | Disallowed countries to not be loaded.
    | Leave it empty to allow all countries to be loaded else include the
    | country iso2 value in the disallowed_countries array.
    |--------------------------------------------------------------------------
    */

    'disallowed_countries' => [],

    /*
    |--------------------------------------------------------------------------
    | Supported locales.
    |--------------------------------------------------------------------------
    */

    'accepted_locales' => [
        'ar',
        'az',
        'bn',
        'br',
        'de',
        'en',
        'es',
        'fa',
        'fr',
        'hr',
        'it',
        'ja',
        'kr',
        'nl',
        'pl',
        'pt',
        'ro',
        'ru',
        'tr',
        'zh',
    ],

    /*
    |--------------------------------------------------------------------------
    | Enabled modules.
    | The cities module depends on the states module.
    |--------------------------------------------------------------------------
    */

    'modules' => [
        'states' => true,
        'cities' => true,
        'timezones' => false,
        'currencies' => false,
        'languages' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Routes.
    |--------------------------------------------------------------------------
    */

    'routes' => false,

    /*
    |--------------------------------------------------------------------------
    | Connection.
    |--------------------------------------------------------------------------
    */

    'connection' => env('WORLD_DB_CONNECTION', env('DB_CONNECTION')),

    /*
    |--------------------------------------------------------------------------
    | Migrations.
    |--------------------------------------------------------------------------
    */

    'migrations' => [
        'countries' => [
            'table_name' => 'countries',
            'optional_fields' => [
                'phone_code' => [
                    'required' => true,
                    'type' => 'string',
                    'length' => 5,
                ],
                'iso3' => [
                    'required' => true,
                    'type' => 'string',
                    'length' => 3,
                ],
                'native' => [
                    'required' => false,
                    'type' => 'string',
                ],
                'region' => [
                    'required' => true,
                    'type' => 'string',
                ],
                'subregion' => [
                    'required' => true,
                    'type' => 'string',
                ],
                'latitude' => [
                    'required' => false,
                    'type' => 'string',
                ],
                'longitude' => [
                    'required' => false,
                    'type' => 'string',
                ],
                'emoji' => [
                    'required' => true,
                    'type' => 'string',
                ],
                'emojiU' => [
                    'required' => true,
                    'type' => 'string',
                ],
            ],
        ],
        'states' => [
            'table_name' => 'states',
            'optional_fields' => [
                'country_code' => [
                    'required' => true,
                    'type' => 'string',
                    'length' => 3,
                ],
                'state_code' => [
                    'required' => false,
                    'type' => 'string',
                    'length' => 5,
                ],
                'type' => [
                    'required' => false,
                    'type' => 'string',
                ],
                'latitude' => [
                    'required' => false,
                    'type' => 'string',
                ],
                'longitude' => [
                    'required' => false,
                    'type' => 'string',
                ],
            ],
        ],
        'cities' => [
            'table_name' => 'cities',
            'optional_fields' => [
                'country_code' => [
                    'required' => true,
                    'type' => 'string',
                    'length' => 3,
                ],
                'state_code' => [
                    'required' => false,
                    'type' => 'string',
                    'length' => 5,
                ],
                'latitude' => [
                    'required' => false,
                    'type' => 'string',
                ],
                'longitude' => [
                    'required' => false,
                    'type' => 'string',
                ],
            ],
        ],
        'timezones' => [
            'table_name' => 'timezones',
        ],
        'currencies' => [
            'table_name' => 'currencies',
        ],
        'languages' => [
            'table_name' => 'languages',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Fully qualified class names for package models.
    | You can extend package models with your custom ones.
    |--------------------------------------------------------------------------
    */

    'models' => [
        'cities' => \Nnjeim\World\Models\City::class,
        'countries' => \App\Models\Country::class,
        'currencies' => \Nnjeim\World\Models\Currency::class,
        'languages' => \Nnjeim\World\Models\Language::class,
        'states' => \Nnjeim\World\Models\State::class,
        'timezones' => \Nnjeim\World\Models\Timezone::class,
    ],

];
