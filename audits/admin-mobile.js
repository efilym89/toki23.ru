const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://localhost:4173/admin.html');
  await page.fill('input[name=login]','admin');
  await page.fill('input[name=password]','admin123');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-admin-panel]:not([hidden])');
  await page.click('[data-admin-tab="menu"]');
  await page.waitForSelector('[data-menu-form]');
  const metrics=await page.evaluate(()=>{
    const section=document.querySelector('.admin-section--split')?.getBoundingClientRect();
    const nav=document.querySelector('.admin-nav')?.getBoundingClientRect();
    const scrollWidth=document.documentElement.scrollWidth;
    return {section, nav, scrollWidth};
  });
  console.log(metrics);
  await browser.close();
})();
