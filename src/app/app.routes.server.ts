import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Parameterized routes must use Client rendering (no prerender)
  { path: 'track-order/:id', renderMode: RenderMode.Client },
  { path: 'auth/callback', renderMode: RenderMode.Client },

  // Admin routes with parameters
  { path: 'admin/**', renderMode: RenderMode.Client },

  // Fallback: prerender all other static routes
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
