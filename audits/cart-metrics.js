const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://localhost:4173/index.html');
  await page.click('[data-add-product]');
  await page.click('[data-open-cart]');
  await page.waitForSelector('[data-cart-drawer]:not([hidden])');
  const info=await page.evaluate(()=>{
    const drawer=document.querySelector('.cart-drawer__panel');
    const list=document.querySelector('.cart-list');
    const form=document.querySelector('[data-checkout-form]');
    const listRect=list?.getBoundingClientRect();
    const formRect=form?.getBoundingClientRect();
    const totalRect=document.querySelector('.cart-total-row')?.getBoundingClientRect();
    return {drawerRect: drawer?.getBoundingClientRect(), listRect, formRect, totalRect, viewport:{height: window.innerHeight}};
  });
  console.log(info);
  await browser.close();
})();
