// CI owns the Next child only when no external URL is supplied.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),raw=path.join(root,'.local-backups/ci/stack-'+Date.now());fs.mkdirSync(raw,{recursive:true});
require('../../Server/config/test-database').getTestDatabaseConfig(process.env,{destructive:true});
let server,log;const next=process.env.CI_NEXT_URL||'http://127.0.0.1:3016';const safe=path.join(root,'artifacts/ci');fs.mkdirSync(safe,{recursive:true});
const stages=[['mysql-integration','Server',['tests/helpers/run-integration.cjs']],['full-stack-e2e','UI',['--test','--test-concurrency=1','tests/e2e/full-stack.test.mjs']],['player-regression','UI',['tests/browser/player-smoke.mjs']],['account-regression','UI',['tests/browser/account-smoke.mjs']],['responsive-keyboard','UI',['tests/browser/accessibility.mjs']]];
async function main(){
 try{
  if(!process.env.CI_NEXT_URL){log=fs.openSync(path.join(raw,'next.log'),'w');server=cp.spawn(process.execPath,[path.join(root,'UI/node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3016'],{cwd:path.join(root,'UI'),env:{...process.env,NODE_ENV:'production',API_INTERNAL_URL:'http://127.0.0.1:5000'},stdio:['ignore',log,log],windowsHide:true});}
  let ready=false;for(let i=0;i<60;i++){if(server?.exitCode!=null)throw Error('Next exited before readiness');try{if((await fetch(next+'/login',{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Next not ready');
  for(const [stage,cwd,args]of stages){const dir=path.join(raw,stage);fs.mkdirSync(dir,{recursive:true});const file=fs.openSync(path.join(raw,stage+'.log'),'w');
   const env={...process.env,T19_NEXT_URL:next,T16_URL:next,T19_EVIDENCE_DIR:path.relative(root,dir),PLAYER_EVIDENCE_DIR:path.relative(root,dir),ACCOUNT_EVIDENCE_DIR:path.relative(root,dir),ACCESSIBILITY_EVIDENCE_DIR:path.relative(root,dir),RECOMMENDATION_EVIDENCE_DIR:path.relative(root,dir),SECURITY_EVIDENCE_DIR:path.relative(root,dir),T07_BROWSER_TESTS:'yes',T08_BROWSER_UPLOAD:'yes',T11_BROWSER_TESTS:'yes',T13_BROWSER_TESTS:'yes',T18_PERFORMANCE:'yes',T18_EXPECT_ISOLATED:'yes'};
   const r=cp.spawnSync(process.execPath,args,{cwd:path.join(root,cwd),env,stdio:['ignore',file,file],windowsHide:true});fs.closeSync(file);fs.writeFileSync(path.join(safe,stage+'.json'),JSON.stringify({stage,status:r.status===0?'PASS':'FAIL',exitCode:r.status},null,2));
   // Explicit allowlist; never upload raw logs, traces ZIP, env, cookies or request bodies.
   if(stage==='full-stack-e2e')for(const name of ['result.json','failure-trace.json','failure.png','admin-failure.png','final-account-b.png']){const p=path.join(dir,name);if(fs.existsSync(p))fs.copyFileSync(p,path.join(safe,'e2e-'+name));}
   console.log((r.status===0?'PASS ':'FAIL ')+stage);if(r.status!==0)throw Error('Required browser/database stage failed');
  }
 }finally{if(server&&server.exitCode===null){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(()=>{server.kill('SIGKILL');r();},10000).unref())]);}if(log!==undefined)fs.closeSync(log);}
}
main().catch(e=>{fs.writeFileSync(path.join(raw,'runner-error.log'),String(e.stack));console.error('FAIL CI stack runner; private diagnostics retained locally');process.exitCode=1;});
