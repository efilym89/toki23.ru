const { chromium } = require('playwright');
(async() => {
  const viewports=[{w:1280,h:900,name:'desktop'},{w:768,h:1024,name:'tablet'},{w:390,h:844,name:'mobile'}];
  for (const v of viewports) {
    const browser = await chromium.launch({headless:true});
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
    await page.goto('http://localhost:4173/index.html');
    const overflow = await page.evaluate(() => {
      const offenders=[];
      const vw = window.innerWidth;
      document.querySelectorAll('body *').forEach((el)=>{
        const rect=el.getBoundingClientRect();
        if(rect.right - vw > 1 || rect.left < -1){
          offenders.push({tag:el.tagName.toLowerCase(), className:el.className, right:rect.right, left:rect.left, width:rect.width});
        }
      });
      return {scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, offenders: offenders.slice(0,12)};
    });
    console.log(v.name, JSON.stringify(overflow, null, 2));
    await browser.close();
  }
})();
