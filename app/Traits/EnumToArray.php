<?php

namespace App\Traits;

/**
 * Trait EnumToArray
 *
 * @package App\Traits
 */
trait EnumToArray
{
    /**
     * Get all names
     *
     * @return array
     *
     * @static
     */
    public static function names(): array
    {
        return array_column(self::cases(), 'name');
    }

    /**
     * Get all values
     *
     * @return array
     *
     * @static
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get all as array<key, value>
     *
     * @return array
     *
     * @static
     */
    public static function array(): array
    {
        return array_combine(self::names(), self::values());
    }
}
