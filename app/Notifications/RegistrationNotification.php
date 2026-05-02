<?php

namespace App\Notifications;

use Illuminate\Support\Uri;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RegistrationNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(protected ?string $password = null)
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name');
        $loginUrl = Uri::of(config('app.front_end_url'))
            ->withPath('/login')
            ->withQuery(['email' => $notifiable->email]);

        return (new MailMessage)
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->subject("You have joined $appName")
            ->greeting("Hello, $notifiable->first_name $notifiable->last_name!")
            ->line("Great to see you here! Your account has been created and it's ready for you!")
            ->line('Your email address is: ' . $notifiable->email)
            ->lineIf($this->password, 'Your new temporary password: ' . $this->password)
            ->action('Login', $loginUrl)
            ->lineIf($this->password,
                "Please be aware to update your password after signing in! It's important for us to keep your sensitive information safe.");
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
