# GitHub Pages deployment

This project publishes `snake-game-turn.html` as `index.html` and publishes `sw.js` and the shared `snake-core.js` beside it on the `gh-pages` branch.
The deployment includes the current working copy, so commit the game first when you want the
source branch and deployed version to correspond exactly.

Preview the deployment without committing or pushing:

```powershell
.\deploy-gh-pages.ps1 -DryRun
```

Deploy:

```powershell
.\deploy-gh-pages.ps1
```

The script requires Git credentials with write access to `chicoramon/snake-game`. It clones the
existing `gh-pages` branch into a temporary directory, preserves its GitHub Actions workflow,
replaces the published game files (`index.html`, `sw.js`, `snake-core.js`, static assets, and `.nojekyll`), commits the result,
pushes it, and removes the temporary directory.

The repository's existing GitHub Actions workflow deploys changes from `gh-pages`. In GitHub,
ensure **Settings > Pages > Build and deployment > Source** is set to **GitHub Actions**.

Published site: <https://chicoramon.github.io/snake-game/>
