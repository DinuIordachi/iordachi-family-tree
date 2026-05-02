<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\ContactTypeEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class Contact
 *
 * @property int             $id
 * @property int             $person_id
 * @property ContactTypeEnum $type
 * @property string          $value
 * @property bool            $favorite
 * @property bool            $whatsapp
 * @property bool            $viber
 * @property bool            $telegram
 * @property bool            $calls
 * @property bool            $sms
 * @property Carbon          $created_at
 * @property Carbon          $updated_at
 *
 * @property Person          $person
 *
 * @package App\Models
 */
class Contact extends Model
{
    protected $table = 'contacts';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'person_id',
        'type',
        'value',
        'favorite',
        'whatsapp',
        'viber',
        'telegram',
        'calls',
        'sms',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var list<string>
     */
    protected $casts = [
        'type' => ContactTypeEnum::class,
        'favorite' => 'boolean',
        'whatsapp' => 'boolean',
        'viber' => 'boolean',
        'telegram' => 'boolean',
        'calls' => 'boolean',
        'sms' => 'boolean',
    ];

    /**
     * =================================
     * RELATIONSHIPS
     * =================================
     */

    /**
     * Relationship:
     * Person
     *
     * @return BelongsTo
     */
    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}
