<?php

namespace App\Http\Resources\Activity;

use App\Models\User;
use App\Models\Activity;
use Illuminate\Http\Request;
use App\Http\Resources\EmptyJsonResource;

class ActivityResource extends EmptyJsonResource
{
    /**
     * Resource
     *
     * @var \App\Models\Activity
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $causer = $this->resource->causer_type === User::class ? $this->resource->causer : null;

        return [
            'id' => $this->resource->id,
            'logName' => $this->resource->log_name,
            'event' => $this->resource->event,
            'description' => $this->resource->description,
            'causer' => $causer ? [
                'id' => $causer->id,
                'firstName' => $causer->first_name,
                'lastName' => $causer->last_name,
                'email' => $causer->email,
            ] : null,
            'subjectType' => Activity::subjectTypeName($this->resource->subject_type),
            'subjectId' => $this->resource->subject_id,
            'subjectLabel' => $this->subjectLabel(),
            'changes' => $this->changes(),
            'properties' => $this->resource->properties,
            'createdAt' => $this->resource->created_at,
            'updatedAt' => $this->resource->updated_at,
            'can' => [
                'view' => $request->user()->can('view', $this->resource),
                'update' => false,
                'delete' => $request->user()->can('delete', $this->resource),
            ],
        ];
    }

    /**
     * Readable name of the affected entity; "#id (deleted)" when it no longer exists.
     */
    private function subjectLabel(): string
    {
        if ($this->resource->subject_type === null) {
            return '';
        }

        $subject = $this->resource->subject;

        if ($subject === null) {
            return "#{$this->resource->subject_id} (deleted)";
        }

        if (method_exists($subject, 'activityLabel')) {
            return $subject->activityLabel();
        }

        return Activity::subjectTypeName($this->resource->subject_type) . " #{$subject->getKey()}";
    }

    /**
     * Field-by-field changes from properties.old / properties.attributes.
     *
     * @return list<array{field: string, old: mixed, new: mixed}>
     */
    private function changes(): array
    {
        $properties = collect($this->resource->properties);
        $old = (array) $properties->get('old', []);
        $new = (array) $properties->get('attributes', []);

        return collect(array_keys($old + $new))
            ->reject(fn (string $field) => array_key_exists($field, $old)
                && array_key_exists($field, $new)
                && $old[$field] === $new[$field])
            ->map(fn (string $field) => [
                'field' => $field,
                'old' => $this->displayValue($old[$field] ?? null),
                'new' => $this->displayValue($new[$field] ?? null),
            ])
            ->values()
            ->all();
    }

    /**
     * Lists of {id, name} become comma-joined names; other arrays become JSON.
     */
    private function displayValue(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        if (collect($value)->every(fn ($item) => is_array($item) && array_key_exists('name', $item))) {
            return collect($value)->pluck('name')->implode(', ');
        }

        return array_is_list($value) && collect($value)->every(fn ($item) => is_scalar($item))
            ? implode(', ', $value)
            : json_encode($value, JSON_UNESCAPED_UNICODE);
    }
}
