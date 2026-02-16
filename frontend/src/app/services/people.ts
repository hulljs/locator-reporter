import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Person {
  id?: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  organization: string;
  skills: string;
}

export interface Assignment {
  id?: number;
  person_id: number;
  location_id: number;
  role_at_location: string;
  start_date?: string;
  end_date?: string;
  status: string;
  // Joined fields
  person_name?: string;
  person_role?: string;
  person_email?: string;
  person_phone?: string;
  organization?: string;
  skills?: string;
  location_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PeopleService {
  private apiUrl = 'http://localhost:3075/api';

  constructor(private http: HttpClient) { }

  getPeople(): Observable<Person[]> {
    return this.http.get<Person[]>(`${this.apiUrl}/people`);
  }

  getPerson(id: number): Observable<Person> {
    return this.http.get<Person>(`${this.apiUrl}/people/${id}`);
  }

  addPerson(person: Person): Observable<Person> {
    return this.http.post<Person>(`${this.apiUrl}/people`, person);
  }

  updatePerson(id: number, person: Person): Observable<Person> {
    return this.http.put<Person>(`${this.apiUrl}/people/${id}`, person);
  }

  deletePerson(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/people/${id}`);
  }

  getAssignments(): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(`${this.apiUrl}/assignments`);
  }

  getLocationAssignments(locationId: number): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(`${this.apiUrl}/locations/${locationId}/assignments`);
  }

  getPersonAssignments(personId: number): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(`${this.apiUrl}/people/${personId}/assignments`);
  }

  addAssignment(assignment: Partial<Assignment>): Observable<Assignment> {
    return this.http.post<Assignment>(`${this.apiUrl}/assignments`, assignment);
  }

  deleteAssignment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/assignments/${id}`);
  }
}
