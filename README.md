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

## Build for GitHub Pages

```sh
npm run build
```

Publish the contents of `dist/` at the repository's GitHub Pages URL. The build uses relative asset paths, so it works under `/ICU/` as well as at a custom domain.
