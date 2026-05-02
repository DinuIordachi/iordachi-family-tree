<?php

namespace App\Services;

class PhoneService extends BaseService
{
    /**
     * Identify phone country iso2 code
     *
     * @param string|null $phoneNumber
     *
     * @return string|null
     */
    public function identifyCountry(?string $phoneNumber): ?string
    {
        if ($phoneNumber) {
            $phone = phone($phoneNumber);

            if (! $phone->isValid()) {
                return $phone->getCountry();
            }
        }

        return null;
    }

    /**
     * Format phone international
     *
     * @param string|null $phoneNumber
     * @param string|null $countryCode
     *
     * @return string|null
     */
    public function formatInternational(?string $phoneNumber, ?string $countryCode = null): ?string
    {
        if ($phoneNumber) {
            $phone = phone($phoneNumber, $countryCode);

            if ($phone->isValid()) {
                return $phone->formatInternational();
            }
        }

        return null;
    }
}