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
    await page.locator('.font-lab-toggle').click();
    await page.locator('[name=source]').fill('https://fonts.google.com/specimen/Lora');
    await page.locator('.font-lab-apply').click();
    await page.waitForFunction(() => document.querySelector('.font-lab-status').textContent.includes('applied'), { timeout: 25000 });
    assert.ok(await page.locator('#story-title').evaluate(element => getComputedStyle(element).fontFamily.includes('Lora')));
    await page.locator('[data-compare]').click();
    assert.ok(await page.locator('#story-title').evaluate(element => getComputedStyle(element).fontFamily.includes('Newsreader')));
    await page.locator('[data-compare]').click();
    await page.reload();
    await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--font-heading').includes('Lora'));
    await page.locator('.font-lab-toggle').click();
    await page.locator('[name=source]').fill('https://example.com/not-a-font');
    await page.locator('.font-lab-apply').click();
    assert.match(await page.locator('.font-lab-status').textContent(), /Paste a Google Fonts/);
    await page.locator('[data-lab-close]').click();
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('#social-trigger').click();
    await page.locator('.drawer-nav [data-route=music]').click();
    await page.waitForURL('**/music/?fontlab=1');
    await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--font-heading').includes('Lora'));
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.route-glow').evaluate(element => getComputedStyle(element).opacity), '0');
    await page.goBack();
    await page.waitForSelector('.font-lab-toggle');
    await page.locator('.font-lab-toggle').click();
    await page.locator('[data-reset]').click();
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--font-heading')), '');
    assert.ok(await page.locator('.font-lab-history button').count() > 0);
    assert.deepEqual(errors, []);
    console.log(width + ': all photos, cloud scroll, font loading, history, comparison, persistence, invalid URL, route transition, back navigation, reset passed.');
    await page.close();
  }
} finally { await browser.close(); }
