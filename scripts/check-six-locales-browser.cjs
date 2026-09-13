const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const baseUrl = process.env.SIX_LOCALES_BASE_URL || 'http://localhost:3106';
(async () => {
  const browser = await chromium.launch({headless:true});
  const results=[];
  for(const width of [320,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    for(const locale of ['fr','en','es','de','it','nl']) {
      const prefix=locale==='fr'?'':`/${locale}`;
      const paths=locale==='fr'?['','/aide','/confidentialite','/cgu','/supprimer-mon-compte','/creer-des-visites','/connexion','/catalogue']:['','/help','/privacy','/terms','/delete-account','/create-tours','/sign-in','/catalogue'];
      for(const path of paths) {
        errors.length=0;
        const response=await page.goto(`${baseUrl}${prefix}${path}`,{waitUntil:'domcontentloaded',timeout:180000});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => !!document.querySelector('h1'));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const data=await page.evaluate(()=>({lang:document.documentElement.lang,title:document.title,h1:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,manifest:document.querySelector('link[rel=manifest]')?.getAttribute('href')}));
        const row={width,locale,path:prefix+path,status:response.status(),...data,errors:[...errors]};results.push(row);console.log(JSON.stringify(row));
      }
    }
    await page.close();
  }
  fs.writeFileSync('.six-locales-browser-results.json',JSON.stringify(results,null,2));
  await browser.close();
  if(results.some(r=>r.status!==200||r.lang!==r.locale||r.overflow||r.errors.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
