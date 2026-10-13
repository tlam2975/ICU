import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const base = process.env.SITE_URL || 'http://127.0.0.1:5173/';
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '?fontlab=1');
    assert.equal(await page.locator('.font-lab').count(), 0, 'Staging font lab is still available');
    await page.waitForSelector('.story-photo img');
    assert.equal(await page.locator('.story-photo img').count(), 5);
    for (const photo of await page.locator('.story-photo img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(image => image.decode());
    }
    await page.locator('#story').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/private/tmp/icu-updated-' + width + '.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.evaluate(() => scrollTo({ top: document.querySelector('.cloud-descent').offsetTop - innerHeight * .35, behavior: 'instant' }));
    await page.waitForTimeout(100);
    const start = await page.locator('.cloud-descent').evaluate(element => Number(element.style.getPropertyValue('--fall')));
    await page.screenshot({ path: '/private/tmp/icu-clouds-' + width + '.png' });
    await page.evaluate(() => scrollBy({ top: innerHeight * .8, behavior: 'instant' }));
    await page.waitForTimeout(100);
    assert.ok(await page.locator('.cloud-descent').evaluate(element => Number(element.style.getPropertyValue('--fall'))) > start);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('#social-trigger').click();
    await page.locator('.drawer-nav [data-route=music]').click();
    await page.waitForURL('**/music/');
    await page.waitForSelector('.release-entry');
    assert.equal(await page.locator('.font-lab').count(), 0);
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.route-glow').evaluate(element => getComputedStyle(element).opacity), '0');
    await page.goBack();
    await page.waitForSelector('.story-photo img');
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--font-heading')), '');
    assert.deepEqual(errors, []);
    console.log(width + ': all photos, cloud scroll, staging tool removal, route transition, and back navigation passed.');
    await page.close();
  }
} finally { await browser.close(); }
