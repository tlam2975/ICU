# ICU · innerchild.universe

An interactive bilingual landing page for ICU, built with Vite and Three.js.

## Run locally

```sh
npm ci
npm run dev
```

## Edit the site

- Change English and Vietnamese copy, social links, and the instrumental path in `public/content.json`.
- Replace `public/images/pixel-guitarist.png` when the group's own artwork is ready.
- The instrumental file is `public/audio/biet_saubienkaraoke1.mp3`.

## Deploy to GitHub Pages

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` builds the Vite site and deploys `dist/` whenever `main` changes.

To build locally:

```sh
npm run build
```
