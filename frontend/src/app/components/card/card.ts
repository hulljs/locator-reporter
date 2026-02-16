import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService, LocationModel, Poc, Project } from '../../services/location';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './card.html',
  styleUrls: ['./card.css']
})
export class CardComponent implements OnInit, OnChanges {
  @Input() location: LocationModel | undefined;
  // keep locationId for backward compat or just use location.id
  @Input() locationId: number | undefined;

  @Output() close = new EventEmitter<void>();
  @Output() analyze = new EventEmitter<void>();

  pocs: Poc[] = [];
  projects: Project[] = [];
  isFlipped = false;
  isEditing = false;

  // Fields for editing
  editName = '';
  editDesc = '';

  constructor(private locationService: LocationService) { }

  ngOnInit() {
    console.log('CardComponent initialized with location:', this.location);
    this.initData();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('CardComponent changes:', changes);
    if (changes['location'] || changes['locationId']) {
      this.initData();
    }
  }

  private initData() {
    // Prefer input location object if available
    if (this.location) {
      this.editName = this.location.name;
      this.editDesc = this.location.description || '';
      this.locationId = this.location.id;
    }

    this.isFlipped = false;

    // If new location (id 0), start in edit mode
    if (this.locationId === 0) {
      this.isEditing = true;
      this.pocs = [];
      this.projects = [];
    } else {
      this.isEditing = false;
      if (this.locationId) {
        this.loadData();
      }
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.location) {
      this.editName = this.location.name;
      this.editDesc = this.location.description || '';
    }
  }

  save() {
    if (!this.location) return;

    const newLoc = { ...this.location, name: this.editName, description: this.editDesc };

    if (this.locationId === 0) {
      // Create
      this.locationService.addLocation(newLoc).subscribe({
        next: (created) => {
          console.log('Created:', created);
          this.location = created;
          this.locationId = created.id;
          this.isEditing = false;
          // Refresh map? We might need to emit an event to parent
          window.location.reload(); // Simple brute force update for now or emit 'saved' event
        },
        error: (e) => console.error('Error creating:', e)
      });
    } else {
      // Update
      if (this.locationId) {
        this.locationService.updateLocation(this.locationId, newLoc).subscribe({
          next: (updated) => {
            console.log('Updated:', updated);
            this.location = updated;
            this.isEditing = false;
            // Refresh map? 
            window.location.reload();
          },
          error: (e) => console.error('Error updating:', e)
        });
      }
    }
  }

  loadData() {
    if (this.locationId) {
      this.locationService.getPocs(this.locationId).subscribe({
        next: (p) => this.pocs = p,
        error: (e) => console.error('Error loading POCs:', e)
      });
      this.locationService.getProjects(this.locationId).subscribe({
        next: (proj) => this.projects = proj,
        error: (e) => console.error('Error loading Projects:', e)
      });
    }
  }

  // --- Project Management ---

  addProject() {
    if (!this.locationId) return;

    const newProj: Project = {
      location_id: this.locationId,
      name: 'New Project',
      description: 'Description here',
      is_top_5: false
    };

    this.locationService.addProject(this.locationId, newProj).subscribe({
      next: (created) => {
        this.projects.push(created);
        console.log('Project added:', created);
      },
      error: (e) => console.error('Error adding project:', e)
    });
  }

  saveProject(project: Project) {
    if (!project.id) return;

    this.locationService.updateProject(project.id, project).subscribe({
      next: (updated) => {
        console.log('Project updated:', updated);
        // Optimistic update already happened via ngModel
      },
      error: (e) => console.error('Error updating project:', e)
    });
  }

  deleteProject(project: Project) {
    if (!project.id || !confirm(`Delete project "${project.name}"?`)) return;

    this.locationService.deleteProject(project.id).subscribe({
      next: () => {
        this.projects = this.projects.filter(p => p.id !== project.id);
        console.log('Project deleted');
      },
      error: (e) => console.error('Error deleting project:', e)
    });
  }

  flip() {
    this.isFlipped = !this.isFlipped;
  }

  onAnalyze() {
    this.analyze.emit();
  }

  onClose() {
    this.close.emit();
  }
}
