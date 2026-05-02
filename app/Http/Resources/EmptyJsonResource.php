<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Class EmptyJsonResource
 *
 * @package App\Http\Resources
 */
class EmptyJsonResource extends JsonResource
{
    /**
     * Create a new resource instance.
     *
     * @param mixed $resource
     */
    public function __construct($resource = null)
    {
        $resource = $resource ?? collect();
        parent::__construct($resource);
    }

    /**
     * Static: Add a message in additional data
     *
     * @param string $message
     *
     * @return $this
     *
     * @static
     */
    public static function withMessage(string $message): self
    {
        return (new static())->message($message);
    }

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

    /**
     * Static: Add a message in additional data and return a JSON response
     *
     * @param string       $message
     * @param int          $status
     * @param Request|null $request
     *
     * @return JsonResponse
     *
     * @static
     */
    public static function messageResponse(
        string $message,
        int $status = Response::HTTP_OK,
        Request $request = null
    ): JsonResponse {
        return (new static())->toMessageResponse($message, $status, $request);
    }

    /**
     * Add a message in additional data and return a JSON response
     *
     * @param string       $message
     * @param int          $status
     * @param Request|null $request
     *
     * @return JsonResponse
     */
    public function toMessageResponse(
        string $message,
        int $status = Response::HTTP_OK,
        Request $request = null
    ): JsonResponse {
        $this->additional['message'] = $message;

        return $this->response($request)->setStatusCode($status);
    }

    public function toResponse($request): JsonResponse
    {
        return parent::toResponse($request)
            ->setEncodingOptions(JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
