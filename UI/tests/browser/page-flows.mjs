import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')).href : 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const evidence = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/verification/evidence/T16');
await fs.mkdir(evidence,{recursive:true});
const base = process.env.T16_URL || 'http://127.0.0.1:3016';
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge', headless:true});
const context = await browser.newContext(); context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(15000);
const errors=[];let posts=0,searchFail=true;
const song=(id)=>({song_id:id,title:`Song ${id}`,duration:60,audio_url:'/fixture.wav',artists:[{name:'Fixture artist'}],genres:[],is_visible:true});
const send=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status<400?{data,meta:{requestId:'fixture'}}:{error:{code:'FIXTURE_ERROR',message:'Fixture server error',details:[{path:'name',code:'too_long'}]},requestId:'fixture'})});
await context.route('**/api/**',async route=>{
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
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
assert.deepEqual(errors,[]);await fs.writeFile(path.join(evidence,'browser.json'),JSON.stringify({actualNextRoutes:true,fixtureApi:true,directSongTabsIndependentOfPlayer:true,playlistDeepLink:true,emptyPlaylist:true,staleSearchDiscarded:true,keyboardNavigation:true,searchRetryAndClear:true,forbiddenNotFoundNetworkAndExpired:true,formRetainsInputAndFieldError:true,unexpectedPageErrors:errors},null,2));
console.log('PASS: T16 browser flows');
}finally{await browser.close();}
