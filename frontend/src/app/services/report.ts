import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Report {
  id?: number;
  location_id: number;
  author_id?: number;
  title: string;
  body: string;
  report_type: string;
  report_date?: string;
  created_at?: string;
  // Joined fields
  location_name?: string;
  author_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:3075/api';

  constructor(private http: HttpClient) { }

  getReports(filters?: { search?: string; type?: string; location_id?: number }): Observable<Report[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.location_id) params = params.set('location_id', filters.location_id.toString());
    return this.http.get<Report[]>(`${this.apiUrl}/reports`, { params });
  }

  getReport(id: number): Observable<Report> {
    return this.http.get<Report>(`${this.apiUrl}/reports/${id}`);
  }

  addReport(report: Partial<Report>): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/reports`, report);
  }

  deleteReport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reports/${id}`);
  }
}
