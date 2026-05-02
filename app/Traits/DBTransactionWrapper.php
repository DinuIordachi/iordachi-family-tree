<?php

namespace App\Traits;

use Throwable;
use Illuminate\Support\Facades\DB;

/**
 * Trait DBTransactionWrapper
 *
 * @package App\Traits
 */
trait DBTransactionWrapper
{
    /**
     * Wrap a function in a db transaction
     * in case of error it'll roll back all
     * changes made in the database
     *
     * @param callable $handler
     * @param callable $errorHandler
     *
     * @return mixed
     * @throws \Throwable
     */
    public function wrapInTransaction(callable $handler, callable $errorHandler): mixed
    {
        try {
            DB::beginTransaction();

            $response = call_user_func($handler);

            DB::commit();

            return $response;
        } catch (Throwable $throwable) {
            DB::rollBack();

            return $errorHandler($throwable);
        }
    }
}
