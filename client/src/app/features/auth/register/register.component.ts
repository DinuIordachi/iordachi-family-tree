import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/services';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { FloatLabel } from 'primeng/floatlabel';
import { AppFloatingConfigurator } from '@app/layout';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Password,
    Button,
    Message,
    FloatLabel,
    AppFloatingConfigurator,
  ],
  templateUrl: './register.component.html',
  styles: ``,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loading = signal(false);
  errorMessage = signal('');
  fieldErrors = signal<Record<string, string[]>>({});

  form: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
      phone: [''],
    },
    { validators: this.passwordMatchValidator },
  );

  fieldError(field: string): string {
    const errors = this.fieldErrors();
    return errors[field] ? errors[field].join(' ') : '';
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmation = control.get('password_confirmation')?.value;
    if (password && confirmation && password !== confirmation) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onRegister(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.fieldErrors.set({});

    const { name, email, password, password_confirmation } = this.form.value;

    this.auth.register({ name, email, password, password_confirmation }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 422) {
          const errors = err.error?.errors;
          if (errors) {
            this.fieldErrors.set(errors);
            this.errorMessage.set(err.error?.message || 'Please fix the errors below.');
          } else {
            this.errorMessage.set(err.error?.message || 'Registration failed.');
          }
        } else {
          this.errorMessage.set('An error occurred. Please try again.');
        }
      },
    });
  }
}
