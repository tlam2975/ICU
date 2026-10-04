import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

let siteUrl = process.env.SITE_URL;
let previewServer;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
});

async function startPagesPreview() {
  const root = fileURLToPath(new URL('../dist/', import.meta.url));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff' };
  // A project-site prefix and real directory entries: no SPA fallback.
  previewServer = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith('/ICU/')) throw new Error('Outside project');
      let path = resolve(root, pathname.slice('/ICU/'.length));
      if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) throw new Error('Outside build');
      if ((await stat(path)).isDirectory()) {
        if (!pathname.endsWith('/')) {
          response.writeHead(301, { Location: pathname + '/' });
          response.end();
          return;
        }
        path = resolve(path, 'index.html');
      }
      response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
      response.end(await readFile(path));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((done) => previewServer.listen(0, '127.0.0.1', done));
  return 'http://127.0.0.1:' + previewServer.address().port + '/ICU/';
}

async function waitForSky(page) {
  await page.waitForFunction(() => document.querySelector('.floating-note')?.style.left.endsWith('px'));
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 375, height: 667 }
];

async function canvasSignature(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#universe');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 4) {
      hash = Math.imul(hash ^ pixels[index], 16777619);
      hash = Math.imul(hash ^ pixels[index + 1], 16777619);
      hash = Math.imul(hash ^ pixels[index + 2], 16777619);
    }
    return hash >>> 0;
  });
}

