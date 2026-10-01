import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
});

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
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(siteUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.floating-note');
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
    await page.close();
  }

  const reducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reducedPage.goto(siteUrl, { waitUntil: 'domcontentloaded' });
  await reducedPage.waitForSelector('.fragment-note');
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
}
