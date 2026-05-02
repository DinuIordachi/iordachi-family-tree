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
        Schema::table('garages', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
            $table->dropColumn('address');
        });

        Schema::table('garages', function (Blueprint $table) {
            $table->foreignId('association_id')->after('id')->constrained('associations')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('status')->default('normal')->after('name');
            $table->string('city')->after('status');
            $table->string('street')->after('city');
            $table->string('internal_address')->nullable()->after('street');
            $table->string('address_number')->nullable()->after('internal_address');
            $table->renameColumn('area_square_meters', 'area');

            $table->index('association_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('garages', function (Blueprint $table) {
            $table->renameColumn('area', 'area_square_meters');
            $table->dropIndex(['status']);
            $table->dropIndex(['association_id']);
            $table->dropColumn(['address_number', 'internal_address', 'street', 'city', 'status']);
            $table->dropForeign(['association_id']);
            $table->dropColumn('association_id');
        });

        Schema::table('garages', function (Blueprint $table) {
            $table->string('address')->after('name');
            $table->foreignId('user_id')->after('id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
        });
    }
};
