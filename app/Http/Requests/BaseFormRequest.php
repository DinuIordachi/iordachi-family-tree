<?php

namespace App\Http\Requests;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Foundation\Http\FormRequest;

abstract class BaseFormRequest extends FormRequest
{
    protected bool $parseToSnakeCase = true;
    protected array $parseToSnakeCaseIgnoreFields = [];
    protected array $orderByColumns = [];
//    protected array $fieldColumns = [];

    /**
     * Order By columns
     *
     * @return string[]
     */
    public function getOrderByColumns(): array
    {
        return $this->orderByColumns;
    }

//    /**
//     * Field columns
//     *
//     * @return string[]
//     */
//    public function getFieldColumns(): array
//    {
//        return $this->fieldColumns;
//    }

    /**
     * Passed validation
     * Convert all keys to snake case
     *
     * @return void
     */
    protected function passedValidation(): void
    {
        $this->updateOrderByInput();
//        $this->updateFieldsInput();

        if ($this->parseToSnakeCase) {
            $flat = Arr::dot($this->all());
            $rebuilt = [];

            foreach ($flat as $key => $value) {
                $parts = explode('.', $key);
                if (in_array($parts[0], $this->parseToSnakeCaseIgnoreFields)) {
                    Arr::set($rebuilt, implode('.', $parts), $value);
                    continue;
                }
                $parts = array_map(fn ($p) => is_numeric($p) ? $p : Str::snake($p), $parts);
                Arr::set($rebuilt, implode('.', $parts), $value);
            }

            $this->replace($rebuilt);
        }
    }

    private function updateOrderByInput(): void
    {
        $orderByColumns = $this->getOrderByColumns();

        if (! $this->has('orderBy') || empty($orderByColumns)) {
            return;
        }

        if (! array_key_exists($this->get('orderBy'), $orderByColumns)) {
            return;
        }

        $this->merge([
            'orderBy' => $orderByColumns[$this->get('orderBy')],
        ]);
    }

//    private function updateFieldsInput(): void
//    {
//        $fieldColumns = $this->getFieldColumns();
//
//        if (! $this->has('fields') || empty($fieldColumns)) {
//            return;
//        }
//
//        if (! array_key_exists($this->get('fields'), $fieldColumns)) {
//            return;
//        }
//
//        $this->merge([
//            'fields' => $fieldColumns[$this->get('fields')],
//        ]);
//    }

    /**
     * Convert to snakeCase
     *
     * @param mixed $data
     *
     * @return mixed
     */
    private function snakeKeys(mixed $data): mixed
    {
        if (! is_array($data)) {
            return $data;
        }

        $out = [];
        foreach ($data as $key => $value) {
            $newKey = is_string($key) ? Str::snake($key) : $key;
            $out[$newKey] = $this->snakeKeys($value); // recurse
        }

        return $out;
    }
}
