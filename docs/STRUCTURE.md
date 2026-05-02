# Domain Structure

## Entities

### Garage

Each garage has the following properties:

| Field             | Type           | Description                                               |
|-------------------|----------------|-----------------------------------------------------------|
| id                | string         | Unique identifier                                         |
| association_id    | foreign_key    | The association on whose territory the garage is located  |
| name              | string         | Garage name                                               |
| status            | GarageStatuses | Current status of the garage                              |
| city              | string         | City where the garage is located                          |
| street            | string         | Street name                                               |
| internal_address  | string         | Address within the association territory                  |
| address_number    | string         | Garage number (e.g. "22/12a")                             |
| cadastral_number  | string         | Cadastral number                                          |
| area              | number         | Area in square meters                                     |

**Garage Statuses (enum):** `normal`, `seized_by_state`, `under_state_investigation`

#### Business Rules

- Every garage **must** belong to exactly one association (the one on whose territory it is physically located).
- A garage **may or may not** be a member of that association. A garage can be a member of only one association (which must be the one it physically belongs to).
- A garage can have **one or multiple owners**. If there are multiple owners, each must have an **ownership percentage** specified.
- There must be a specific field indicating whether ownership is single or shared.
- A garage **may or may not** have a tenant. There must be a clear indicator of whether the garage is rented out.
- A garage **may or may not** have a responsible person (someone who is neither an owner nor a tenant).

---

### Association

| Field             | Type       | Description                              |
|-------------------|------------|------------------------------------------|
| id                | string     | Unique identifier                        |
| name              | string     | Association name                         |
| address           | string     | Association address                      |
| phone             | string     | Phone number                             |
| cadastral_numbers | string[]   | Cadastral numbers of managed territories |

#### Relationships

- An association has **many garages** (1..n) on its territory.

---

### Person

Each person has the following properties:

| Field      | Type   | Description                                                                                           |
|------------|--------|-------------------------------------------------------------------------------------------------------|
| id         | string | Unique identifier                                                                                     |
| first_name | string | First name                                                                                            |
| last_name  | string | Last name                                                                                             |
| patronimic | string | Patronymic (middle name)                                                                              |
| name_id    | string | Generated as `last_name-first_name-patronimic`. A sequential suffix `-N` is added if duplicates exist |

#### Person Roles

A person can hold multiple roles in relation to multiple garages and/or multiple associations.

A person can be related to a garage **without** being related to any association.

---

### Garage Person Role (pivot)

Links a person to a garage with a specific role.

| Field      | Type   | Description          |
|------------|--------|----------------------|
| id         | string | Unique identifier    |
| garage_id  | string | Reference to garage  |
| role_id    | string | Reference to role    |
| person_id  | string | Reference to person  |

**Cardinalities:**
- Garage to GaragePersonRole: **1..n** (a garage must have at least one role assignment)
- Person to GaragePersonRole: **0..n** (a person may have zero or many garage roles)
- Role to GaragePersonRole: **0..n**

---

### Association Person Role (pivot)

Links a person to an association with a specific role.

| Field           | Type   | Description              |
|-----------------|--------|--------------------------|
| id              | string | Unique identifier        |
| association_id  | string | Reference to association |
| role_id         | string | Reference to role        |
| person_id       | string | Reference to person      |

Each role assignment must have:
- **start date** (date of association with this role)
- **end date** (date of leaving this role, nullable)
- **is_active** flag (whether the role is currently active)

**Cardinalities:**
- Association to AssociationPersonRole: **1..n**
- Person to AssociationPersonRole: **0..n**
- Role to AssociationPersonRole: **0..n**

---

### Role

| Field | Type       | Description                                                   |
|-------|------------|---------------------------------------------------------------|
| id    | string     | Unique identifier                                             |
| name  | RoleNames  | The role name                                                 |
| scope | RoleScopes | Whether this role applies to a garage or an association       |

**RoleNames (enum):**
- `owner` - Garage owner
- `tenant` - Garage tenant
- `member` - Association member
- `leader` - Association leader
- `director` - Association director

**RoleScopes (enum):** `garage`, `association`

**Additional association-specific roles** (from domain requirements):
- president
- advisor (consilier)
- enthusiast
- accountant (contabil)
- auditor (cenzor)
- audit committee president
- secretary
- meeting secretary

---

### Contact

| Field     | Type         | Description                                         |
|-----------|--------------|-----------------------------------------------------|
| id        | string       | Unique identifier                                   |
| person_id | string       | Reference to the person this contact belongs to     |
| type      | ContactTypes | Type of contact                                     |
| value     | string       | The contact value (email address, phone number)     |
| favorite  | boolean      | Whether this is the preferred contact method        |
| whatsapp  | boolean      | Available on WhatsApp                               |
| viber     | boolean      | Available on Viber                                  |
| telegram  | boolean      | Available on Telegram                               |
| calls     | boolean      | Available for phone calls                           |
| sms       | boolean      | Available for SMS                                   |

**ContactTypes (enum):** `email`, `phone`

**Cardinality:** Person to Contact: **1..n** (a person has one or more contacts)

---

## Relationships Summary

```
Association  1 -------- n  Garage
Association  1 -------- n  AssociationPersonRole  n -------- 0..n  Person
                                                  n -------- 0..n  Role (scope: association)

Garage       1 -------- n  GaragePersonRole       n -------- 0..n  Person
                                                   n -------- 0..n  Role (scope: garage)

Person       1 -------- n  Contact
```

---

## System Roles & Permissions

_(To be defined)_

---

## UI Requirements

- **Garages table** with a detail view for each garage.
- **Persons table** with a detail view showing all related information (garages, associations, roles, contacts).
- Each person should have a **list of traits/characteristics** rated on a scale from **1 to 10** in relation to an association (e.g. trustworthiness, seriousness).
