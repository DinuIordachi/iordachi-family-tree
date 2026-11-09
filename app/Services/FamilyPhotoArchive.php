<?php

namespace App\Services;

use App\Models\FamilyMember;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Moves member photos between servers as a plain folder of files.
 *
 * Files are named after the person, not after database ids, so a folder
 * exported from one database can be imported into another (for example a
 * server seeded separately): `liudmila-potinga.jpg`. When several members
 * share a name, their birth year tells them apart (`ion-iordachi-1990.jpg`,
 * plain `ion-iordachi.jpg` for the one without a known birth year); a number
 * is the last resort. A file may also be named by member id (`15.jpg`), and
 * "name-birthyear" always finds its person, shared name or not.
 */
class FamilyPhotoArchive
{
    public const EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    /**
     * A stable file name (without extension) for every member, by member id.
     *
     * @return array<int, string>
     */
    public function keys(): array
    {
        $members = FamilyMember::query()->orderBy('id')->get(['id', 'first_name', 'last_name', 'birthdate']);
        $keys = [];

        foreach ($members->groupBy(fn (FamilyMember $m) => $this->nameSlug($m)) as $slug => $group) {
            if ($group->count() === 1) {
                $keys[$group->first()->id] = $slug;
                continue;
            }

            $taken = [];
            foreach ($group as $member) {
                $key = $member->birthdate ? "{$slug}-{$member->birthdate->year}" : $slug;
                $n = 2;
                $base = $key;
                while (in_array($key, $taken, true)) {
                    $key = "{$base}-" . $n++;
                }
                $taken[] = $key;
                $keys[$member->id] = $key;
            }
        }

        return $keys;
    }

    /**
     * Copy every member's photo into $dir, named by keys().
     *
     * @return Collection<int, array{member: FamilyMember, file: string}>
     */
    public function export(string $dir): Collection
    {
        File::ensureDirectoryExists($dir);
        $keys = $this->keys();

        return FamilyMember::query()
            ->with('media')
            ->orderBy('id')
            ->get()
            ->map(function (FamilyMember $member) use ($dir, $keys) {
                $media = $member->getFirstMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION);
                if (! $media || ! is_file($media->getPath())) {
                    return null;
                }
                $ext = strtolower(pathinfo($media->file_name, PATHINFO_EXTENSION)) ?: 'jpg';
                $file = $keys[$member->id] . '.' . $ext;
                File::copy($media->getPath(), rtrim($dir, '/') . '/' . $file);

                return ['member' => $member, 'file' => $file];
            })
            ->filter()
            ->values();
    }

    /**
     * Attach each photo in $dir to the member it names.
     *
     * Members who already have a photo are left alone unless $replace.
     * Nothing is written when $dryRun. The source files are kept.
     *
     * @return array{
     *     imported: list<array{file: string, member: FamilyMember}>,
     *     skipped: list<array{file: string, member: FamilyMember}>,
     *     unmatched: list<string>,
     * }
     */
    public function import(string $dir, bool $replace = false, bool $dryRun = false): array
    {
        $byKey = $this->lookup();
        $result = ['imported' => [], 'skipped' => [], 'unmatched' => []];

        $files = collect(File::files($dir))
            ->filter(fn ($f) => in_array(strtolower($f->getExtension()), self::EXTENSIONS, true))
            ->sortBy(fn ($f) => $f->getFilename());

        foreach ($files as $file) {
            $name = $file->getFilename();
            $member = $this->match(pathinfo($name, PATHINFO_FILENAME), $byKey);

            if (! $member) {
                $result['unmatched'][] = $name;
                continue;
            }

            if (! $replace && $member->hasMedia(FamilyMember::MEDIA_THUMBNAIL_COLLECTION)) {
                $result['skipped'][] = ['file' => $name, 'member' => $member];
                continue;
            }

            if (! $dryRun) {
                // The thumbnail collection holds a single file: adding replaces the old one.
                $member->addMedia($file->getPathname())
                    ->preservingOriginal()
                    ->toMediaCollection(FamilyMember::MEDIA_THUMBNAIL_COLLECTION);
            }
            $result['imported'][] = ['file' => $name, 'member' => $member];
        }

        return $result;
    }

    /**
     * File name → member id: every member's key, plus "name-birthyear" for
     * anyone whose birth year is known, so a file exported where the name was
     * shared still finds its person where it is not (and the other way round).
     *
     * @return array<string, int>
     */
    private function lookup(): array
    {
        $byKey = array_flip($this->keys());
        $aliases = [];
        foreach (FamilyMember::query()->whereNotNull('birthdate')->get() as $member) {
            $aliases["{$this->nameSlug($member)}-{$member->birthdate->year}"][] = $member->id;
        }
        foreach ($aliases as $alias => $ids) {
            if (count($ids) === 1 && ! isset($byKey[$alias])) {
                $byKey[$alias] = $ids[0];
            }
        }

        return $byKey;
    }

    /**
     * @param array<string, int> $byKey
     */
    private function match(string $base, array $byKey): ?FamilyMember
    {
        if (ctype_digit($base)) {
            return FamilyMember::query()->find((int) $base);
        }

        // Accept any spelling that slugs the same: "Liudmila Potînga" = "liudmila-potinga".
        $id = $byKey[Str::slug($base)] ?? null;

        return $id ? FamilyMember::query()->find($id) : null;
    }

    private function nameSlug(FamilyMember $member): string
    {
        return Str::slug(trim("{$member->first_name} {$member->last_name}")) ?: "member-{$member->id}";
    }
}
