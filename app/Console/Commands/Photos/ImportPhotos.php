<?php

namespace App\Console\Commands\Photos;

use App\Services\FamilyPhotoArchive;
use Illuminate\Console\Command;

class ImportPhotos extends Command
{
    protected $signature = 'family:import-photos
        {dir=storage/app/family-photos : Folder with the photos, named after each person (or by member id)}
        {--replace : Also replace photos members already have}
        {--dry-run : Only show what would be imported}';

    protected $description = 'Attach photos from a folder to family members, matched by file name (see family:export-photos)';

    public function handle(FamilyPhotoArchive $archive): int
    {
        $dir = $this->argument('dir');
        if (! is_dir($dir)) {
            $this->error("No such folder: {$dir}");

            return self::FAILURE;
        }

        $dry = (bool) $this->option('dry-run');
        $result = $archive->import($dir, (bool) $this->option('replace'), $dry);

        foreach ($result['imported'] as ['file' => $file, 'member' => $m]) {
            $this->line("  <info>✓</info> {$file} → {$m->first_name} {$m->last_name} (#{$m->id})");
        }
        foreach ($result['skipped'] as ['file' => $file, 'member' => $m]) {
            $this->line("  <comment>–</comment> {$file}: {$m->first_name} {$m->last_name} already has a photo (use --replace)");
        }
        foreach ($result['unmatched'] as $file) {
            $this->line("  <error>?</error> {$file}: no member with this name");
        }

        $verb = $dry ? 'Would import' : 'Imported';
        $this->info(sprintf(
            '%s %d, skipped %d, unmatched %d',
            $verb,
            count($result['imported']),
            count($result['skipped']),
            count($result['unmatched']),
        ));

        return self::SUCCESS;
    }
}
