import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary, ProjectsByLocation, PeopleByLocation } from '../../services/dashboard';
import { ReportService, Report } from '../../services/report';

@Component({
  selector: 'app-leadership',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './leadership.html',
  styleUrls: ['./leadership.css']
})
export class LeadershipComponent implements OnInit {
  activeTab: 'overview' | 'projects' | 'people' | 'reports' = 'overview';

  summary: DashboardSummary | null = null;
  projectsByLocation: ProjectsByLocation[] = [];
  peopleByLocation: PeopleByLocation[] = [];
  reports: Report[] = [];

  // Report filters
  reportSearch = '';
  reportTypeFilter = '';
  reportLocationFilter = '';

  // Expanded location cards
  expandedLocations = new Set<number>();

  // Report detail view
  selectedReport: Report | null = null;

  constructor(
    private dashboardService: DashboardService,
    private reportService: ReportService
  ) { }

  ngOnInit() {
    this.loadSummary();
    this.loadProjectsByLocation();
    this.loadPeopleByLocation();
    this.loadReports();
  }

  loadSummary() {
    this.dashboardService.getSummary().subscribe({
      next: (s) => this.summary = s,
      error: (e) => console.error('Failed to load summary', e)
    });
  }

  loadProjectsByLocation() {
    this.dashboardService.getProjectsByLocation().subscribe({
      next: (data) => this.projectsByLocation = data,
      error: (e) => console.error('Failed to load projects', e)
    });
  }

  loadPeopleByLocation() {
    this.dashboardService.getPeopleByLocation().subscribe({
      next: (data) => this.peopleByLocation = data,
      error: (e) => console.error('Failed to load people', e)
    });
  }

  loadReports() {
    const filters: any = {};
    if (this.reportSearch) filters.search = this.reportSearch;
    if (this.reportTypeFilter) filters.type = this.reportTypeFilter;
    if (this.reportLocationFilter) filters.location_id = parseInt(this.reportLocationFilter);

    this.reportService.getReports(filters).subscribe({
      next: (r) => this.reports = r,
      error: (e) => console.error('Failed to load reports', e)
    });
  }

  searchReports() {
    this.loadReports();
  }

  clearFilters() {
    this.reportSearch = '';
    this.reportTypeFilter = '';
    this.reportLocationFilter = '';
    this.loadReports();
  }

  toggleLocation(locationId: number) {
    if (this.expandedLocations.has(locationId)) {
      this.expandedLocations.delete(locationId);
    } else {
      this.expandedLocations.add(locationId);
    }
  }

  isExpanded(locationId: number): boolean {
    return this.expandedLocations.has(locationId);
  }

  viewReport(report: Report) {
    this.selectedReport = report;
  }

  closeReport() {
    this.selectedReport = null;
  }

  getReportTypeBadgeClass(type: string): string {
    switch (type) {
      case 'quarterly': return 'badge-blue';
      case 'inspection': return 'badge-green';
      case 'sitrep': return 'badge-yellow';
      case 'assessment': return 'badge-purple';
      default: return 'badge-gray';
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}
