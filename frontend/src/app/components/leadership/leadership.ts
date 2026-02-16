import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { DashboardService, DashboardSummary, ProjectsByLocation, PeopleByLocation, WorkloadSummary, HeatmapData, ActivityEntry } from '../../services/dashboard';
import { ReportService, Report } from '../../services/report';
import { AuthService } from '../../services/auth';
import { NotificationService, Notification as AppNotification } from '../../services/notification';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-leadership',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './leadership.html',
  styleUrls: ['./leadership.css']
})
export class LeadershipComponent implements OnInit, AfterViewInit {
  // Tab state - tabs: overview, projects, people, heatmap, activity, charts, reports
  activeTab: string = 'overview';

  // Data
  summary: DashboardSummary | null = null;
  projectsByLocation: ProjectsByLocation[] = [];
  peopleByLocation: PeopleByLocation[] = [];
  workload: WorkloadSummary[] = [];
  heatmap: HeatmapData[] = [];
  activity: ActivityEntry[] = [];
  reports: Report[] = [];

  // Report filters
  reportSearch = '';
  reportTypeFilter = '';
  reportLocationFilter = '';

  // UI state
  expandedLocations = new Set<number>();
  selectedReport: Report | null = null;
  showNotifications = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;

  // Chart refs
  @ViewChild('budgetChart') budgetChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('phaseChart') phaseChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('staffingChart') staffingChartRef!: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];

  constructor(
    private dashboardService: DashboardService,
    private reportService: ReportService,
    public authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadAll();
    if (this.authService.isLoggedIn) {
      this.loadNotifications();
    }
  }

  ngAfterViewInit() {
    // Charts will be initialized when the charts tab is selected
  }

  loadAll() {
    this.loadSummary();
    this.loadProjectsByLocation();
    this.loadPeopleByLocation();
    this.loadWorkload();
    this.loadHeatmap();
    this.loadActivity();
    this.loadReports();
  }

  loadSummary() {
    this.dashboardService.getSummary().subscribe({
      next: s => this.summary = s,
      error: e => console.error('Failed to load summary', e)
    });
  }

  loadProjectsByLocation() {
    this.dashboardService.getProjectsByLocation().subscribe({
      next: d => this.projectsByLocation = d,
      error: e => console.error(e)
    });
  }

  loadPeopleByLocation() {
    this.dashboardService.getPeopleByLocation().subscribe({
      next: d => this.peopleByLocation = d,
      error: e => console.error(e)
    });
  }

  loadWorkload() {
    this.dashboardService.getWorkloadSummary().subscribe({
      next: d => this.workload = d,
      error: e => console.error(e)
    });
  }

  loadHeatmap() {
    this.dashboardService.getHeatmap().subscribe({
      next: d => this.heatmap = d,
      error: e => console.error(e)
    });
  }

  loadActivity() {
    this.dashboardService.getActivity(30).subscribe({
      next: d => this.activity = d,
      error: e => console.error(e)
    });
  }

  loadReports() {
    const filters: any = {};
    if (this.reportSearch) filters.search = this.reportSearch;
    if (this.reportTypeFilter) filters.type = this.reportTypeFilter;
    if (this.reportLocationFilter) filters.location_id = parseInt(this.reportLocationFilter);
    this.reportService.getReports(filters).subscribe({
      next: r => this.reports = r,
      error: e => console.error(e)
    });
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: n => this.notifications = n,
      error: () => { }
    });
    this.notificationService.getUnreadCount().subscribe({
      next: c => this.unreadCount = c.count,
      error: () => { }
    });
  }

  // Tab switching
  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'charts') {
      setTimeout(() => this.initCharts(), 100);
    }
  }

  // Charts (P3)
  initCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    this.dashboardService.getChartBudget().subscribe(data => {
      if (this.budgetChartRef?.nativeElement) {
        this.charts.push(new Chart(this.budgetChartRef.nativeElement, {
          type: 'bar',
          data: {
            labels: data.map(d => d.name),
            datasets: [
              { label: 'Planned', data: data.map(d => parseFloat(d.planned)), backgroundColor: 'rgba(59,130,246,0.7)' },
              { label: 'Actual', data: data.map(d => parseFloat(d.actual)), backgroundColor: 'rgba(139,92,246,0.7)' }
            ]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Budget by Location ($)', color: '#f8fafc' }, legend: { labels: { color: '#94a3b8' } } },
            scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
          }
        }));
      }
    });

    this.dashboardService.getChartStatus().subscribe(data => {
      if (this.statusChartRef?.nativeElement) {
        const colors: Record<string, string> = { 'on-track': '#10b981', 'at-risk': '#f59e0b', 'behind': '#ef4444', 'complete': '#3b82f6' };
        this.charts.push(new Chart(this.statusChartRef.nativeElement, {
          type: 'doughnut',
          data: {
            labels: data.map(d => d.status),
            datasets: [{ data: data.map(d => parseInt(d.count)), backgroundColor: data.map(d => colors[d.status] || '#94a3b8') }]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Project Status Distribution', color: '#f8fafc' }, legend: { labels: { color: '#94a3b8' } } }
          }
        }));
      }
    });

    this.dashboardService.getChartPhase().subscribe(data => {
      if (this.phaseChartRef?.nativeElement) {
        const phaseColors = ['#8b5cf6', '#a78bfa', '#60a5fa', '#3b82f6', '#10b981'];
        this.charts.push(new Chart(this.phaseChartRef.nativeElement, {
          type: 'bar',
          data: {
            labels: data.map(d => d.phase),
            datasets: [{ label: 'Projects', data: data.map(d => parseInt(d.count)), backgroundColor: phaseColors }]
          },
          options: {
            responsive: true, indexAxis: 'y',
            plugins: { title: { display: true, text: 'Projects by Phase', color: '#f8fafc' }, legend: { display: false } },
            scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
          }
        }));
      }
    });

    this.dashboardService.getChartStaffing().subscribe(data => {
      if (this.staffingChartRef?.nativeElement) {
        this.charts.push(new Chart(this.staffingChartRef.nativeElement, {
          type: 'bar',
          data: {
            labels: data.map(d => d.name),
            datasets: [
              { label: 'Headcount', data: data.map(d => parseInt(d.headcount)), backgroundColor: 'rgba(16,185,129,0.7)', yAxisID: 'y' },
              { label: 'Total Allocation %', data: data.map(d => parseInt(d.total_allocation)), backgroundColor: 'rgba(245,158,11,0.7)', yAxisID: 'y1' }
            ]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Staffing by Location', color: '#f8fafc' }, legend: { labels: { color: '#94a3b8' } } },
            scales: {
              y: { type: 'linear', position: 'left', ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Headcount', color: '#94a3b8' } },
              y1: { type: 'linear', position: 'right', ticks: { color: '#94a3b8' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Allocation %', color: '#94a3b8' } },
              x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        }));
      }
    });
  }

  // Export (P3)
  exportProjectsCsv() {
    window.open('http://localhost:3075/api/export/projects-csv', '_blank');
  }

  exportPeopleCsv() {
    window.open('http://localhost:3075/api/export/people-csv', '_blank');
  }

  printDashboard() {
    window.print();
  }

  // Notifications (P3)
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markNotificationRead(n: AppNotification) {
    this.notificationService.markAsRead(n.id).subscribe(() => {
      n.is_read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  markAllNotificationsRead() {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => n.is_read = true);
      this.unreadCount = 0;
    });
  }

  // Auth
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Helpers
  searchReports() { this.loadReports(); }
  clearFilters() { this.reportSearch = ''; this.reportTypeFilter = ''; this.reportLocationFilter = ''; this.loadReports(); }
  toggleLocation(id: number) { this.expandedLocations.has(id) ? this.expandedLocations.delete(id) : this.expandedLocations.add(id); }
  isExpanded(id: number): boolean { return this.expandedLocations.has(id); }
  viewReport(r: Report) { this.selectedReport = r; }
  closeReport() { this.selectedReport = null; }

  getStatusClass(status: string): string {
    switch (status) { case 'on-track': return 'status-green'; case 'at-risk': return 'status-yellow'; case 'behind': return 'status-red'; case 'complete': return 'status-blue'; default: return 'status-gray'; }
  }

  getReportTypeBadgeClass(type: string): string {
    switch (type) { case 'quarterly': return 'badge-blue'; case 'inspection': return 'badge-green'; case 'sitrep': return 'badge-yellow'; case 'assessment': return 'badge-purple'; default: return 'badge-gray'; }
  }

  getHeatmapColor(value: number, metric: string): string {
    if (metric === 'budget') {
      if (value <= 0.7) return 'heat-green';
      if (value <= 0.9) return 'heat-yellow';
      return 'heat-red';
    }
    if (metric === 'schedule') {
      if (value >= 50) return 'heat-green';
      if (value >= 25) return 'heat-yellow';
      return 'heat-red';
    }
    if (metric === 'status') {
      if (value === 0) return 'heat-green';
      if (value <= 1) return 'heat-yellow';
      return 'heat-red';
    }
    return 'heat-gray';
  }

  getWorkloadClass(total: number): string {
    if (total > 100) return 'workload-over';
    if (total >= 80) return 'workload-high';
    if (total >= 50) return 'workload-medium';
    return 'workload-low';
  }

  getActivityIcon(action: string): string {
    switch (action) { case 'created': return 'add_circle'; case 'updated': return 'edit'; case 'status_changed': return 'swap_horiz'; case 'deleted': return 'delete'; default: return 'info'; }
  }

  getNotificationIcon(type: string): string {
    switch (type) { case 'alert': return 'error'; case 'warning': return 'warning'; default: return 'info'; }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatCurrency(val: number): string {
    if (!val) return '$0';
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
    return '$' + val.toFixed(0);
  }

  timeAgo(date: string): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return diffMins + 'm ago';
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return diffHrs + 'h ago';
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return diffDays + 'd ago';
    return this.formatDate(date);
  }
}
