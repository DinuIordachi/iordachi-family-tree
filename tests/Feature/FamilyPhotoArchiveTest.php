<?php

namespace Tests\Feature;

use App\Models\FamilyMember;
use App\Services\FamilyPhotoArchive;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyPhotoArchiveTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->dir = sys_get_temp_dir() . '/family-photos-' . uniqid();
        File::ensureDirectoryExists($this->dir);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);
        parent::tearDown();
    }

    private function member(string $first, string $last, ?string $birthdate = null): FamilyMember
    {
        return FamilyMember::query()->create(['first_name' => $first, 'last_name' => $last, 'birthdate' => $birthdate]);
    }

    private function photo(string $name): void
    {
        // Keep the fake file alive until it is copied (its temp file goes with it).
        $fake = UploadedFile::fake()->image($name, 40, 40);
        File::copy($fake->getPathname(), "{$this->dir}/{$name}");
    }

    public function test_names_are_the_person_with_birth_year_only_for_shared_names(): void
    {
        $liudmila = $this->member('Liudmila', 'Potînga');
        $ion1990 = $this->member('Ion', 'Iordachi', '1990-09-22');
        $ion = $this->member('Ion', 'Iordachi');

        $keys = app(FamilyPhotoArchive::class)->keys();

        $this->assertSame('liudmila-potinga', $keys[$liudmila->id]);
        $this->assertSame('ion-iordachi-1990', $keys[$ion1990->id]);
        $this->assertSame('ion-iordachi', $keys[$ion->id]);
    }

    public function test_import_matches_files_by_name_any_spelling_or_by_id(): void
    {
        $liudmila = $this->member('Liudmila', 'Potînga');
        $ion1990 = $this->member('Ion', 'Iordachi', '1990-09-22');
        $vasile = $this->member('Vasile', 'Iordachi');
        $this->photo('Liudmila Potînga.jpg');
        $this->photo('ion-iordachi-1990.png');
        $this->photo("{$vasile->id}.jpg");
        $this->photo('nobody-here.jpg');
        File::put("{$this->dir}/notes.txt", 'not a photo');

        $result = app(FamilyPhotoArchive::class)->import($this->dir);

        $this->assertEqualsCanonicalizing(
            [$liudmila->id, $ion1990->id, $vasile->id],
            array_map(fn ($r) => $r['member']->id, $result['imported']),
        );
        $this->assertSame(['nobody-here.jpg'], $result['unmatched']);
        foreach ([$liudmila, $ion1990, $vasile] as $m) {
            $this->assertNotNull($m->fresh()->thumbnail_url);
        }
        // The folder is left as it was.
        $this->assertFileExists("{$this->dir}/Liudmila Potînga.jpg");
    }

    public function test_import_keeps_existing_photos_unless_replace_and_dry_run_writes_nothing(): void
    {
        $m = $this->member('Ana', 'Iordachi');
        $this->photo('ana-iordachi.jpg');
        $archive = app(FamilyPhotoArchive::class);

        $dry = $archive->import($this->dir, dryRun: true);
        $this->assertCount(1, $dry['imported']);
        $this->assertFalse($m->fresh()->hasMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION));

        $archive->import($this->dir);
        $first = $m->fresh()->getFirstMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION)->id;

        $again = $archive->import($this->dir);
        $this->assertCount(1, $again['skipped']);
        $this->assertSame($first, $m->fresh()->getFirstMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION)->id);

        $archive->import($this->dir, replace: true);
        $this->assertNotSame($first, $m->fresh()->getFirstMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION)->id);
        $this->assertCount(1, $m->fresh()->getMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION));
    }

    public function test_export_then_import_into_a_fresh_database_restores_every_photo(): void
    {
        $a = $this->member('Dumitru', 'Iordachi', '1985-01-01');
        $b = $this->member('Dumitru', 'Iordachi');
        $this->member('Elena', 'Iordachi'); // no photo
        $a->addMedia(UploadedFile::fake()->image('a.jpg'))->toMediaCollection(FamilyMember::MEDIA_THUMBNAIL_COLLECTION);
        $b->addMedia(UploadedFile::fake()->image('b.png'))->toMediaCollection(FamilyMember::MEDIA_THUMBNAIL_COLLECTION);

        $this->artisan('family:export-photos', ['dir' => $this->dir])->assertSuccessful();
        $this->assertEqualsCanonicalizing(
            ['dumitru-iordachi-1985.jpg', 'dumitru-iordachi.png'],
            array_map(fn ($f) => $f->getFilename(), File::files($this->dir)),
        );

        // Same people, new ids and no media: as on a separately seeded server.
        FamilyMember::query()->forceDelete();
        $a2 = $this->member('Dumitru', 'Iordachi');
        $b2 = $this->member('Dumitru', 'Iordachi', '1985-01-01');

        $this->artisan('family:import-photos', ['dir' => $this->dir])->assertSuccessful();

        $this->assertSame('png', pathinfo($a2->fresh()->getFirstMedia('thumbnail')->file_name, PATHINFO_EXTENSION));
        $this->assertSame('jpg', pathinfo($b2->fresh()->getFirstMedia('thumbnail')->file_name, PATHINFO_EXTENSION));
    }
}
