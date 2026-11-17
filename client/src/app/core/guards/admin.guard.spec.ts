import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, delay, tap } from 'rxjs';
import { signal } from '@angular/core';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  function run(isAdmin: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { initialize: () => of(true), currentUser: () => ({}), isAdmin: () => isAdmin } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/activity' } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    return firstValueFrom(result);
  }

  it('lets admins through', async () => {
    expect(await run(true)).toBe(true);
  });

  it('sends everyone else to the dashboard', async () => {
    const result = await run(false);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('waits for the profile when signed in but not loaded yet (fresh login)', async () => {
    const user = signal<{ roles: { name: string }[] } | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            initialize: () => of(true),
            currentUser: user,
            isAdmin: () => !!user()?.roles.some((r) => r.name === 'admin'),
            me: () => of({ data: {} }).pipe(delay(5), tap(() => user.set({ roles: [{ name: 'admin' }] }))),
          },
        },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/activity' } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    expect(await firstValueFrom(result)).toBe(true);
  });
});
