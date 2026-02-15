const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{width:1280,height:900} });
  await page.goto('http://localhost:4173/admin.html');
  await page.fill('input[name=login]', 'admin');
  await page.fill('input[name=password]', 'admin123');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-admin-panel]:not([hidden])');
  await page.click('[data-admin-tab="menu"]');
  await page.waitForSelector('[data-menu-form]');
  const metrics = await page.evaluate(() => {
    const toolbar = document.querySelector('.admin-toolbar')?.getBoundingClientRect();
    const form = document.querySelector('[data-menu-form]')?.getBoundingClientRect();
    const aside = document.querySelector('.admin-section--split aside')?.getBoundingClientRect();
    const section = document.querySelector('.admin-section--split')?.getBoundingClientRect();
    const tableWrap = document.querySelector('.table-wrap')?.getBoundingClientRect();
    const table = document.querySelector('.table')?.getBoundingClientRect();
    return {toolbar, form, aside, section, tableWrap, table};
  });
  console.log(metrics);
  await browser.close();
})();
