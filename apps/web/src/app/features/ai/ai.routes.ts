import { Routes } from '@angular/router';

export const AI_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full',
  },
  {
    path: 'chat',
    loadComponent: () => import('./chat/ai-chat.component').then(m => m.AiChatComponent),
  },
];
