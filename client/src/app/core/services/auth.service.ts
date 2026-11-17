import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';
import { RETURN_URL_PARAM, safeReturnUrl } from '../guards/return-url';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;
  private initialized = false;

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAdmin = computed(() => !!this.currentUser()?.roles?.some((role) => role.name === 'admin'));

  constructor() {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      this.token.set(storedToken);
    }
  }

  /**
   * Initialize auth state by validating stored token.
   * Returns observable that completes when validation is done.
   */
  initialize(): Observable<boolean> {
    if (this.initialized || !this.token()) {
      return of(this.isAuthenticated());
    }
    this.initialized = true;
    return this.me().pipe(
      map(() => true),
      catchError(() => {
        this.token.set(null);
        this.currentUser.set(null);
        localStorage.removeItem('auth_token');
        return of(false);
      })
    );
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        this.setToken(response.data.accessToken);
        this.me().subscribe();
      })
    );
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/register`, data).pipe(
      tap(response => {
        this.setToken(response.data.accessToken);
        this.me().subscribe();
      })
    );
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
      complete: () => this.clearAuth(),
      error: () => this.clearAuth()
    });
  }

  me(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/me`).pipe(
      tap(response => this.currentUser.set(response.data))
    );
  }

  getToken(): string | null {
    return this.token();
  }

  private setToken(token: string): void {
    this.token.set(token);
    localStorage.setItem('auth_token', token);
  }

  /**
   * Forget the session and go to /login. Pass the current page as `returnUrl` when the session
   * ended on its own (expired token) so logging in again brings the user back to it.
   */
  clearAuth(returnUrl?: string): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('auth_token');
    const target = safeReturnUrl(returnUrl);
    this.router.navigate(['/login'], target ? { queryParams: { [RETURN_URL_PARAM]: target } } : {});
  }
}
