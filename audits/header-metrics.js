const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  for (const vp of [{w:1280,h:900,name:'desktop'},{w:768,h:1024,name:'tablet'},{w:390,h:844,name:'mobile'}]){
    const page=await browser.newPage({viewport:{width:vp.w,height:vp.h}});
    await page.goto('http://localhost:4173/index.html');
    const rect=await page.evaluate(()=>document.querySelector('.site-header')?.getBoundingClientRect());
    console.log(vp.name, rect);
  }
  await browser.close();
})();
