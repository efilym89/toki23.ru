const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{width:1280,height:900} });
  await page.goto('http://localhost:4173/index.html');
  const info = await page.evaluate(() => {
    const img = document.querySelector('.product-card__image');
    return {loaded: img?.complete, natural: {w: img?.naturalWidth, h: img?.naturalHeight}, src: img?.src};
  });
  console.log(info);
  await browser.close();
})();
