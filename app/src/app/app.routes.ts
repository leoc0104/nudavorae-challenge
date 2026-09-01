import { Routes } from '@angular/router';
import { CataloguePage } from './features/catalogue/catalogue-page/catalogue-page';

export const routes: Routes = [
  {
    path: '',
    component: CataloguePage,
    title: 'Packs | Nudavorae',
  },
  {
    // RF-8: the pack screen is a lazy route.
    path: 'packs/:id',
    loadComponent: () => import('./features/pack/pack-page/pack-page').then((m) => m.PackPage),
    title: 'Pack | Nudavorae',
  },
  { path: '**', redirectTo: '' },
];
