<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceResponse;

/**
 * Force the `data` envelope on every response, even when the resource itself
 * exposes a top-level `data` field (FamilyMemberResource does, because that
 * matches the family-chart library's `Datum.data` contract).
 *
 * Default `ResourceResponse::wrap()` skips wrapping when it sees a `data`
 * key, which leaves single-resource endpoints unwrapped while collections
 * stay wrapped — an inconsistency clients have to special-case.
 */
class AlwaysWrapResourceResponse extends ResourceResponse
{
    protected function haveDefaultWrapperAndDataIsUnwrapped($data): bool
    {
        return $this->wrapper() !== null;
    }
}
