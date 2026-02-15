const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{width:1280,height:900} });
  await page.goto('http://localhost:4173/index.html');
  const heights = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.product-card')).map((card)=>{
      const rect = card.getBoundingClientRect();
      return {height: rect.height, name: card.querySelector('h3')?.textContent || ''};
    });
  });
  heights.sort((a,b)=>a.height-b.height);
  const min = heights[0];
  const max = heights[heights.length-1];
  console.log('count', heights.length, 'min', min, 'max', max);
  await browser.close();
})();
