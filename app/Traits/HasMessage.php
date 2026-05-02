<?php

namespace App\Traits;

/**
 * Trait HasMessage
 *
 * @package App\Traits
 */
trait HasMessage
{
    /**
     * Add a message in additional data
     *
     * @param string $message
     *
     * @return $this
     */
    public function message(string $message): self
    {
        $this->additional['message'] = $message;

        return $this;
    }
}
