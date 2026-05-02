<?php

use Illuminate\Support\Facades\Route;

Route::get('up', \Spatie\Health\Http\Controllers\HealthCheckResultsController::class);
