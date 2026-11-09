<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets a member be recorded as deceased when the date of death is unknown.
 * A recorded `died_at` still implies deceased on its own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            $table->boolean('is_deceased')->default(false)->after('died_at');
        });
    }

    public function down(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            $table->dropColumn('is_deceased');
        });
    }
};
