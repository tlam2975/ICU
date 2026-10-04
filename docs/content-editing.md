# Editing ICU's content

All content lives in `public/content.json`. Edit text values, not the field names. Keep double quotes and commas valid JSON. Changes appear on GitHub Pages after committing and pushing to `main` and the Pages workflow completes.

## English and Vietnamese

The `en` and `vi` objects contain navigation, the opening scene, the band introduction, music copy, social headings, and the footer. For example, change `vi.about.title` and `vi.about.body` for the Vietnamese introduction. The visitor's chosen language follows them between the two pages.

## Add the story photos

Place the 5-10 photos in `public/images/story/`. Use simple filenames such as `01.jpg`, `02.jpg`, and `03.jpg`. In JSON, paths start at the public folder: `images/story/01.jpg`, not `public/images/story/01.jpg` and not `/images/story/01.jpg`.

Replace the empty `story.chapters` array with entries like this:

```json
"chapters": [
  {
    "id": "first-chapter",
    "image": "images/story/01.jpg",
    "width": 1600,
    "height": 1200,
    "en": {
      "eyebrow": "Your chapter label",
      "title": "Your English heading",
      "paragraphs": ["Your first paragraph.", "Your second paragraph."],
      "caption": "Your English photo caption",
      "alt": "An English description of what is in the photo"
    },
    "vi": {
      "eyebrow": "Your Vietnamese chapter label",
      "title": "Your Vietnamese heading",
      "paragraphs": ["Your first Vietnamese paragraph.", "Your second Vietnamese paragraph."],
      "caption": "Your Vietnamese photo caption",
      "alt": "A Vietnamese description of what is in the photo"
    }
  }
]
```

These example words are instructions, not band history: replace them with the real story. Add as many chapter objects as needed, separated by commas. Use the photo's actual pixel dimensions for `width` and `height` to reserve the right amount of space. Photos retain their proportions and are not cropped.

By default, photo and text alternate sides, with every third chapter showing a wide photo followed by text. Set `"layout": "wide"` or `"layout": "split"` on a chapter to choose explicitly. Omit `image` for a text-only chapter. Empty `eyebrow`, `title`, and `caption` strings are hidden. Paragraphs can contain ordinary Vietnamese accents; HTML is treated as plain text.

## Replace the opening illustration

The pixel artwork stays in the project. To show a real band photo instead, change only this setting:

```json
"introImage": {
  "src": "images/story/band.jpg",
  "width": 1600,
  "height": 1067,
  "pixelArt": false
}
```

Update `en.about.artworkAlt` and `vi.about.artworkAlt` to describe the new photo. Do not delete or overwrite `pixel-trio.png` or `pixel-guitarist.png`.

## Releases and socials

The `releases` array is displayed on `/music/`. It currently has one item, "Biết". Each item includes its title, artist, cover path or URL, image dimensions, track URL, and localized type and image description. Add new items at the beginning of the array. You can use a local cover such as `images/releases/new-cover.jpg`.

The latest-release shortcut in the menu automatically uses the first release in the array. `settings.latestTrackUrl` remains as a fallback. The Apple Music link is an artist page, not a verified link to the single. All artist and social links are in `socials`.
