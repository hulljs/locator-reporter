import { Component, OnInit, AfterViewInit, NgZone, Inject, PLATFORM_ID, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocationService, LocationModel } from '../../services/location';
import { CardComponent } from '../card/card';
import { DashboardComponent } from '../dashboard/dashboard';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, DashboardComponent],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private map: any;
  locations: LocationModel[] = [];
  selectedLocation: LocationModel | undefined;
  dashboardLocationId: number | undefined;
  showAi = false;
  isAddingLocation = false;

  searchQuery = '';
  private markersLayer: any;
  instanceId = Math.random().toString(36).substring(7);

  startAddLocation() {
    this.isAddingLocation = true;
    this.searchQuery = '';
  }

  cancelAdd() {
    this.isAddingLocation = false;
  }

  constructor(
    private locationService: LocationService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('MapComponent Constructor! Instance ID:', this.instanceId);
  }

  ngOnDestroy() {
    console.log('MapComponent Destroying Instance:', this.instanceId);
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  ngOnInit() {
    this.locationService.getLocations().subscribe({
      next: (locs) => {
        this.locations = locs;
        if (this.map) {
          this.initMarkers();
        }
      },
      error: (err) => console.error('Failed to load locations', err)
    });
  }

  // ... (rest of methods)

  private async initMarkers(): Promise<void> {
    if (!this.map) return;
    if (isPlatformBrowser(this.platformId)) {
      const L = await import('leaflet');
      console.log('Initializing markers for', this.locations.length, 'locations');

      // Initialize LayerGroup if not exists for better management
      if (!this.markersLayer) {
        this.markersLayer = L.layerGroup().addTo(this.map);
      } else {
        this.markersLayer.clearLayers();
      }

      this.locations.forEach(loc => {
        // Cast to number just in case lat/lng are strings from DB
        const lat = Number(loc.lat);
        const lng = Number(loc.lng);

        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid coordinates:', loc);
          return;
        }

        const marker = L.marker([lat, lng])
          .bindTooltip(loc.name);

        this.markersLayer.addLayer(marker);

        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          console.log('Using MapComponent Instance:', this.instanceId);

          this.zone.run(() => {
            // Force a macrotask to ensure view updates, even if zone state is weird
            setTimeout(() => {
              console.log('Inside Angular Zone (Timeout) for Instance ' + this.instanceId);
              this.selectedLocation = loc;
              this.showAi = false;
              this.dashboardLocationId = undefined;
              console.log('Setting selectedLocation to:', this.selectedLocation);
              this.cdr.detectChanges();
            }, 0);
          });
        });
      });
    }
  }

  async searchAndPlace() {
    if (!this.searchQuery) return;

    this.http.get<any[]>('https://nominatim.openstreetmap.org/search', {
      params: {
        q: this.searchQuery,
        format: 'json',
        limit: '1'
      }
    }).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);

          if (this.map) {
            this.map.setView([lat, lon], 12);
          }

          this.zone.run(() => {
            this.selectedLocation = {
              id: 0,
              name: this.searchQuery,
              description: 'Enter description...',
              lat: lat,
              lng: lon
            };
            this.isAddingLocation = false;
            this.cdr.detectChanges();
          });
        } else {
          alert('Location not found');
        }
      },
      error: (e) => {
        console.error('Search error:', e);
        alert('Error searching location');
      }
    });
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const L = await import('leaflet');
      this.initMap(L);
    }
  }

  private initMap(L: any): void {
    // Check for existing map instance to avoid "Map container is already initialized"
    const container = L.DomUtil.get('map');
    if (container && (container as any)._leaflet_id) {
      console.warn('Map container already initialized. Forcing cleanup...');

      // Attempt to find the existing map instance is hard without reference, 
      // but we can try to clear the DOM and _leaflet_id.
      (container as any)._leaflet_id = null;
      container.innerHTML = '';
      // Note: This leaves specific listeners attached to 'document' or 'window' if Leaflet added them, 
      // but marker clicks are usually on DOM elements inside the container.
    }

    if (!this.map) {
      this.map = L.map('map', {
        center: [39.8283, -98.5795],
        zoom: 4
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Icon fix
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'marker-icon-2x.png',
        iconUrl: 'marker-icon.png',
        shadowUrl: 'marker-shadow.png',
      });

      if (this.locations.length > 0) {
        this.initMarkers();
      }

      this.map.on('click', (e: any) => {
        this.zone.run(() => {
          if (this.isAddingLocation) {
            const { lat, lng } = e.latlng;
            this.selectedLocation = {
              id: 0,
              name: 'New Location',
              description: 'Enter description...',
              lat: lat,
              lng: lng
            };
            this.isAddingLocation = false;
            this.cdr.detectChanges();
          }
        });
      });
    }
  }

  openAiForLocation() {
    if (this.selectedLocation) {
      console.log('Opening AI for location:', this.selectedLocation.id);
      this.dashboardLocationId = this.selectedLocation.id;
      this.showAi = true;
      this.cdr.detectChanges();
    }
  }
}
