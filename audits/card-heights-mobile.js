const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{width:390,height:844} });
  await page.goto('http://localhost:4173/index.html');
  const heights = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.product-card')).map((card)=>{
      const rect = card.getBoundingClientRect();
      return rect.height;
    });
  });
  console.log({min: Math.min(...heights), max: Math.max(...heights)});
  await browser.close();
})();
