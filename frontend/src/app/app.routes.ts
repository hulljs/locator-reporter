import { Routes } from '@angular/router';
import { MapComponent } from './components/map/map';
import { LeadershipComponent } from './components/leadership/leadership';
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
    { path: '', component: MapComponent },
    { path: 'dashboard', component: LeadershipComponent },
    { path: 'login', component: LoginComponent },
    { path: '**', redirectTo: '' }
];
