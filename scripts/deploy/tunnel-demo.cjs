// Start/status/stop only the T23 demo. Credentials stay in the ignored env file.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'.local-backups/t23'),binary=path.join(dir,'tools/cloudflared.exe'),stateFile=path.join(dir,'tunnel-process.json');
const prefix=['compose','--env-file',path.join(dir,'stack.env'),'-p','tunetrek-t23-demo','-f',path.join(root,'docker-compose.yml')];
if(fs.existsSync(path.join(dir,'release.override.yml')))prefix.push('-f',path.join(dir,'release.override.yml'));
function compose(args){const r=cp.spawnSync('docker',[...prefix,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:240000});if(r.status!==0)throw Error('Docker operation failed; ensure Docker Desktop is ready');return r.stdout.trim();}
function verifyImages(){const file=path.join(dir,'demo-release.json');if(!fs.existsSync(file))throw Error('Missing tested image manifest');const release=JSON.parse(fs.readFileSync(file));for(const service of ['api','web']){const id=cp.execFileSync('docker',['image','inspect','tunetrek-t23-'+service+':tested','--format','{{.Id}}'],{encoding:'utf8',windowsHide:true}).trim();if(id!==release.images[service])throw Error('Demo image differs from the verified manifest');}}
function ownProcess(){
  if(!fs.existsSync(stateFile))return null;const state=JSON.parse(fs.readFileSync(stateFile));
  if(!Number.isSafeInteger(state.pid)||state.pid<1||path.resolve(state.executable)!==binary)return null;
  try{const quoted=binary.replace(/'/g,"''");const r=cp.spawnSync('powershell',['-NoProfile','-Command',`$p=Get-Process -Id ${state.pid} -ErrorAction SilentlyContinue; if ($p -and $p.Path -eq '${quoted}') { Write-Output 'MATCH' }`],{encoding:'utf8',windowsHide:true});return r.stdout.trim()==='MATCH'?state:null;}catch{return null;}
}
async function status(){let origin=null,ready=false;try{origin=JSON.parse(fs.readFileSync(path.join(dir,'demo-url.json'))).origin;ready=(await fetch(origin+'/health/ready',{signal:AbortSignal.timeout(6000)})).status===200;}catch{}return {running:Boolean(ownProcess()),ready,origin,temporary:true};}
async function main(){
  const action=process.argv[2];if(!['start','status','stop'].includes(action))throw Error('Usage: node scripts/deploy/tunnel-demo.cjs start|status|stop');
  if(action==='status'){console.log(JSON.stringify(await status(),null,2));return;}
  if(action==='stop'){const state=ownProcess();if(state)process.kill(state.pid);compose(['stop']);console.log('Stopped the dedicated demo; database volumes and backups retained');return;}
  verifyImages();
  if(ownProcess()){compose(['up','-d','--no-build','--wait','--wait-timeout','180']);const current=await status();if(!current.ready)throw Error('Existing demo tunnel is not ready');console.log(JSON.stringify(current,null,2));return;}
  if(!fs.existsSync(path.join(dir,'stack.env')))throw Error('Missing private T23 setup; do not substitute a personal database');
  if(crypto.createHash('sha256').update(fs.readFileSync(binary)).digest('hex')!=='d5c1d82031da6253dcdcff64c944cd0fe063016edeb2e4fd088075fc9bd52d0a')throw Error('Tunnel binary checksum mismatch');
  compose(['up','-d','--no-build','--wait','--wait-timeout','180']);
  const stdout=fs.openSync(path.join(dir,'tunnel.out.log'),'w'),stderr=fs.openSync(path.join(dir,'tunnel.err.log'),'w');
  const child=cp.spawn(binary,['tunnel','--url','http://127.0.0.1:3030','--no-autoupdate','--protocol','http2'],{detached:true,windowsHide:true,stdio:['ignore',stdout,stderr]});child.unref();fs.closeSync(stdout);fs.closeSync(stderr);
  fs.writeFileSync(stateFile,JSON.stringify({pid:child.pid,executable:binary,createdAt:new Date().toISOString()},null,2));
  let origin;for(let i=0;i<60;i++){origin=fs.readFileSync(path.join(dir,'tunnel.err.log'),'utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];if(origin)break;await new Promise(r=>setTimeout(r,1000));}
  if(!origin)throw Error('Tunnel did not provide an origin; inspect private tunnel diagnostics');
  const envFile=path.join(dir,'stack.env'),content=fs.readFileSync(envFile,'utf8');if(!/^WEB_ORIGINS=/m.test(content))throw Error('Missing WEB_ORIGINS setting');fs.writeFileSync(envFile,content.replace(/^WEB_ORIGINS=.*$/m,()=> 'WEB_ORIGINS='+origin));
  fs.writeFileSync(path.join(dir,'demo-url.json'),JSON.stringify({origin,createdAt:new Date().toISOString(),temporary:true},null,2));
  compose(['up','-d','--no-build','--wait','--wait-timeout','180']);
  for(let i=0;i<30;i++){const current=await status();if(current.ready){console.log(JSON.stringify(current,null,2));return;}await new Promise(r=>setTimeout(r,1000));}throw Error('Demo has not reached public readiness');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
