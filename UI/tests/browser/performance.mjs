import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')).href : 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const evidence = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../' + (process.env.PERFORMANCE_EVIDENCE_DIR || 'docs/verification/evidence/T18/production-current'));
await fs.mkdir(evidence,{recursive:true});
const base = process.env.T16_URL || 'http://127.0.0.1:3016';
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge', headless:true});
const context = await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1}); context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(15000);
const { createRequire } = await import('node:module');const media=createRequire(import.meta.url)('../../../Server/tests/helpers/media-fixtures.cjs');
await context.route('**/fixture.wav',r=>r.fulfill({contentType:'audio/wav',body:media.wav()}));
await context.route('**/images/**',r=>r.fulfill({contentType:'image/png',body:media.png()}));
const errors=[];let searchFail=true;
const song=(id)=>({song_id:id,title:id===83?'Bài hát với tiêu đề rất dài '+'khôngngắttừ'.repeat(20):`Song ${id}`,duration:60,audio_url:'/fixture.wav',artists:[{name:'Fixture artist'}],genres:[],is_visible:true});
const send=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status<400?{data,meta:{requestId:'fixture'}}:{error:{code:'FIXTURE_ERROR',message:'Fixture server error',details:[{path:'name',code:'too_long'}]},requestId:'fixture'})});
await context.route('**/api/**',async route=>{
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
 if(req.method()==='POST' && p.includes('/favorites/'))return send(route,{liked:true});
 if(p==='/api/users/me')return send(route,{data:{user_id:7,username:'fixture',email:'fixture@example.test',role:'user'}});
 if(p==='/api/songs/search'){
 const q=u.searchParams.get('q');if(q==='A')await new Promise(r=>setTimeout(r,700));
 if(q==='fail'&&searchFail){searchFail=false;return send(route,{},500);}
 return send(route,{data:q==='empty'?[]:[{...song(q==='A'?81:82),title:q==='A'?'Result A':'Result B'}]});
 }
 if(/^\/api\/songs\/\d+$/.test(p)){const id=Number(p.split('/').at(-1)); if([401,403,404,500].includes(id))return send(route,{},id); if(id===43)await new Promise(r=>setTimeout(r,500));return send(route,{data:song(id)});}
 if(p==='/api/playlists'&&req.method()==='POST'){await new Promise(r=>setTimeout(r,300));return send(route,{},422);}
 if(p==='/api/playlists/me')return send(route,{data:[]});
 if(/^\/api\/playlists\/\d+$/.test(p)){const id=Number(p.split('/').at(-1));if([401,403,404,500].includes(id))return send(route,{},id);return send(route,{data:{playlist_id:id,user_id:7,name:`Playlist ${id}`,is_public:true,songs:id===8?[]:[song(41)]}});}
 if(p.includes('/summary'))return send(route,{averageRating:0,totalRatings:0});
 if(p.includes('/favorites/me'))return send(route,{data:[],pagination:{page:1,limit:20,total:0,totalPages:0}});
 if(p.includes('/auth/refresh'))return send(route,{},401);
 return send(route,{data:[],rating:null,liked:false});
});

try {
 const warmup=await fetch(base+'/songs/41');assert.ok(warmup.ok,'Production warmup HTTP must succeed');await warmup.arrayBuffer();
 const samples=[];
 for(let run=0;run<3;run++){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1600000/8,uploadThroughput:750000/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.addInitScript(()=>{window.__lab={cls:0,lcp:0};new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{window.__lab.lcp=l.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  await page.goto(base+'/songs/41');await page.getByRole('heading',{name:'Song 41',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1800);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Document must not overflow');
  assert.ok(await page.locator('.image-card img').evaluate(i=>i.complete&&i.naturalWidth>0),'Cover loaded');
  const font=await page.locator('i.fa-regular').first().evaluate(i=>({family:getComputedStyle(i).fontFamily,content:getComputedStyle(i,'::before').content}));
  assert.ok(font.family.includes('Font Awesome')&&font.content!=='none','Icon CSS resolved');
  if(run===0)await page.screenshot({path:path.join(evidence,'production-375.png'),fullPage:true});
  samples.push(await page.evaluate(()=>({ ...window.__lab, fontsReady:document.fonts.status, fontFamilies:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family), navigation:performance.getEntriesByType('navigation')[0].toJSON(), resources:performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize})), images:[...document.images].map(i=>({src:i.getAttribute('src'),width:i.width,height:i.height,attributeWidth:i.getAttribute('width'),attributeHeight:i.getAttribute('height')})) })));
  await page.close();
 }
 assert.deepEqual(errors,[]);
 for(const sample of samples)assert.ok(sample.cls<=0.1,'CLS must stay <=0.1 on fixture route');
 const os=await import('node:os');
 await fs.writeFile(path.join(evidence,'lab.json'),JSON.stringify({browser:browser.version(),node:process.version,platform:os.platform(),cpu:os.cpus()[0].model,memoryGB:os.totalmem()/1024**3,viewport:'375x812',cache:'disabled via CDP; server warm',network:'40ms latency, 1.6Mbps down/750Kbps up',cpuThrottle:4,route:'/songs/41',api:'synthetic intercepted API/media; network throttle applies primarily to application assets',unexpectedPageErrors:errors,samples},null,2));
 console.log('PASS production lab: 3 runs');
} finally {await browser.close();}
