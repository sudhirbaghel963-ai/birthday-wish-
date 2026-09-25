import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'clean-url-and-gift-router',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url) {
            const [pathname, search] = req.url.split('?');
            const query = search ? `?${search}` : '';

            // Handle /gift/:slug and /view/:slug
            if ((pathname.startsWith('/gift/') || pathname.startsWith('/view/')) && !pathname.includes('.')) {
              const parts = pathname.split('/');
              const slug = parts[parts.length - 1];
              req.url = `/gift.html?slug=${encodeURIComponent(slug)}${search ? '&' + search : ''}`;
              return next();
            }

            // Handle /preview/:experienceId
            if (pathname.startsWith('/preview/') && !pathname.includes('.')) {
              const parts = pathname.split('/');
              const expSlug = parts[parts.length - 1];
              req.url = `/preview.html?experience=${encodeURIComponent(expSlug)}${search ? '&' + search : ''}`;
              return next();
            }

            // Handle clean URLs: /admin -> /admin.html, /login -> /login.html, etc.
            const cleanRoutes = ['admin', 'login', 'dashboard', 'editor', 'create', 'gift', 'preview', 'terms', 'privacy', 'influencer', 'influencer-dashboard'];
            const match = pathname.replace(/^\//, '').replace(/\/$/, '');
            if (cleanRoutes.includes(match)) {
              req.url = `/${match}.html${query}`;
              return next();
            }
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'preview.html'),
        gift: resolve(__dirname, 'gift.html'),
        create: resolve(__dirname, 'create.html'),
        editor: resolve(__dirname, 'editor.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        admin: resolve(__dirname, 'admin.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        influencer: resolve(__dirname, 'influencer.html'),
        'influencer-dashboard': resolve(__dirname, 'influencer-dashboard.html'),
      },
    },
  },
})