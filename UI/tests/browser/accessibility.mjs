import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')).href : 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const evidence = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../'+(process.env.ACCESSIBILITY_EVIDENCE_DIR || 'docs/verification/evidence/T17'));
await fs.mkdir(evidence,{recursive:true});
const base = process.env.T16_URL || 'http://127.0.0.1:3016';
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge', headless:true});
const context = await browser.newContext(); context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(15000);
const { createRequire } = await import('node:module');const media=createRequire(import.meta.url)('../../../Server/tests/helpers/media-fixtures.cjs');
await context.route('**/fixture.wav',r=>r.fulfill({contentType:'audio/wav',body:media.wav()}));
await context.route('**/images/**',r=>r.fulfill({contentType:'image/png',body:media.png()}));
const errors=[];const layouts=[];let posts=0,searchFail=true;
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
 if(p==='/api/playlists'&&req.method()==='POST'){posts++;await new Promise(r=>setTimeout(r,300));return send(route,{},422);}
 if(p==='/api/playlists/me')return send(route,{data:[]});
 if(/^\/api\/playlists\/\d+$/.test(p)){const id=Number(p.split('/').at(-1));if([401,403,404,500].includes(id))return send(route,{},id);return send(route,{data:{playlist_id:id,user_id:7,name:`Playlist ${id}`,is_public:true,songs:id===8?[]:[song(41)]}});}
 if(p.includes('/summary'))return send(route,{averageRating:0,totalRatings:0});
 if(p.includes('/favorites/me'))return send(route,{data:[],pagination:{page:1,limit:20,total:0,totalPages:0}});
 if(p.includes('/auth/refresh'))return send(route,{},401);
 return send(route,{data:[],rating:null,liked:false});
});
async function tabTo(page,locator){for(let i=0;i<100;i++){if(await locator.evaluate(n=>n===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Control unreachable by Tab');}
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
try{
console.log('stage songs'); const p=await context.newPage(); await p.goto(base+'/songs/41');await p.getByRole('heading',{name:'Song 41',exact:true}).waitFor();
const other=await context.newPage();await other.goto(base+'/songs/42');await other.getByRole('heading',{name:'Song 42',exact:true}).waitFor();assert.equal(await p.getByRole('heading',{name:'Song 41',exact:true}).count(),1);
await other.goto(base+'/DetailSong?track=42');await other.getByRole('heading',{name:'Song 42',exact:true}).waitFor();assert.equal(new URL(other.url()).pathname,'/songs/42'); console.log('stage playlist'); await other.goto(base+'/playlists/7');await other.getByRole('heading',{name:'Playlist 7',exact:true}).waitFor();assert.equal(await other.getByRole('link',{name:'Song 41',exact:true}).getAttribute('href'),'/songs/41');
await other.goto(base+'/playlists/8');await other.getByText('Playlist chưa có bài hát.').waitFor();
console.log('stage search'); const input=p.getByRole('textbox',{name:'Tìm bài hát'});await input.fill('A');await p.waitForTimeout(350);await input.fill('B');await p.getByText('Đang tìm…',{exact:true}).waitFor();await p.getByRole('link',{name:'Result B · Fixture artist',exact:true}).waitFor();await p.waitForTimeout(750);assert.equal(await p.getByRole('link',{name:'Result A · Fixture artist',exact:true}).count(),0);
await input.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('href')),'/songs/82');await p.keyboard.press('Escape');await input.focus();await input.fill('fail');await p.getByRole('button',{name:'Thử lại',exact:true}).click();await p.getByRole('link',{name:'Result B · Fixture artist',exact:true}).waitFor();
await input.fill('empty');await p.getByText('Không tìm thấy bài hát phù hợp.').waitFor();await p.getByRole('button',{name:'Xóa tìm kiếm'}).click();assert.equal(await input.inputValue(),'');
console.log('stage errors'); for(const [id,text] of [[403,'Bạn không có quyền xem nội dung này.'],[404,'Không tìm thấy nội dung hoặc nội dung không được công khai.'],[500,'Không thể tải dữ liệu. Vui lòng thử lại.']]){await other.goto(base+'/songs/'+id);await other.getByText(text,{exact:true}).waitFor();if(id===500){await other.getByRole('button',{name:'Thử lại',exact:true}).click();await other.getByText(text,{exact:true}).waitFor();}}
await other.goto(base+'/playlists/401');await other.getByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.').waitFor();
console.log('stage form'); await p.goto(base+'/Playlist');await p.getByRole('button',{name:/Tạo playlist mới/}).click();await p.getByPlaceholder('Tên playlist').fill('Keep this name');const save=p.getByRole('button',{name:'Tạo Playlist',exact:true});await save.click();assert.equal(await p.getByRole('button',{name:'Đang tạo...',exact:true}).isDisabled(),true);await p.getByRole('alert').filter({hasText:'Tên: Nội dung quá dài.'}).waitFor();assert.equal(await p.getByPlaceholder('Tên playlist').inputValue(),'Keep this name');assert.equal(posts,1);
await p.screenshot({path:path.join(evidence,'form-error.png'),fullPage:true});
await p.goto(base+'/songs/82');await p.getByRole('heading',{name:'Song 82',exact:true}).waitFor();
for(const width of [375,768,1440]){
 await p.setViewportSize({width,height:900});await p.waitForTimeout(150);
 const size=await p.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
 layouts.push({width,...size});assert.ok(size.scroll<=size.viewport+1,JSON.stringify(size));
 await p.screenshot({path:path.join(evidence,`viewport-${width}.png`),fullPage:true});
}
await p.setViewportSize({width:720,height:450});
const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setDeviceMetricsOverride',{width:720,height:450,deviceScaleFactor:2,mobile:false});
assert.equal(await p.evaluate(()=>devicePixelRatio),2);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
assert.ok(await p.getByRole('button',{name:'Phát bài hát',exact:true}).isVisible());
await p.screenshot({path:path.join(evidence,'zoom-200.png'),fullPage:true});
await cdp.send('Emulation.clearDeviceMetricsOverride');await p.setViewportSize({width:1440,height:900});
const search=p.getByRole('textbox',{name:'Tìm bài hát'});await tabTo(p,search);await search.fill('B');await p.getByRole('link',{name:'Result B · Fixture artist',exact:true}).waitFor();await search.press('ArrowDown');await p.keyboard.press('Enter');
await p.getByRole('heading',{name:'Song 82',exact:true}).waitFor();
const play=p.getByRole('button',{name:'Phát bài hát',exact:true});await tabTo(p,play);await p.keyboard.press('Enter');
const like=p.getByRole('button',{name:'Yêu thích bài hát',exact:true});await tabTo(p,like);await p.keyboard.press('Space');await p.waitForTimeout(200);assert.equal(await like.getAttribute('aria-pressed'),'true');
const more=p.getByRole('button',{name:'Tùy chọn bài hát',exact:true});await tabTo(p,more);await p.keyboard.press('Enter');const add=p.getByRole('button',{name:'Thêm vào playlist',exact:true});await tabTo(p,add);await p.keyboard.press('Enter');
const dialog=p.getByRole('dialog',{name:'Thêm vào Playlist',exact:true});await dialog.waitFor();
assert.ok(await dialog.evaluate(n=>n.contains(document.activeElement)));
const create=dialog.getByRole('button',{name:'+ Tạo Playlist Mới',exact:true});await tabTo(p,create);await p.keyboard.press('Enter');
const nested=p.getByRole('dialog',{name:'Tạo Playlist Mới',exact:true});await nested.waitFor();
await p.setViewportSize({width:375,height:450});await p.screenshot({path:path.join(evidence,'nested-modal-short.png'),fullPage:true});
for(let i=0;i<12;i++)await p.keyboard.press('Tab');assert.ok(await nested.evaluate(n=>n.contains(document.activeElement)));
await p.keyboard.press('Escape');await nested.waitFor({state:'hidden'});assert.ok(await create.evaluate(n=>n===document.activeElement));
await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.ok(await more.evaluate(n=>n===document.activeElement));
await p.goto(base+'/songs/83');await p.getByRole('heading',{name:/Bài hát với tiêu đề rất dài/}).waitFor();await p.setViewportSize({width:375,height:600});
assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.screenshot({path:path.join(evidence,'long-title.png'),fullPage:true});
const contrast=await p.evaluate(()=>{
 const css=getComputedStyle(document.documentElement), lum=(hex)=>{hex=hex.trim().replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const v=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 const white=lum(css.getPropertyValue('--tt-surface'));return Object.fromEntries(['--tt-text-primary','--tt-text-secondary','--tt-text-muted','--tt-orange'].map(k=>{const l=lum(css.getPropertyValue(k));return[k,(Math.max(l,white)+.05)/(Math.min(l,white)+.05)];}));
});assert.ok(Object.values(contrast).every(v=>v>=4.5));
assert.deepEqual(errors,[]);
await fs.writeFile(path.join(evidence,'browser.json'),JSON.stringify({actualNextRoutes:true,fixtureApi:true,layouts,contrast,longTitleNoOverflow:true,zoom200EquivalentViewport:true,zoomDeviceScaleFactor:2,shortViewport:{width:375,height:450},keyboardSearchPlayLikeAddPlaylist:true,nestedDialogTrapEscapeRestore:true,unexpectedPageErrors:errors},null,2));
console.log('PASS: T17 responsive and keyboard flows');
}finally{await browser.close();}