try {
  if (!siteUrl) siteUrl = await startPagesPreview();
  const musicUrl = new URL('music/', siteUrl).href;
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    const failedAssets = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (new URL(response.url()).origin === new URL(siteUrl).origin && response.status() >= 400) failedAssets.push(response.url());
    });
    await page.goto(siteUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.floating-note');
    await waitForSky(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    const measurements = await page.evaluate(() => {
      const canvas = document.querySelector('#universe');
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const heading = document.querySelector('.hero-content').getBoundingClientRect();
      const heroTitle = document.querySelector('.hero-content h1').getBoundingClientRect();
      const eyebrow = document.querySelector('.hero-eyebrow').getBoundingClientRect();
      const name = document.querySelector('.hero-name').getBoundingClientRect();
      const notes = [...document.querySelectorAll('.floating-note:not([hidden])')].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent.trim(),
          type: element.classList.contains('fragment-note') ? 'fragment' : 'music',
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      if (gl) gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 15) lit += 1;
      }
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        canvasPixelsLit: lit,
        heroHeight: Math.round(hero.height),
        heading: {
          x: Math.round(heading.x),
          y: Math.round(heading.y),
          width: Math.round(heading.width),
          height: Math.round(heading.height)
        },
        heroTitleLeft: Math.round(heroTitle.left),
        titleGapAbove: Math.round(heroTitle.top - eyebrow.bottom),
        titleGapBelow: Math.round(name.top - heroTitle.bottom),
        notes,
        notesOverHeading: notes.some((note) =>
          note.x < heading.x + heading.width &&
          note.x + note.width > heading.x &&
          note.y < heading.y + heading.height &&
          note.y + note.height > heading.y
        ),
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth
      };
    });

    await page.screenshot({ path: '/private/tmp/icu-' + viewport.name + '.png', fullPage: true });
    assert.equal(errors.length, 0, viewport.name + ' page errors: ' + errors.join(', '));
    assert.equal(await page.locator('.release-entry').count(), 0, 'Releases still appear on the story page');
    assert.equal(await page.locator('#story-intro-image').evaluate((image) => image.complete && image.naturalWidth > 0), true, 'Temporary trio illustration is missing');
    assert.ok(measurements.notes.length >= 4, viewport.name + ' has too few visible notes');
    assert.ok(measurements.notes.filter((note) => note.type === 'music').every((note) => /^[♪♫♩♬]$/.test(note.text)), viewport.name + ' has an invalid music symbol');
    assert.ok(measurements.notes.some((note) => note.type === 'fragment' && note.text.length > 0), viewport.name + ' has no paper fragment');
    assert.ok(Math.abs(measurements.heroHeight - viewport.height) <= 1, viewport.name + ' hero does not fill the viewport');
    assert.ok(measurements.titleGapAbove >= 18 && measurements.titleGapBelow >= 18, viewport.name + ' hero copy is too tightly spaced');
    assert.ok(measurements.canvasWidth > 0 && measurements.canvasHeight > 0, viewport.name + ' canvas has no size');
    assert.ok(measurements.canvasPixelsLit > 0, viewport.name + ' 3D canvas is blank');
    assert.equal(measurements.notesOverHeading, false, viewport.name + ' notes overlap heading');
    assert.ok(measurements.heroTitleLeft >= 0, viewport.name + ' hero title is clipped on the left');
    assert.ok(measurements.horizontalOverflow <= 1, viewport.name + ' has horizontal overflow');
    console.log(JSON.stringify({ viewport: viewport.name, ...measurements }));

    const initialFrame = await canvasSignature(page);
    await page.waitForTimeout(350);
    assert.notEqual(await canvasSignature(page), initialFrame, viewport.name + ' 3D scene is not moving');
    if (viewport.name === 'desktop') {
      await page.mouse.move(1350, 500, { steps: 5 });
      await page.waitForFunction(() => parseFloat(document.querySelector('.universe-flow').style.getPropertyValue('--character-tilt')) > 0.5);
      const tilt = await page.evaluate(() => document.querySelector('.universe-flow').style.getPropertyValue('--character-tilt'));
      assert.ok(parseFloat(tilt) > 0.5, 'Pointer movement does not change scene depth');
      await page.mouse.move(0, 0);
    }
    await page.evaluate(() => scrollTo({ top: innerHeight * 0.7, behavior: 'instant' }));
    await page.waitForTimeout(300);
    assert.ok(Math.abs(await page.locator('.universe-stage').evaluate((element) => element.getBoundingClientRect().top)) < 1, viewport.name + ' shared sky is not sticky');
    await page.screenshot({ path: '/private/tmp/icu-' + viewport.name + '-transition.png' });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);

    await page.locator('[data-lang="vi"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
    const vietnameseOverlap = await page.evaluate(() => {
      const heading = document.querySelector('.hero-content').getBoundingClientRect();
      return [...document.querySelectorAll('.floating-note:not([hidden])')].some((element) => {
        const note = element.getBoundingClientRect();
        return note.left < heading.right && note.right > heading.left && note.top < heading.bottom && note.bottom > heading.top;
      });
    });
    assert.equal(vietnameseOverlap, false, viewport.name + ' Vietnamese copy overlaps a floating fragment');
    await page.screenshot({ path: '/private/tmp/icu-' + viewport.name + '-vi.png', fullPage: true });
    await page.locator('.floating-note:not([hidden])').first().click({ force: true });
    assert.equal(await page.locator('#note-dialog').evaluate((element) => element.open), true);
    await page.locator('#note-next').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#note-dialog').evaluate((element) => element.open), false);
    await page.locator('#social-trigger').click();
    assert.equal(await page.locator('#social-links a').count(), 7);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#social-dialog').evaluate((element) => element.open), false);
    await page.locator('#audio-toggle').click();
    assert.equal(await page.locator('#instrumental').evaluate((element) => element.paused), false);
    await page.locator('#audio-toggle').click();
    assert.equal(await page.locator('#instrumental').evaluate((element) => element.paused), true);

    await page.locator('#social-trigger').click();
    await page.locator('.drawer-nav [data-route="music"]').click();
    await page.waitForURL(musicUrl);
    await page.waitForSelector('.release-entry');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'), 'vi', 'Language was lost between routes');
    assert.equal(await page.locator('.release-entry').count(), 1, 'Expected only the current release');
    assert.equal(await page.locator('.release-copy h2').textContent(), 'Biết');
    assert.equal(await page.locator('.social-directory a').count(), 7);
    assert.equal(await page.locator('.site-nav [aria-current="page"]').getAttribute('data-route'), 'music');
    assert.equal(await page.locator('#universe').count(), 0, 'Music page still initializes the story scene');
    assert.equal(await page.locator('#instrumental').getAttribute('src'), new URL('audio/biet_saubienkaraoke1.mp3', siteUrl).href);
    await page.waitForFunction(() => document.querySelector('.release-artwork img').naturalWidth > 0);
    await page.screenshot({ path: '/private/tmp/icu-music-' + viewport.name + '-vi.png', fullPage: true });
    await page.locator('[data-lang="en"]').click();
    assert.equal(await page.locator('#music-title').textContent(), 'Music');
    assert.ok((await page.locator('.release-meta').textContent()).includes('Single'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), viewport.name + ' music page overflows');
    await page.screenshot({ path: '/private/tmp/icu-music-' + viewport.name + '.png', fullPage: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.release-entry');
    assert.equal(await page.locator('#music-title').textContent(), 'Music', 'Music route failed on reload');
    await page.locator('#audio-toggle').click();
    assert.equal(await page.locator('#instrumental').evaluate((element) => element.paused), false, 'Audio path is broken on the nested route');
    await page.locator('#audio-toggle').click();
    await page.locator('#social-trigger').click();
    await page.locator('.drawer-nav [data-route="story"]').click();
    await page.waitForURL(siteUrl);
    await waitForSky(page);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(errors.length, 0, viewport.name + ' route errors: ' + errors.join(', '));
    assert.deepEqual(failedAssets, [], viewport.name + ' missing assets');
    console.log(viewport.name + ': both routes, direct reload, social links, cover artwork, language persistence, and nested audio passed.');
    await page.close();
  }

  const directPage = await browser.newPage();
  await directPage.goto(musicUrl.replace(/\/$/, ''), { waitUntil: 'domcontentloaded' });
  await directPage.waitForSelector('.release-entry');
  assert.equal(directPage.url(), musicUrl, 'Directory URL was not canonicalized');
  await directPage.goto(new URL('music/index.html', siteUrl).href, { waitUntil: 'domcontentloaded' });
  await directPage.waitForSelector('.release-entry');
  assert.equal(await directPage.locator('.social-directory a').count(), 7, 'Direct HTML entry is broken');
  await directPage.close();

  for (const viewport of [viewports[0], viewports[2]]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/content.json', async (route) => {
      const response = await route.fetch();
      const fixture = await response.json();
      fixture.story.introImage.pixelArt = false;
      fixture.story.chapters = Array.from({ length: 10 }, (_, index) => ({
        id: 'test-chapter-' + (index + 1),
        image: 'images/pixel-trio.png',
        width: 1536,
        height: 1024,
        en: { title: 'Chapter ' + (index + 1), paragraphs: ['English story paragraph.', 'Another paragraph.'], alt: 'Test photo', caption: 'English caption' },
        vi: { title: 'Chương ' + (index + 1), paragraphs: ['Đoạn chuyện bằng tiếng Việt.', 'Một đoạn nữa.'], alt: 'Ảnh thử', caption: 'Chú thích tiếng Việt' }
      }));
      await route.fulfill({ response, json: fixture });
    });
    await page.goto(siteUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.story-chapter');
    await waitForSky(page);
    assert.equal(await page.locator('.story-chapter').count(), 10);
    assert.equal(await page.locator('.story-photo img').count(), 10);
    assert.equal(await page.locator('.story-paragraphs p').count(), 20);
    assert.equal(await page.locator('#story-intro-image').getAttribute('class'), 'intro-photo');
    await page.locator('[data-lang="vi"]').click();
    assert.equal(await page.locator('.story-chapter h2').last().textContent(), 'Chương 10');
    for (let index = 0; index < 10; index += 1) {
      await page.locator('.story-photo img').nth(index).evaluate((image) => image.scrollIntoView({ behavior: 'instant' }));
      await page.waitForFunction((index) => {
        const image = document.querySelectorAll('.story-photo img')[index];
        return image.complete && image.naturalWidth > 0;
      }, index);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Ten photo chapters overflow');
    await page.screenshot({ path: '/private/tmp/icu-story-chapters-' + viewport.name + '.png', fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Ten bilingual photo chapters and configurable intro photo passed on desktop/mobile.');

  const reducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reducedPage.goto(siteUrl, { waitUntil: 'domcontentloaded' });
  await reducedPage.waitForSelector('.fragment-note');
  await waitForSky(reducedPage);
  const staticFrame = await canvasSignature(reducedPage);
  const staticTransform = await reducedPage.locator('.fragment-note').first().evaluate((element) => element.style.transform);
  await reducedPage.mouse.move(350, 500);
  await reducedPage.waitForTimeout(400);
  assert.equal(await canvasSignature(reducedPage), staticFrame, 'Reduced-motion sky is animated');
  assert.equal(await reducedPage.locator('.fragment-note').first().evaluate((element) => element.style.transform), staticTransform, 'Reduced-motion fragment moves');
  await reducedPage.locator('.fragment-note').first().click();
  assert.equal(await reducedPage.locator('#note-dialog').evaluate((element) => element.open), true);
  await reducedPage.close();
  console.log('Animation, pointer depth, sticky transitions, and reduced motion passed.');
} finally {
  await browser.close();
  if (previewServer) await new Promise((done) => previewServer.close(done));
}
