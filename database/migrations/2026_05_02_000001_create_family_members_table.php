<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->date('birthdate')->nullable();
            $table->dateTime('died_at')->nullable();
            $table->enum('gender', ['M', 'F'])->nullable();
            $table->text('biography')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('family_member_relations', function (Blueprint $table) {
            $table->foreignId('parent_id')->constrained('family_members')->cascadeOnDelete();
            $table->foreignId('child_id')->constrained('family_members')->cascadeOnDelete();
            $table->primary(['parent_id', 'child_id']);
            $table->index('child_id');
        });

        Schema::create('family_member_spouses', function (Blueprint $table) {
            $table->foreignId('member_id')->constrained('family_members')->cascadeOnDelete();
            $table->foreignId('spouse_id')->constrained('family_members')->cascadeOnDelete();
            $table->primary(['member_id', 'spouse_id']);
            $table->index('spouse_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_member_spouses');
        Schema::dropIfExists('family_member_relations');
        Schema::dropIfExists('family_members');
    }
};
