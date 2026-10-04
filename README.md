# ICU · innerchild.universe

A bilingual website for ICU, built with Vite and Three.js.

- `/`: the band's story, floating musical notes, and photo chapters.
- `/music/`: releases and all social links.

## Run locally

```sh
npm ci
npm run dev
```

## Edit the site

- Change English and Vietnamese copy, social links, and the instrumental path in `public/content.json`.
- Add photos to `public/images/story/`, then add entries to `story.chapters` in the JSON. Chapters support an image, a heading, multiple paragraphs, and a caption in both languages. No sample band history is published while the real stories and photos are pending.
- Change `story.introImage` to use a real group photo. Keep `pixelArt` set to `false` for photos and update `en.about.artworkAlt` and `vi.about.artworkAlt`.
- The original `public/images/pixel-guitarist.png` and `public/images/pixel-trio.png` are preserved. There is no need to overwrite either file.
- The `releases` array currently contains only "Biết", with its official Spotify artwork and track URL. Add new releases to this array, newest first.
- The instrumental file is `public/audio/biet_saubienkaraoke1.mp3`.

See [the content editing guide](docs/content-editing.md) for copy-and-paste JSON examples.

## Deploy to GitHub Pages

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` builds the Vite site and deploys `dist/` whenever `main` changes.

To build locally:

```sh
npm run build
```

Both HTML entries are built, including `dist/music/index.html`. Asset URLs are relative, and the content JSON and audio are resolved from the site root, so direct visits to `/ICU/music/` work without an SPA fallback or custom domain.

Run the browser checks after building:

```sh
npm run test:site
```

The checks serve `dist/` under `/ICU/` with no SPA fallback and cover both routes, English/Vietnamese, mobile layouts, ten photo chapters, audio, and the 3D scene. They use the installed Google Chrome on macOS; set `CHROME_PATH` for another installation. Set `SITE_URL` to check an already-running deployment instead.
