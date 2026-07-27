# GitHub Pages deployment

This project builds the modular source with Vite, then publishes the complete generated `dist/`
directory to the `gh-pages` branch. The build creates hashed JavaScript and CSS assets and
regenerates `sw.js` with the exact production asset list.

Install dependencies once:

```powershell
npm install
```

Useful local commands:

```powershell
npm run dev
npm test
npm run test:smoke
npm run build
npm run preview
```

Preview the deployment without committing or pushing:

```powershell
.\deploy-gh-pages.ps1 -DryRun
```

Deploy:

```powershell
.\deploy-gh-pages.ps1
```

## Mobile test deployment

Publish a separate test build without changing the live game:

```powershell
.\deploy-preview.ps1
# or: npm run deploy:preview
```

It builds the same `dist/` artifact, replaces only `preview/` on the `gh-pages`
branch, and leaves the production site at the branch root unchanged.

Test URL: <https://chicoramon.github.io/snake-game/preview/>

Preview the change without pushing:

```powershell
.\deploy-preview.ps1 -DryRun
```

The script requires Git credentials with write access to `chicoramon/snake-game`. It builds the
site first, clones the existing `gh-pages` branch into a temporary directory, preserves its GitHub
Actions workflow, replaces the published files with `dist/`, commits the result, pushes it, and
removes the temporary directory.

The repository's existing GitHub Actions workflow deploys changes from `gh-pages`. In GitHub,
ensure **Settings > Pages > Build and deployment > Source** is set to **GitHub Actions**.

Published site: <https://chicoramon.github.io/snake-game/>
