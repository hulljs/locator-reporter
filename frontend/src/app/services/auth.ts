import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
}

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3075/api/auth';
  private isBrowser: boolean;
  private currentUserSubject: BehaviorSubject<User | null>;
  currentUser$: Observable<User | null>;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.currentUserSubject = new BehaviorSubject<User | null>(this.loadStoredUser());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private loadStoredUser(): User | null {
    if (!this.isBrowser) return null;
    try {
      const stored = localStorage.getItem('lr_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('lr_token');
  }

  get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        if (this.isBrowser) {
          localStorage.setItem('lr_token', res.token);
          localStorage.setItem('lr_user', JSON.stringify(res.user));
        }
        this.currentUserSubject.next(res.user);
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('lr_token');
      localStorage.removeItem('lr_user');
    }
    this.currentUserSubject.next(null);
  }

  hasRole(...roles: string[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }
}
