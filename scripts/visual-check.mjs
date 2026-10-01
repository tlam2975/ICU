import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
});

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 375, height: 667 }
];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.floating-note');
    await page.waitForTimeout(400);

    const measurements = await page.evaluate(() => {
      const canvas = document.querySelector('#universe');
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const heading = document.querySelector('.hero-content').getBoundingClientRect();
      const notes = [...document.querySelectorAll('.floating-note:not([hidden])')].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent.trim(),
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
        notes,
        notesOverHeading: notes.some((note) =>
          note.x < heading.right &&
          note.x + note.width > heading.left &&
          note.y < heading.bottom &&
          note.y + note.height > heading.top
        ),
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth
      };
    });

    await page.screenshot({ path: '/private/tmp/icu-' + viewport.name + '.png', fullPage: true });
    assert.equal(errors.length, 0, viewport.name + ' page errors: ' + errors.join(', '));
    assert.ok(measurements.notes.length >= 4, viewport.name + ' has too few visible notes');
    assert.ok(measurements.canvasWidth > 0 && measurements.canvasHeight > 0, viewport.name + ' canvas has no size');
    assert.ok(measurements.canvasPixelsLit > 0, viewport.name + ' 3D canvas is blank');
    assert.equal(measurements.notesOverHeading, false, viewport.name + ' notes overlap heading');
    assert.ok(measurements.horizontalOverflow <= 1, viewport.name + ' has horizontal overflow');
    console.log(JSON.stringify({ viewport: viewport.name, ...measurements }));

    await page.locator('[data-lang="vi"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
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
} finally {
  await browser.close();
}
