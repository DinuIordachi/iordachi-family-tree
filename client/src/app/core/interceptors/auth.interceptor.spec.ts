import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('auth_token', 'leftover-token');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    expect(TestBed.inject(AuthService).getToken()).toBe('leftover-token');
  });

  afterEach(() => {
    ctrl.verify();
    localStorage.removeItem('auth_token');
  });

  it('sends the token with ordinary requests', () => {
    http.get('/api/v1/me').subscribe();
    expect(ctrl.expectOne('/api/v1/me').request.headers.get('Authorization')).toBe('Bearer leftover-token');
  });

  it('never sends a leftover token when signing in', () => {
    for (const url of ['/api/v1/login', '/api/v1/register', '/api/v1/forgot-password', '/api/v1/reset-password']) {
      http.post(url, {}).subscribe();
      expect(ctrl.expectOne(url).request.headers.has('Authorization')).toBe(false);
    }
  });
});
