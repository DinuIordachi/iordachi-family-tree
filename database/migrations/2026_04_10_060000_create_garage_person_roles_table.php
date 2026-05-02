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
        Schema::create('garage_person_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('garage_id')->constrained('garages')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('domain_roles')->restrictOnDelete();
            $table->foreignId('person_id')->constrained('persons')->cascadeOnDelete();
            $table->decimal('ownership_percentage', 5, 2)->nullable();
            $table->timestamps();

            $table->unique(['garage_id', 'role_id', 'person_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('garage_person_roles');
    }
};
