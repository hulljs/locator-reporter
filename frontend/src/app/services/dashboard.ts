import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  total_locations: number;
  total_people: number;
  total_projects: number;
  total_reports: number;
  at_risk_count: number;
  behind_count: number;
  overcommitted_count: number;
  total_budget_planned: number;
  total_budget_actual: number;
}

export interface ProjectsByLocation {
  location_id: number;
  location_name: string;
  projects: Array<{
    id: number;
    name: string;
    description: string;
    is_top_5: boolean;
    status: string;
    phase: string;
    start_date: string;
    end_date: string;
    percent_complete: number;
    budget_planned: number;
    budget_actual: number;
  }>;
  project_count: number;
  top_5_count: number;
  at_risk_count: number;
  behind_count: number;
  total_budget_planned: number;
  total_budget_actual: number;
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
    allocation_pct: number;
  }> | null;
  people_count: number;
  total_allocation: number;
}

export interface WorkloadSummary {
  id: number;
  name: string;
  role: string;
  organization: string;
  total_allocation: number;
  assignments: Array<{
    location_name: string;
    role_at_location: string;
    allocation_pct: number;
    location_id: number;
  }> | null;
}

export interface HeatmapData {
  location_id: number;
  location_name: string;
  budget_ratio: number;
  budget_planned: number;
  budget_actual: number;
  avg_completion: number;
  on_track: number;
  at_risk: number;
  behind: number;
  complete: number;
  total_projects: number;
  total_staff_allocation: number;
  staff_count: number;
}

export interface ActivityEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  details: string;
  user_name: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3075/api';

  constructor(private http: HttpClient) { }

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/summary`);
  }

  getProjectsByLocation(): Observable<ProjectsByLocation[]> {
    return this.http.get<ProjectsByLocation[]>(`${this.apiUrl}/dashboard/projects-by-location`);
  }

  getPeopleByLocation(): Observable<PeopleByLocation[]> {
    return this.http.get<PeopleByLocation[]>(`${this.apiUrl}/dashboard/people-by-location`);
  }

  getWorkloadSummary(): Observable<WorkloadSummary[]> {
    return this.http.get<WorkloadSummary[]>(`${this.apiUrl}/people/workload/summary`);
  }

  getHeatmap(): Observable<HeatmapData[]> {
    return this.http.get<HeatmapData[]>(`${this.apiUrl}/dashboard/heatmap`);
  }

  getActivity(limit = 50): Observable<ActivityEntry[]> {
    return this.http.get<ActivityEntry[]>(`${this.apiUrl}/activity`, { params: { limit: limit.toString() } });
  }

  getChartBudget(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/chart/budget-by-location`);
  }

  getChartStatus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/chart/status-distribution`);
  }

  getChartPhase(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/chart/phase-distribution`);
  }

  getChartStaffing(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/chart/staffing-by-location`);
  }
}
