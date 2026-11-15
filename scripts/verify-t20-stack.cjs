// Run only against the isolated T20 project; never uses the application's host DB.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),project='tunetrek-t20-verification';
const envFile=path.join(root,'.local-backups/t20/stack.env');
const file=path.join(root,'.local-backups/t20/clean-clone-lf/docker-compose.yml');
const evidence=path.join(root,'docs/verification/evidence/T20');fs.mkdirSync(evidence,{recursive:true});
const prefix=['compose','--env-file',envFile,'-p',project,'-f',file];
const steps=[];let stage='preflight';
function docker(args,input){const r=cp.spawnSync('docker',args,{input,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});if(r.status!==0){fs.writeFileSync(path.join(root,'.local-backups/t20/docker-error.log'),r.stderr||'');throw Error('Docker operation failed at '+stage);}return r.stdout.trim();}
const compose=(args,input)=>docker([...prefix,...args],input);
const exec=(service,code)=>compose(['exec','-T',service,'node','-e',code]);
const ids=service=>compose(['ps','-q',service]);
async function waitReady(){const until=Date.now()+90000;while(Date.now()<until){try{if((await fetch(base+'/health/ready',{signal:AbortSignal.timeout(5000)})).status===200)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw Error('Readiness did not recover');}
const base='http://127.0.0.1:'+(process.env.WEB_PORT||3020);
const record=(name,data={})=>{steps.push({name,...data});console.log('PASS '+name);};
async function main(){
 stage='initial health';await waitReady();assert.equal((await fetch(base+'/health/live')).status,200);record('live/ready through Next same-origin proxy');
 stage='runtime audit';const audits={};
 for(const service of ['api','web']){
  const id=ids(service);const info=JSON.parse(docker(['inspect',id]))[0];
  assert.equal(info.HostConfig.ReadonlyRootfs,true);assert.equal(info.HostConfig.LogConfig.Config['max-size'],'10m');
  const audit=JSON.parse(exec(service,`const fs=require('fs');console.log(JSON.stringify({uid:process.getuid(),node:process.version,envFile:fs.readdirSync('/app').some(n=>n.startsWith('.env')),tests:fs.existsSync('/app/tests'),git:fs.existsSync('/app/.git'),backup:fs.existsSync('/app/.local-backups'),typescript:fs.existsSync('/app/node_modules/typescript'),cli:fs.existsSync('/app/node_modules/sequelize-cli')}));`));
  assert.equal(audit.uid,1000);assert.equal(audit.node,'v22.19.0');for(const k of ['envFile','tests','git','backup','typescript','cli'])assert.equal(audit[k],false);
  if(service==='api')assert.ok(!info.Config.Env.some(e=>/^MIGRATION_DB_|^MYSQL_ROOT_PASSWORD=/.test(e)));
  audits[service]={...audit,image:info.Image,readOnly:true,logs:info.HostConfig.LogConfig.Config};
 }
 const dbInfo=JSON.parse(docker(['inspect',ids('db')]))[0];assert.equal(Object.keys(dbInfo.HostConfig.PortBindings||{}).length,0);
 record('non-root/read-only/no local artifacts/no runtime CLI/no public DB',audits);
 stage='database privilege';const denied=exec('api',`const db=require('./src/config/db');(async()=>{try{await db.query('CREATE TABLE t20_forbidden(id INT)');process.exitCode=1;}catch(e){if(e.original?.code!=='ER_TABLEACCESS_DENIED_ERROR')process.exitCode=1;else console.log('DDL_DENIED');}finally{await db.close();}})();`);assert.ok(denied.includes('DDL_DENIED'));record('API app account cannot execute DDL');
 stage='fresh demo seed';compose(['--profile','demo','run','--rm','--no-deps','--build','seed']);record('fresh guarded demo seed');
 stage='browser demo';const {chromium}=await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')).href);const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/Home');await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  await page.waitForFunction(()=>{const i=document.querySelector('.center-cover img');return i?.complete&&i.naturalWidth>0;});
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Username',{exact:true}).fill('demo_userA');await page.getByLabel('Password',{exact:true}).fill(process.env.DEMO_SEED_PASSWORD);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.getByRole('button',{name:/demo_userA/}).waitFor();
  await page.getByRole('textbox',{name:'Tìm bài hát'}).fill('Synthetic Track 03');await page.getByRole('link',{name:/Synthetic Track 03 ·/}).click();await page.waitForURL('**/songs/3');await page.getByRole('heading',{name:'Synthetic Track 03',level:1,exact:true}).waitFor();
  await page.getByRole('button',{name:'Phát bài hát',exact:true}).click();await page.getByRole('button',{name:'Tạm dừng',exact:true}).waitFor();await page.waitForFunction(()=>/^0:0[1-5]$/.test(document.querySelector('.current-time')?.textContent||''));await page.getByRole('button',{name:'Tạm dừng',exact:true}).click();
  const liked=page.waitForResponse(r=>r.url().includes('/api/favorites/')&&r.request().method()==='POST');await page.getByRole('button',{name:'Yêu thích bài hát',exact:true}).click();assert.equal((await liked).status(),200);
  await page.getByRole('button',{name:'Tùy chọn bài hát',exact:true}).click();await page.getByRole('button',{name:'Thêm vào playlist',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Thêm vào Playlist',exact:true});await dialog.getByRole('button',{name:'+ Tạo Playlist Mới',exact:true}).click();const nested=page.getByRole('dialog',{name:'Tạo Playlist Mới',exact:true});await nested.getByLabel('Tên playlist',{exact:true}).fill('T20 verified playlist');
  const created=page.waitForResponse(r=>r.url().endsWith('/api/playlists')&&r.request().method()==='POST');await nested.getByRole('button',{name:'Tạo Playlist',exact:true}).click();assert.equal((await created).status(),201);
  const added=page.waitForResponse(r=>r.url().includes('/songs')&&r.request().method()==='POST');await dialog.locator('.playlist-item').filter({hasText:'T20 verified playlist'}).getByRole('button',{name:'Thêm',exact:true}).click();assert.equal((await added).status(),200);await page.keyboard.press('Escape');
  await page.goto(base+'/Home');await page.getByRole('heading',{name:'Đề xuất cho bạn'}).waitFor();await page.locator('.rec-card').first().waitFor();await page.locator('.rec-section .dev-toggle').click();await page.locator('.rec-card').first().hover();await page.locator('.ai-popover-reason-text').first().waitFor();await page.screenshot({path:path.join(evidence,'docker-demo.png'),fullPage:true});assert.deepEqual(errors,[]);
  record('real Docker browser login/search/audio/favorite/playlist/recommendation/fallback SVG',{pageErrors:errors,apiMocked:false,media:'self-generated 6s tone'});await page.close();
  stage='API graceful restart';compose(['stop','api']);const stopped=JSON.parse(docker(['inspect',ids('api')||project+'-api-1']))[0];assert.equal(stopped.State.ExitCode,0);
  const logs=compose(['logs','--no-color','api']);assert.ok(logs.includes('shutdown_started')&&logs.includes('shutdown_complete'));compose(['start','api']);await waitReady();
  const favorites=await(await context.request.get(base+'/api/favorites/me')).json();assert.ok(favorites.data.data.some(r=>r.song.song_id===3));const playlists=await(await context.request.get(base+'/api/playlists/me')).json();assert.ok(playlists.data.data.some(p=>p.name==='T20 verified playlist'));record('SIGTERM graceful exit0 and API restart preserves session/favorite/playlist');
  stage='DB down';compose(['stop','db']);const before=Date.now();assert.equal((await fetch(base+'/health/ready',{signal:AbortSignal.timeout(6000)})).status,503);const delay=Date.now()-before;assert.ok(delay<6000);assert.equal((await fetch(base+'/health/live')).status,200);record('DB down returns ready503 while live200',{readinessMs:delay});
  compose(['start','db']);await waitReady();const restored=await(await context.request.get(base+'/api/playlists/me')).json();assert.ok(restored.data.data.some(p=>p.name==='T20 verified playlist'));record('DB restart restores readiness and persisted playlist');
 }finally{await browser.close();}
 stage='schema startup refusal';const target='tunetrek_restore_empty';const sql=`CREATE DATABASE ${target}; GRANT SELECT,INSERT,UPDATE,DELETE ON ${target}.* TO 'tunetrek_app'@'%';`;
 compose(['exec','-T','db','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --protocol=socket -uroot'],sql);
 const rejected=cp.spawnSync('docker',[...prefix,'run','--rm','--no-deps','-e','DB_NAME='+target,'api'],{encoding:'utf8',timeout:30000});assert.equal(rejected.status,1);assert.ok(rejected.stderr.includes('startup_failed'));assert.ok(!rejected.stdout.includes('api_started'));record('startup refuses un-migrated schema');
 stage='quiesced backup/restore';compose(['stop','api']);
 const args=['--stack-env',envFile,'--project',project];
 const backup=cp.spawnSync(process.execPath,[path.join(root,'scripts/stack-backup.cjs'),'backup',...args],{encoding:'utf8',timeout:120000});assert.equal(backup.status,0);const metadata=JSON.parse(backup.stdout);
 const restore=cp.spawnSync(process.execPath,[path.join(root,'scripts/stack-backup.cjs'),'restore',...args,'--file',metadata.backup,'--target','tunetrek_restore_t20'],{env:{...process.env,RESTORE_ALLOWED:'yes'},encoding:'utf8',timeout:120000});assert.equal(restore.status,0);const result=JSON.parse(restore.stdout);assert.ok(result.tableCounts.some(r=>r.table==='songs'&&r.count===28));
 fs.writeFileSync(path.join(evidence,'restore.json'),JSON.stringify(result,null,2));record('backup restored into distinct empty DB with matching all-table row counts',{sha256:metadata.sha256,tables:result.tableCounts.length});
 compose(['start','api']);await waitReady();
 const audit=compose(['logs','--no-color','api']);const events=audit.split('\n').map(l=>l.slice(l.indexOf('{'))).flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}});const req=events.filter(e=>e.event==='http_request');assert.ok(req.length>0&&req.every(e=>e.requestId&&e.route&&typeof e.status==='number'&&typeof e.durationMs==='number'));
 fs.writeFileSync(path.join(evidence,'request-log-sample.json'),JSON.stringify(req.slice(-8),null,2));record('structured requestId/route/status/duration logs');
 fs.writeFileSync(path.join(evidence,'stack-smoke.json'),JSON.stringify({status:'PASS',steps},null,2));console.log('PASS T20 stack smoke');
}
main().catch(e=>{fs.writeFileSync(path.join(root,'.local-backups/t20/smoke-debug.log'),String(e.stack));fs.writeFileSync(path.join(evidence,'stack-smoke.json'),JSON.stringify({status:'FAIL',stage,errorType:e.name,steps},null,2));console.error('FAIL '+stage+' ('+e.name+'); details in ignored debug log');process.exitCode=1;});
