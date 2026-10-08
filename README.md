# ICU · innerchild.universe

A bilingual website for ICU, built with Vite and Three.js.

- `/`: the glowing universe, cloud descent, and a meadow photo story.
- `/music/`: releases and all social links.

## Run locally

```sh
npm ci
npm run dev
```

## Edit the site

- Change English and Vietnamese copy, social links, and the instrumental path in `public/content.json`.
- Add photos to `public/images/story/`, then add entries to `story.chapters` in the JSON. Chapters support an image, a heading, multiple paragraphs, and a caption in both languages. The five supplied band photos are included as optimized WebP images.
- The band introduction uses an optimized copy of `assets/main.png`. Change `story.introImage` to replace it. Keep `pixelArt` set to `false` for photos and update `en.about.artworkAlt` and `vi.about.artworkAlt`.
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

## Font lab

Open `http://127.0.0.1:5173/?fontlab=1` while running the dev server. The **Aa Font lab** button is in the bottom right. The panel is also available automatically during local development. In a production build it only appears when `?fontlab=1` is present; ordinary visitors keep the default fonts.

Choose Headings, Labels & navigation, or Body text. Enter a family name (for example `Lora`), a Google Fonts specimen URL, or a `fonts.googleapis.com/css2` URL, choose a weight, and press Preview font. A CSS URL supplies its own font styles; its first family is used. Fonts need an internet connection and must support the selected weight. Check both EN and VI for language coverage.

Recent fonts are saved as reusable buttons. Compare original toggles the default fonts without losing your preview. Reset all restores the default fonts while keeping recent choices. Copy choices exports your current choices as text. Your choices stay in this browser and follow links between the two pages while in font lab mode; they do not change the public defaults.

The Music link uses a warm expanding glow across the existing two HTML routes. Reduced motion skips this effect and uses a shorter, static cloud section. Normal browser navigation, direct URLs, modified clicks, and the back button remain available. Audio remains controlled separately on each page.
