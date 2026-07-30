import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'root-web-manifest',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(
            /(<link\b[^>]*\bid="app-manifest"[^>]*\bhref=")[^"]+/,
            '$1./manifest.webmanifest'
          );
        }
      }
    }
  ],
  // A relative base keeps the build portable: it works at both a custom domain
  // root and GitHub Pages' /snake-game/ repository subpath.
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
