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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->constrained('persons')->cascadeOnDelete();
            $table->string('type');
            $table->string('value');
            $table->boolean('favorite')->default(false);
            $table->boolean('whatsapp')->default(false);
            $table->boolean('viber')->default(false);
            $table->boolean('telegram')->default(false);
            $table->boolean('calls')->default(false);
            $table->boolean('sms')->default(false);
            $table->timestamps();

            $table->index('person_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
