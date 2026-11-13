// Full Next UI -> same-origin test gateway -> Express -> disposable MySQL.
// Only external storage is mocked. Never reads Server/.env.
import {test} from 'node:test';
import {attachDiagnostics,saveFailure} from '../helpers/safe-diagnostics.mjs';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
const serverRequire=createRequire(import.meta.url);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
serverRequire('../../../Server/config/test-database').getTestDatabaseConfig(process.env, { destructive: true });
const nextOrigin = new URL(process.env.T19_NEXT_URL || 'http://127.0.0.1:3016');
assert.ok(nextOrigin.protocol === 'http:' && ['127.0.0.1','localhost'].includes(nextOrigin.hostname), 'Next test UI must be local');
const evidence = path.resolve(root, process.env.T19_EVIDENCE_DIR || 'docs/verification/evidence/T19/e2e');

test('T19: full-stack browser journey on isolated MySQL', { timeout: 240000 }, async (t) => {
  const cleanups=[];
  t.after(async()=>{for(const cleanup of cleanups.reverse())await cleanup();});
  await fs.mkdir(evidence, { recursive: true });
  const models = serverRequire('../../../Server/src/models');
  cleanups.push(() => models.sequelize.close());
  const probe = await fetch(nextOrigin, {signal:AbortSignal.timeout(5000)});assert.equal(probe.status,200,'Start production Next UI before running E2E');
  await serverRequire('../../../Server/tests/helpers/reset-test-database.cjs')();
  const migrate = spawnSync(process.execPath, [path.join(root,'Server/scripts/db-migrate.cjs'),'--env','test'], {env:process.env,encoding:'utf8',timeout:90000});
  assert.equal(migrate.status,0,'Test migrations must succeed');
  await serverRequire('../../../Server/database/seed.cjs').seed('test');
  const media = serverRequire('../../../Server/tests/helpers/media-fixtures.cjs');
  const wav=Buffer.alloc(44+160000);media.wav().copy(wav,0,0,44);wav.writeUInt32LE(wav.length-8,4);wav.writeUInt32LE(wav.length-44,40);
  await models.Song.update({audio_url:'/fixture.wav',image_url:'/fixture.png',duration:10},{where:{}});
  const storage=serverRequire('../../../Server/src/storage/cloudinary');
  let storageUploads=0;
  t.mock.method(storage,'upload',async()=>{storageUploads++;});
  t.mock.method(storage,'destroy',async()=>{});
  t.mock.method(storage,'read',async()=>new Response(wav,{headers:{'Content-Type':'audio/wav','Accept-Ranges':'bytes'}}));
  let apiPort, adminBootstrapGate, adminBootstrapEntered;
  const gateway=http.createServer(async(req,res)=>{
    if(req.url.startsWith('/api/users/admin/me')&&adminBootstrapGate){adminBootstrapEntered?.();await adminBootstrapGate;}
    if(req.url==='/fixture.wav'||req.url==='/fixture.png'){
      const audio=req.url.endsWith('.wav'),buf=audio?wav:media.png();
      const range=audio&&req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start=range?Number(range[1]):0,end=range?.[2]?Math.min(Number(range[2]),buf.length-1):buf.length-1;
      res.writeHead(range?206:200,{'Content-Type':audio?'audio/wav':'image/png','Content-Length':end-start+1,...(audio?{'Accept-Ranges':'bytes'}:{}),...(range?{'Content-Range':`bytes ${start}-${end}/${buf.length}`}:{})});res.end(buf.subarray(start,end+1));return;
    }
    const target=req.url.startsWith('/api/')?new URL(`http://127.0.0.1:${apiPort}`):nextOrigin;
    const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Test upstream unavailable');});req.pipe(upstream);req.on('aborted',()=>upstream.destroy());
  });
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  cleanups.push(async()=>{gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  const origin=`http://127.0.0.1:${gateway.address().port}`;
  const securityConfig=serverRequire('../../../Server/src/config/security').getSecurityConfig({...process.env,WEB_ORIGINS:origin,RATE_API_MAX:'3000',RATE_UPLOAD_MAX:'20'});
  const api=serverRequire('../../../Server/src/app').createApp({securityConfig}).listen(0,'127.0.0.1');await once(api,'listening');apiPort=api.address().port;
  cleanups.push(async()=>{api.closeAllConnections();await new Promise(r=>api.close(r));});
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH?pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')).href:'playwright');
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});cleanups.push(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();page.setDefaultTimeout(15000);
  let adminPage,adminTrace;
  const trace=attachDiagnostics(page);
  const errors=[],steps=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const step=name=>{steps.push(name);console.log('E2E '+name);};
  const username='t19_listener',password='T19!'+randomBytes(16).toString('hex');
  const responseFor=(fragment,method)=>page.waitForResponse(r=>r.url().includes(fragment)&&r.request().method()===method);
  const request=async(method,url,data)=>{const r=await context.request.fetch(origin+'/api'+url,{method,data,headers:{Origin:origin}});return r;};
  try {
    step('register/login through real forms');await page.goto(origin+'/Home');
    await page.getByRole('button',{name:'Sign up',exact:true}).click();
    await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Email Address').fill('t19@example.test');await page.getByLabel('Password',{exact:true}).fill(password);
    const registered=responseFor('/api/auth/register','POST');await page.getByRole('button',{name:'Get Started',exact:true}).click();assert.equal((await registered).status(),201);
    await page.getByRole('heading',{name:'Welcome Back'}).waitFor();await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill(password);
    const loggedIn=responseFor('/api/auth/login','POST');await page.getByRole('button',{name:'Sign In',exact:true}).click();assert.equal((await loggedIn).status(),200);
    await page.getByRole('button',{name:new RegExp(username)}).waitFor();
    assert.equal((await request('PUT','/users/me',{firstName:'Synthetic',lastName:'Listener'})).status(),200);
    step('search/play/favorite persisted in MySQL');const search=page.getByRole('textbox',{name:'Tìm bài hát'});await search.fill('Synthetic Track 01');
    const result=page.getByRole('link',{name:/Synthetic Track 01 ·/});await result.waitFor();await result.click();await page.waitForURL('**/songs/1');await page.getByRole('heading',{name:'Synthetic Track 01',exact:true,level:1}).waitFor();
    await page.getByRole('button',{name:'Phát bài hát',exact:true}).click();await page.getByRole('button',{name:'Tạm dừng',exact:true}).waitFor();
    const favorite=responseFor('/api/favorites/','POST');await page.getByRole('button',{name:'Yêu thích bài hát',exact:true}).click();assert.equal((await favorite).status(),200);
    const user=await models.User.findOne({where:{username}});assert.equal(await models.Favorite.count({where:{user_id:user.user_id,song_id:1}}),1);
    step('create playlist and add song through nested dialog');
    await page.getByRole('button',{name:'Tùy chọn bài hát',exact:true}).click();await page.getByRole('button',{name:'Thêm vào playlist',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Thêm vào Playlist',exact:true});await dialog.getByRole('button',{name:'+ Tạo Playlist Mới',exact:true}).click();
    const nested=page.getByRole('dialog',{name:'Tạo Playlist Mới',exact:true});await nested.getByLabel('Tên playlist',{exact:true}).fill('T19 private playlist');
    const created=responseFor('/api/playlists','POST');await nested.getByRole('button',{name:'Tạo Playlist',exact:true}).click();assert.equal((await created).status(),201);
    const added=responseFor('/songs','POST');await dialog.locator('.playlist-item').filter({hasText:'T19 private playlist'}).getByRole('button',{name:'Thêm',exact:true}).click();assert.equal((await added).status(),200);
    await page.keyboard.press('Escape');const playlist=await models.Playlist.findOne({where:{user_id:user.user_id,name:'T19 private playlist'}});assert.equal(await models.PlaylistSong.count({where:{playlist_id:playlist.playlist_id,song_id:1}}),1);
    // UI creates public playlists; make this test-owned fixture private for account isolation.
    await playlist.update({is_public:false});
    step('recommendation explanation is returned by real backend');await page.goto(origin+'/Home');await page.getByRole('heading',{name:'Đề xuất cho bạn'}).waitFor();await page.locator('.rec-card').first().waitFor();
    const rec=await request('GET','/recommendations/me?limit=3');assert.equal(rec.status(),200);const body=await rec.json();assert.ok(body.data.data.length>0);assert.ok(body.data.data.every(x=>typeof x.reason==='string'&&x.reason.length>0));
    await page.locator('.dev-toggle').click();await page.locator('.rec-card').first().hover();await page.locator('.ai-popover-reason-text').first().waitFor();
    step('upload pending song using real multipart and mocked external storage');await page.getByRole('button',{name:'Đăng nhạc',exact:true}).click();await page.getByPlaceholder('Nhập tên bài hát...').fill('T19 uploaded song');await page.getByPlaceholder('Tên nghệ sĩ...').fill('T19 artist');
    await page.locator('input[type=file][accept="audio/*"]').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav});
    const uploaded=responseFor('/api/songs/upload','POST');await page.getByRole('button',{name:'Đăng bài hát',exact:true}).click();assert.equal((await uploaded).status(),201);await page.getByText('Gửi bài hát thành công!',{exact:true}).waitFor();await page.getByRole('button',{name:'Đóng',exact:true}).click();
    const song=await models.Song.findOne({where:{title:'T19 uploaded song'}});assert.equal(song.status,'pending');assert.ok(storageUploads>0);
    const guest=await browser.newContext();cleanups.push(()=>guest.close());assert.equal((await guest.request.get(origin+`/api/songs/${song.song_id}`)).status(),404);assert.equal((await guest.request.get(origin+'/api/recommendations/me')).status(),401);
    step('admin UI approves and guest can then read song');const admin=await browser.newContext();cleanups.push(()=>admin.close());const ap=await admin.newPage();adminPage=ap;adminTrace=attachDiagnostics(ap);ap.setDefaultTimeout(15000);ap.on('dialog',d=>d.accept());ap.on('pageerror',e=>errors.push(e.message));
    let releaseBootstrap;adminBootstrapGate=new Promise(r=>{releaseBootstrap=r;});const enteredBootstrap=new Promise(r=>{adminBootstrapEntered=r;});
    await ap.goto(origin+'/administrator/login');await enteredBootstrap;await ap.getByLabel('Username',{exact:true}).fill('demo_admin');
    const bootstrapExpired=ap.waitForResponse(r=>r.url().includes('/api/auth/admin/refresh-token'));releaseBootstrap();await bootstrapExpired;
    await ap.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await ap.getByLabel('Username',{exact:true}).inputValue(),'demo_admin','Session bootstrap must not clear the login draft');adminBootstrapGate=null;await ap.getByLabel('Password',{exact:true}).fill(process.env.TEST_SEED_PASSWORD);const adminLogin=ap.waitForResponse(r=>r.url().includes('/api/auth/admin/login')&&r.request().method()==='POST');await ap.getByRole('button',{name:'Sign In',exact:true}).click();assert.equal((await adminLogin).status(),200);await ap.waitForURL('**/administrator/ManageUser');
    await ap.goto(origin+'/administrator/PendingSongs');const row=ap.getByRole('row').filter({hasText:'T19 uploaded song'});await row.waitFor();const approved=ap.waitForResponse(r=>r.url().endsWith(`/api/songs/${song.song_id}/approve`)&&r.request().method()==='PATCH');await row.getByRole('button',{name:'✓ Duyệt',exact:true}).click();assert.equal((await approved).status(),200);await row.waitFor({state:'hidden'});assert.equal((await guest.request.get(origin+`/api/songs/${song.song_id}`)).status(),200);
    step('logout/login B does not expose A private library');await page.getByRole('button',{name:new RegExp(username)}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Username',{exact:true}).fill('demo_userB');await page.getByLabel('Password',{exact:true}).fill(process.env.TEST_SEED_PASSWORD);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.getByRole('button',{name:/demo_userB/}).waitFor();
    const privateRead=await request('GET',`/playlists/${playlist.playlist_id}`);assert.equal(privateRead.status(),404);await page.goto(origin+'/Playlist');await page.getByRole('link',{name:'Synthetic Private',exact:true}).waitFor();assert.equal(await page.getByText('T19 private playlist',{exact:true}).count(),0);
    assert.deepEqual(errors,[]);await page.screenshot({path:path.join(evidence,'final-account-b.png'),fullPage:true});
    await fs.writeFile(path.join(evidence,'result.json'),JSON.stringify({actualNextUI:true,actualExpress:true,actualMySQL:true,externalStorageMocked:true,apiResponsesMocked:false,steps,unexpectedPageErrors:errors},null,2));
  } catch(e) {await saveFailure(path.join(evidence,'failure-trace.json'),e,steps.at(-1),{user:trace,admin:adminTrace||[]});if(adminPage){console.log('Admin failure URL '+new URL(adminPage.url()).pathname);console.log('Admin alert '+await adminPage.getByRole('alert').allTextContents());await adminPage.screenshot({path:path.join(evidence,'admin-failure.png'),fullPage:true,mask:[adminPage.locator('input[type=password]')]}).catch(()=>{});}await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true,mask:[page.locator('input[type=password]')]}).catch(()=>{});throw e;}
});
