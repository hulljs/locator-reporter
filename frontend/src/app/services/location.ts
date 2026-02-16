import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LocationModel {
  id?: number;
  name: string;
  description?: string;
  lat: number;
  lng: number;
}

export interface Poc {
  id?: number;
  location_id?: number;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Project {
  id?: number;
  location_id?: number;
  name: string;
  description: string;
  is_top_5: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private apiUrl = 'http://localhost:3075/api/locations';

  constructor(private http: HttpClient) { }

  getLocations(): Observable<LocationModel[]> {
    return this.http.get<LocationModel[]>(this.apiUrl);
  }

  addLocation(location: LocationModel): Observable<LocationModel> {
    return this.http.post<LocationModel>(this.apiUrl, location);
  }

  updateLocation(id: number, location: LocationModel): Observable<LocationModel> {
    return this.http.put<LocationModel>(`${this.apiUrl}/${id}`, location);
  }

  getPocs(locationId: number): Observable<Poc[]> {
    return this.http.get<Poc[]>(`${this.apiUrl}/${locationId}/pocs`);
  }

  addPoc(locationId: number, poc: Poc): Observable<Poc> {
    return this.http.post<Poc>(`${this.apiUrl}/${locationId}/pocs`, poc);
  }

  getProjects(locationId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/${locationId}/projects`);
  }

  addProject(locationId: number, project: Project): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/${locationId}/projects`, project);
  }

  updateProject(id: number, project: Project): Observable<Project> {
    return this.http.put<Project>(`http://localhost:3075/api/projects/${id}`, project);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`http://localhost:3075/api/projects/${id}`);
  }
}
