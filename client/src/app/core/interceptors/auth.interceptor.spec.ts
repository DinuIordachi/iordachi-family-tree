import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
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

describe('authInterceptor when the session expires', () => {
  it('sends the user to log in again, remembering the page they were on', async () => {
    localStorage.setItem('auth_token', 'expired-token');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'tree', children: [] }, { path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/tree');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    TestBed.inject(HttpClient).get('/api/v1/family-tree').subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/family-tree')
      .flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/tree' } });
    expect(TestBed.inject(AuthService).getToken()).toBeNull();
    localStorage.removeItem('auth_token');
  });
});
