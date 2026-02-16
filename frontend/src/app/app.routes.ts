import { Routes } from '@angular/router';
import { MapComponent } from './components/map/map';
import { LeadershipComponent } from './components/leadership/leadership';

export const routes: Routes = [
    { path: '', component: MapComponent },
    { path: 'dashboard', component: LeadershipComponent },
    { path: '**', redirectTo: '' }
];
