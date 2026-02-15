const { chromium } = require('playwright');
(async() => {
  const vp=[{w:768,h:1024,name:'tablet'},{w:390,h:844,name:'mobile'}];
  const browser = await chromium.launch({ headless:true });
  for (const v of vp) {
    const page = await browser.newPage({ viewport:{width:v.w,height:v.h} });
    await page.goto('http://localhost:4173/index.html');
    const boxes = await page.evaluate(() => {
      const rect = (sel) => document.querySelector(sel)?.getBoundingClientRect() || null;
      return {
        hero: rect('.hero'),
        banner: rect('.banner-grid'),
        categoryRow: rect('.category-row'),
        productsGrid: rect('.products-grid'),
        toolbar: rect('.catalog-toolbar'),
        cartFloat: rect('.cart-float'),
      };
    });
    console.log(v.name, JSON.stringify(boxes, null, 2));
  }
  await browser.close();
})();
