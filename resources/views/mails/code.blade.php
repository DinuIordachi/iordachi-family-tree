<x-mail::message>
# Hello, {{ "$notifiable->first_name $notifiable->last_name" }}!

Please find below your verification code:
<x-mail::panel>
<h1 style="text-align: center; font-size: 36px; margin: 0;">{{ $notifiable->email_code }}</h1>
</x-mail::panel>

**Note: This code will expire in {{ now()->longAbsoluteDiffForHumans($notifiable->email_code_expires_at) }}**

Regards,<br>
{{ config('app.name') }}
</x-mail::message>
