const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:4173/index.html');
  const boxes = await page.evaluate(() => {
    const search = document.querySelector('[data-search]')?.getBoundingClientRect();
    const checkbox = document.querySelector('.catalog-toolbar .inline-checkbox')?.getBoundingClientRect();
    const hero = document.querySelector('.hero')?.getBoundingClientRect();
    const banner = document.querySelector('.banner-grid')?.getBoundingClientRect();
    const categoryRow = document.querySelector('.category-row')?.getBoundingClientRect();
    const productsGrid = document.querySelector('.products-grid')?.getBoundingClientRect();
    const pager = document.querySelector('.pager-wrap')?.getBoundingClientRect();
    return {search, checkbox, hero, banner, categoryRow, productsGrid, pager};
  });
  console.log(JSON.stringify(boxes, null, 2));
  await browser.close();
})();
