const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const w = parseInt(process.argv[4] || '1440', 10);
  const h = parseInt(process.argv[5] || '900', 10);
  await page.setViewportSize({ width: w, height: h });
  const url = process.argv[2];
  const out = process.argv[3];
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.key-login-columns', { timeout: 15000 });
  await page.waitForTimeout(600);
  const scrollInfo = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    overflows: document.documentElement.scrollHeight > window.innerHeight
  }));
  await page.screenshot({ path: out, fullPage: false });
  console.log(JSON.stringify(scrollInfo, null, 2));
  await browser.close();
})();
