<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();

            // User Ip, Location details
            $table->string('issued_ip', 45)->nullable();
            $table->string('issued_country_code', 2)->nullable();
            $table->string('issued_country', 100)->nullable();
            $table->string('user_agent', 255)->nullable();

            $table->string('last_ip', 45)->nullable();
            $table->string('last_country_code', 2)->nullable();
            $table->string('last_country', 100)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
