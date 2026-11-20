const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),privateDir=path.join(root,'.local-backups/ci/security');let failed=false;
let base=process.env.BASE_SHA||'';const head=process.env.HEAD_SHA||'';
if((!base||/^0+$/.test(base))&&/^[a-f0-9]{40}$/.test(head)){try{base=cp.execFileSync('git',['merge-base',head,'origin/main'],{encoding:'utf8'}).trim();}catch{failed=true;}}
if(base&&!/^[a-f0-9]{40}$/.test(base))failed=true;
let mode='current-tree';
if(/^[a-f0-9]{40}$/.test(base)&&!/^0+$/.test(base)&&/^[a-f0-9]{40}$/.test(head)){
 const r=cp.spawnSync(process.platform==='win32'?'python':'python3',[path.join(root,'scripts/scan-secrets.py'),'--gitleaks',process.argv[2],'--history','--range',base+'..'+head,'--output','.local-backups/ci/security'],{cwd:root,encoding:'utf8'});if(r.status!==0)failed=true;mode='tree-and-introduced-commits';
}
const findings=[];for(const scope of ['tree',...(mode==='tree-and-introduced-commits'?['history']:[])]){
 const file=path.join(privateDir,`secrets-${scope}-after.json`);if(!fs.existsSync(file)){failed=true;continue;}const data=JSON.parse(fs.readFileSync(file));if(data.length)failed=true;findings.push(...data.map(x=>({scope,rule:x.RuleID,file:x.File,line:x.StartLine,commit:x.Commit})));
}
fs.mkdirSync(path.join(root,'artifacts/ci'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/ci/secrets.json'),JSON.stringify({status:failed?'FAIL':'PASS',mode,findings},null,2));console.log((failed?'FAIL':'PASS')+' new-secret policy');if(failed)process.exitCode=1;
