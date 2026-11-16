import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@app/core/services';
import { LoginComponent } from './login.component';

describe('LoginComponent redirect after login', () => {
  function login(returnUrl: string | null): string {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login: () => of({}) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl === null ? {} : { returnUrl }) } },
        },
      ],
    });
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({ email: 'dima@example.com', password: 'secret', rememberMe: false });
    component.onLogin();

    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    return navigateByUrl.mock.calls[0][0] as string;
  }

  it('goes back to the page the guest asked for', () => {
    expect(login('/tree')).toBe('/tree');
    TestBed.resetTestingModule();
    expect(login('/family-members/3?tab=media')).toBe('/family-members/3?tab=media');
  });

  it('opens the dashboard when /login was opened directly', () => {
    expect(login(null)).toBe('/dashboard');
  });

  it('ignores a return address outside the app', () => {
    expect(login('https://evil.example')).toBe('/dashboard');
    TestBed.resetTestingModule();
    expect(login('//evil.example')).toBe('/dashboard');
  });
});
