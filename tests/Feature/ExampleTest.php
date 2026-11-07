<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_responds(): void
    {
        $this->get('/api/v1?fresh')->assertOk();
    }
}
