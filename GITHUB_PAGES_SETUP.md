# GitHub Pages Setup

This project is now prepared for GitHub Pages hosting.

## What you need to do

1. Create an empty GitHub repository.
2. Put this project into that repository.
3. Push the `main` branch.
4. In GitHub, open `Settings -> Pages`.
5. Under `Build and deployment`, set `Source` to `GitHub Actions`.
6. Run the `Deploy Circle Pages` workflow once, or push to `main`.

## What the workflows do

- `Deploy Circle Pages`
  - runs on push to `main`
  - refreshes the snapshot
  - builds the renderer
  - generates the Circle artifacts
  - deploys `dist/circle-facing` to GitHub Pages

- `Refresh Snapshot`
  - runs every 12 hours
  - refreshes the snapshot
  - rebuilds the Circle artifacts
  - redeploys `dist/circle-facing` to GitHub Pages

## After Pages is live

Your hosted snapshot URL will look like:

`https://YOUR-USERNAME.github.io/YOUR-REPO/snapshot.json`

Then:

1. Open `dist/circle-facing/circle-custom-html.html`
2. Replace:
   - `https://YOUR-HOSTED-SNAPSHOT-URL/snapshot.json`
3. With your real GitHub Pages snapshot URL
4. Paste that HTML into the Circle `Custom HTML` block once

After that, Circle should fetch the latest snapshot automatically.
