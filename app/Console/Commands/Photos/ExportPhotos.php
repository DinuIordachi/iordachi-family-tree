<?php

namespace App\Console\Commands\Photos;

use App\Services\FamilyPhotoArchive;
use Illuminate\Console\Command;

class ExportPhotos extends Command
{
    protected $signature = 'family:export-photos
        {dir=storage/app/family-photos : Folder to write the photos into}';

    protected $description = 'Copy every family member\'s photo into a folder, named after the person (for family:import-photos)';

    public function handle(FamilyPhotoArchive $archive): int
    {
        $dir = $this->argument('dir');
        $exported = $archive->export($dir);

        foreach ($exported as ['member' => $member, 'file' => $file]) {
            $this->line("  {$file}  ← {$member->first_name} {$member->last_name} (#{$member->id})");
        }
        $this->info("Exported {$exported->count()} photos to {$dir}");

        return self::SUCCESS;
    }
}
