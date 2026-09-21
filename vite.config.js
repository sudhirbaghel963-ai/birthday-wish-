import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'gift-slug-router',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.startsWith('/gift/') || req.url.startsWith('/view/')) && !req.url.includes('.')) {
            const parts = req.url.split('/');
            const slug = parts[parts.length - 1].split('?')[0];
            req.url = `/gift.html?slug=${encodeURIComponent(slug)}`;
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
      },
    },
  },
})