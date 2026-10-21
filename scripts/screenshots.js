'use strict';
/**
 * Browser checks and the screenshots used in README.
 * Uses playwright-core with the system Chrome. Travel data comes from the running server.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const PORT = process.env.SCREENSHOT_PORT || '8787';
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MENU = path.join(ROOT, 'samples', 'menu.jpg');
const SAMPLES = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'photos', 'samples.json'), 'utf8')).samples;

function waitFor(child, extra) {
  return new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('server did not start\n' + log.slice(-500))); }, 20000);
    const on = (b) => {
      log += b.toString();
      extra.push(b.toString());
      if (log.includes('http://localhost:' + PORT)) { clearTimeout(timer); resolve(); }
    };
    child.stdout.on('data', on);
    child.stderr.on('data', on);
    child.on('exit', (code) => { if (code) reject(new Error('server exited ' + code)); });
  });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', path.relative(ROOT, file));
}

// full-page captures start from the top so the sticky header and tabs sit where they belong
const toTop = (page) => page.evaluate(() => window.scrollTo(0, 0));
// bring a tab panel up under the sticky header and tab bar
const toPanel = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 150); }, sel);

(async () => {
  if (!fs.existsSync(CHROME)) throw new Error('Chrome not found at ' + CHROME);
  if (!fs.existsSync(MENU)) throw new Error('Missing samples/menu.jpg');
  fs.mkdirSync(OUT, { recursive: true });
  const logs = [];
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT, MOCK_LLM: process.env.MOCK_LLM || '', FLYAI_OFFLINE: process.env.FLYAI_OFFLINE || '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitFor(server, logs);
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(150000);

    await page.goto(BASE + '/?lang=ja', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('h1') && document.querySelector('h1').textContent.includes('中国旅行'));
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (homeOverflow > 2) throw new Error('desktop home overflows by ' + homeOverflow);
    await shot(page, '01-home-ja-desktop.png');

    await page.goto(BASE + '/?demo=1&lang=ja', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.planhead h2');
    await page.waitForSelector('a.book[href*="feizhu.com"]');
    const flightText = await page.locator('.day').first().innerText();
    if (!/[A-Z0-9]{2}\d{2,}/.test(flightText)) throw new Error('day 1 has no flight number:\n' + flightText.slice(0, 300));
    if (!/¥/.test(flightText)) throw new Error('day 1 has no price');
    const errOn = await page.locator('#error').isVisible();
    if (errOn) throw new Error('error banner: ' + await page.locator('#error').innerText());
    await page.waitForFunction(() => [...document.images].every((im) => im.complete));
    const deskOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (deskOverflow > 2) throw new Error('desktop itinerary overflows by ' + deskOverflow);
    await toTop(page);
    await page.screenshot({ path: path.join(OUT, '02-itinerary-desktop.png'), fullPage: true });
    console.log('saved docs/screenshots/02-itinerary-desktop.png');

    for (let i = 0; i < 4; i++) {
      await page.locator('#tabs button').nth(i).click();
      const id = ['plan', 'cards', 'photo', 'tips'][i];
      const visible = await page.locator('#tab-' + id).isVisible();
      if (!visible) throw new Error('tab ' + id + ' not visible');
      const text = await page.locator('#tab-' + id).innerText();
      if (text.trim().length < 8) throw new Error('tab ' + id + ' is empty');
    }
    await page.locator('#tabs button').nth(1).click();
    await toPanel(page, '#tab-cards');
    await shot(page, '05-cards-tab.png');

    await page.locator('#tabs button').nth(3).click();
    const tipLinks = await page.locator('#tab-tips a').count();
    if (tipLinks < 1) throw new Error('tips tab has no source links');
    await toPanel(page, '#tab-tips');
    await shot(page, '07-tips.png');

    await page.locator('#tabs button').nth(2).click();
    // your own photo: the picker accepts it and shows a thumbnail (the model is not called here)
    await page.setInputFiles('#ph', MENU);
    await page.waitForSelector('#phprev img');
    // a sample shows its recorded Qwen answer, so this step makes no model call either
    if (!SAMPLES.some((x) => x.id === 'menu' && x.results.ja)) throw new Error('no recorded ja answer for the menu sample: run node scripts/record-photos.js --lang ja');
    await page.locator('[data-sample="menu"]').click();
    await page.waitForSelector('#phout .ph-title');
    const photoText = await page.locator('#phout').innerText();
    if (!/qwen/i.test(photoText) || !/[\u4e00-\u9fff]/.test(photoText)) throw new Error('recorded photo answer is missing its model note or Chinese text');
    const photoOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (photoOverflow > 2) throw new Error('photo tab overflows by ' + photoOverflow);
    await toPanel(page, '#tab-photo');
    await shot(page, '06-photo-translate.png');

    await page.locator('#tabs button').nth(0).click();
    await page.locator('#sources summary').click();
    await page.locator('#sources').scrollIntoViewIfNeeded();
    const foot = await page.locator('footer.foot').innerText();
    if (!/fly\.ai real-time results/.test(foot)) throw new Error('missing fly.ai attribution');
    if (!/flyai queries/.test(foot)) throw new Error('missing flyai query log');
    // experience mode carries a systemMessage with a markdown link; with a formal key it is empty
    const sysLink = await page.evaluate(() => /\]\(https:\/\/flyai\.open\.fliggy\.com/.test((plan && plan.data.systemMessage) || ''));
    if (sysLink && await page.locator('#sources a[href*="flyai.open.fliggy.com"]').count() < 1) throw new Error('system message link was not rendered');
    await page.locator('footer.foot').screenshot({ path: path.join(OUT, '08-flyai-sources.png') });
    console.log('saved docs/screenshots/08-flyai-sources.png');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.setDefaultTimeout(150000);
    await mobile.goto(BASE + '/?demo=1&lang=ja', { waitUntil: 'domcontentloaded' });
    await mobile.waitForSelector('.planhead h2');
    await mobile.waitForSelector('a.book[href*="feizhu.com"]');
    await mobile.waitForFunction(() => [...document.images].every((im) => im.complete));
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 2) throw new Error('mobile itinerary overflows by ' + overflow);
    await toTop(mobile);
    await mobile.screenshot({ path: path.join(OUT, '03-itinerary-mobile.png'), fullPage: true });
    console.log('saved docs/screenshots/03-itinerary-mobile.png');

    const taxi = mobile.locator('[data-card="d0-hotel:0"]');
    if (await taxi.count()) await taxi.first().click();
    else await mobile.locator('.cardbtn').first().click();
    await mobile.waitForSelector('#modal:not([hidden])');
    const zh = await mobile.locator('#m-zh').innerText();
    if (!/[\u4e00-\u9fff]/.test(zh) || zh.length < 8) throw new Error('card has no Chinese text');
    await mobile.screenshot({ path: path.join(OUT, '04-card-fullscreen-mobile.png') });
    console.log('saved docs/screenshots/04-card-fullscreen-mobile.png');
    await mobile.locator('#m-rot').click();
    const rotated = await mobile.locator('#m-zh').evaluate((el) => el.classList.contains('rot'));
    if (!rotated) throw new Error('rotate button did not rotate the card');
    const sheetTurned = await mobile.locator('#sheet').evaluate((el) => getComputedStyle(el).transform !== 'none');
    if (sheetTurned) throw new Error('rotate turned the whole sheet');
    const still = await mobile.locator('#m-zh').innerText();
    if (still !== zh) throw new Error('rotate changed the card text');
    await mobile.locator('#m-close').click();
    if (await mobile.locator('#modal').isVisible()) throw new Error('card modal stayed open');
    await mobile.locator('#tabs button').nth(1).click();
    await mobile.locator('.pcard').first().click();
    await mobile.waitForSelector('#modal:not([hidden])');
    await mobile.locator('#m-close').click();

    await browser.close();
    console.log('browser checks ok');
  } finally {
    server.kill();
  }
})().catch((e) => { console.error(e && e.stack ? e.message : e); process.exit(1); });
