const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{width:390,height:844} });
  await page.goto('http://localhost:4173/index.html');
  await page.click('.product-card');
  await page.waitForSelector('[data-product-modal]:not([hidden])');
  await page.waitForTimeout(2000);
  const sizes = await page.evaluate(() => {
    const img = document.querySelector('[data-product-image]');
    const loaded = img?.complete && img?.naturalWidth > 0;
    const rect = img?.getBoundingClientRect();
    return {loaded, rect};
  });
  console.log(sizes);
  await browser.close();
})();
