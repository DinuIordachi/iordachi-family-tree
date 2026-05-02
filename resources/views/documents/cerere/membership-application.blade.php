<!doctype html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>Cerere de aderare</title>
</head>
<body>
<h1>Cerere de aderare</h1>

<div class="muted">
    Data generării: {{ $generated_at?->format('d.m.Y H:i') }}
</div>

<div class="section">
    Subsemnatul(a), <span class="label">{{ trim($first_name . ' ' . $last_name) }}</span>,
    născut(ă) la data de <span class="label">{{ $birthdate }}</span>,
    cu funcția <span class="label">{{ $work_position }}</span>
    în cadrul <span class="label">{{ $work_organization }}</span>,
    solicit aderarea ca membru al Asociației Auditorilor Interni din Republica Moldova.
</div>

<div class="section">
    <span class="label">Email:</span> {{ $email }}<br>
    <span class="label">Telefon:</span> {{ $phone }}<br>
    <span class="label">Data solicitată pentru activare:</span> {{ $active_at }}
</div>

<div class="section">
    Declar că datele furnizate în această cerere sunt corecte și complete.
</div>

<div class="signature">
    <div class="label">Semnătură:</div>
    <img src="{{ $signature_data_uri }}" alt="Semnătură">
</div>

<div class="footer-note">
    Acest document este generat automat pe baza datelor furnizate la înregistrare.
</div>
</body>
</html>
