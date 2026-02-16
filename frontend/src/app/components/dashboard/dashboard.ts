import { Component, OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '../../services/ai';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnChanges {
  @Input() locationId: number | undefined;
  overview: any;
  metrics: any;
  loading = true;

  constructor(private aiService: AiService) { }

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['locationId']) {
      this.loadData();
    }
  }

  loadData() {
    this.loading = true;
    this.overview = null;
    this.metrics = null;

    if (this.locationId) {
      // Load Location specific
      this.aiService.getLocationAnalysis(this.locationId).subscribe({
        next: (data) => {
          console.log('Location AI loaded:', data);
          this.overview = { overview: data.summary };
          this.metrics = {
            metrics: [
              ...data.risks.map((r: string) => ({ name: 'Risk Detected', status: 'Fail', details: r })),
              ...data.opportunities.map((o: string) => ({ name: 'Opportunity', status: 'Pass', details: o, value: 'High' }))
            ]
          };
          this.checkLoading();
        },
        error: (e) => {
          console.error('Error loading loc AI:', e);
          this.loading = false;
        }
      });
    } else {
      // Load Program Global
      this.aiService.getProgramOverview().subscribe({
        next: (data) => {
          console.log('AI Overview loaded:', data);
          this.overview = data;
          this.checkLoading();
        },
        error: (e) => console.error('Error loading AI Overview:', e)
      });
      this.aiService.getMetrics().subscribe({
        next: (data) => {
          console.log('AI Metrics loaded:', data);
          this.metrics = data;
          this.checkLoading();
        },
        error: (e) => console.error('Error loading AI Metrics:', e)
      });
    }
  }

  checkLoading() {
    // Simplified: if locationId, wait for 1 call. If global, wait for 2.
    if (this.locationId) {
      if (this.overview && this.metrics) this.loading = false;
    } else {
      if (this.overview && this.metrics) this.loading = false;
    }
  }
}
