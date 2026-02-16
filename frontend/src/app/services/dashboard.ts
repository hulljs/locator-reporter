import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  total_locations: number;
  total_people: number;
  total_projects: number;
  total_reports: number;
}

export interface ProjectsByLocation {
  location_id: number;
  location_name: string;
  projects: Array<{
    id: number;
    name: string;
    description: string;
    is_top_5: boolean;
  }>;
  project_count: number;
  top_5_count: number;
}

export interface PeopleByLocation {
  location_id: number;
  location_name: string;
  people: Array<{
    person_id: number;
    person_name: string;
    person_role: string;
    organization: string;
    role_at_location: string;
    status: string;
    email: string;
  }>;
  people_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3075/api/dashboard';

  constructor(private http: HttpClient) { }

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`);
  }

  getProjectsByLocation(): Observable<ProjectsByLocation[]> {
    return this.http.get<ProjectsByLocation[]>(`${this.apiUrl}/projects-by-location`);
  }

  getPeopleByLocation(): Observable<PeopleByLocation[]> {
    return this.http.get<PeopleByLocation[]>(`${this.apiUrl}/people-by-location`);
  }
}
