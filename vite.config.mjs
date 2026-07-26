import { defineConfig } from 'vite';

export default defineConfig({
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
