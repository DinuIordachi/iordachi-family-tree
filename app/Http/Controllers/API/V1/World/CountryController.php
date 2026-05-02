<?php

namespace App\Http\Controllers\API\V1\World;

use Illuminate\Http\Response;
use App\Services\CountryService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Traits\DBTransactionWrapper;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Resources\World\CountryResource;
use App\Http\Requests\World\ListCountryRequest;

#[Group('World')]
class CountryController extends Controller
{
    use DBTransactionWrapper;

    public function __construct(protected readonly CountryService $countryService)
    {

    }

    /**
     * List countries
     *
     * @unauthenticated
     *
     * @param ListCountryRequest $request
     *
     * @return JsonResponse
     */
    public function __invoke(ListCountryRequest $request): JsonResponse
    {
        $data = $request->collect();
        $records = $this->countryService->searchAuthorized(
            $data->get('term', ''),
            $data->get('order_by', 'name'),
            $data->get('order_direction', 'asc'),
            $data->only([
                'iso2', 'iso3', 'name',
                'phone_code', 'region', 'subregion',
            ])->toArray(),
        )->all();

        return CountryResource::collection($records)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
