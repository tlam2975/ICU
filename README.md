# ICU · innerchild.universe

A bilingual website for ICU, built with Vite and Three.js.

- `/`: the glowing universe, cloud descent, and a meadow photo story.
- `/music/`: releases and all social links, with a starry universe without the planet, a subtle garland of pastel notes that scrolls with the page, and a bright cream card matching the introduction text. The page ends with the social directory without a repeated footer.

## Run locally

```sh
npm ci
npm run dev
```

## Edit the site

- Change English and Vietnamese copy, social links, and the instrumental path in `public/content.json`.
- Add photos to `public/images/story/`, then add entries to `story.chapters` in the JSON. Chapters support an image, a heading, multiple paragraphs, and a caption in both languages. The five supplied band photos are included as optimized WebP images.
- The opening sky uses four night photos in `public/images/night/`; the band introduction uses a fifth photo from the same shoot. The daylight photos in `public/images/story/` are reserved for the meadow chapters, so the two sections do not repeat images. Change `story.introImage` to replace the introduction photo, keep `pixelArt` set to `false`, and update `en.about.artworkAlt` and `vi.about.artworkAlt`. The original `public/images/main.webp` is preserved.
- The large ICU lettering is custom vector artwork in `public/images/icu-artwork.svg`. Its sizing and the buttons' raised/pressed states live in `src/refinements.css`; reduced motion removes their movement.
- Music-page typography, poster framing, and background notes live in `src/music.css`. The ambient mode in `src/universe.js` reuses the opening sky without its photos or interactive paper fragments.
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

The Music link uses a warm expanding glow across the existing two HTML routes. Reduced motion skips this effect and uses a shorter, static cloud section. Normal browser navigation, direct URLs, modified clicks, and the back button remain available. Audio remains controlled separately on each page.
