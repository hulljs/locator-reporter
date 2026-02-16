import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = 'http://localhost:3075/api/ai';

  constructor(private http: HttpClient) { }

  getProgramOverview(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/program-overview`);
  }

  getMetrics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/metrics`);
  }

  getLocationAnalysis(locationId: number): Observable<any> {
    return this.http.get<any>(`http://localhost:3075/api/locations/${locationId}/ai-analysis`);
  }
}
