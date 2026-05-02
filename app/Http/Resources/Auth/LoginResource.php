<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use Laravel\Sanctum\NewAccessToken;
use App\Http\Resources\EmptyJsonResource;

class LoginResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var NewAccessToken
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'Bearer',
            'accessToken' => $this->resource->plainTextToken,
            'expiresIn' => $this->resource->accessToken->expires_at->unix(),
        ];
    }
}
