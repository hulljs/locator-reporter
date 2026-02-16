import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  is_read: boolean;
  link: string;
  created_at: string;
}

export interface NotificationPreferences {
  digest_frequency: string;
  alert_overcommit: boolean;
  alert_status_change: boolean;
  alert_budget_threshold: boolean;
  budget_threshold_pct: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:3075/api';

  constructor(private http: HttpClient) { }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/notifications/unread-count`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/read-all`, {});
  }

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/notification-preferences`);
  }

  updatePreferences(prefs: NotificationPreferences): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.apiUrl}/notification-preferences`, prefs);
  }
}
