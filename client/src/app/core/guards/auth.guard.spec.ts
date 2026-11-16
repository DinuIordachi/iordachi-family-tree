import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  function run(authenticated: boolean, url: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { initialize: () => of(authenticated) } }],
    });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    return firstValueFrom(result);
  }

  it('lets signed-in users through', async () => {
    expect(await run(true, '/tree')).toBe(true);
  });

  it('sends guests to the login page, remembering the page they asked for', async () => {
    const result = await run(false, '/tree?focus=12');
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Ftree%3Ffocus%3D12');
  });
});
