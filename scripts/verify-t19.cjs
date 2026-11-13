// Invoke with node --env-file=<ignored-test-env> scripts/verify-t19.cjs.
// Production UI must already be running at T19_NEXT_URL (default localhost:3016).
const { spawnSync }=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
require('../Server/config/test-database').getTestDatabaseConfig(process.env,{destructive:true});
const evidence=path.join(root,'docs/verification/evidence/T19');fs.mkdirSync(evidence,{recursive:true});
const files=(dir,suffix)=>fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith(suffix)).sort().map(n=>path.join(root,dir,n));
const stages=[
 ['backend-unit-api','Server',['--require','./tests/helpers/unit-setup.cjs','--experimental-test-coverage','--test','--test-concurrency=2',...files('Server/tests/unit','.test.cjs'),...files('Server/tests/api','.test.cjs')]],
 ['frontend-unit-component','UI',['--import','./tests/helpers/register-typescript.mjs','--test',...files('UI/tests/unit','.test.mjs'),...files('UI/tests/components','.test.mjs')]],
 ['mysql-integration','Server',['tests/helpers/run-integration.cjs']],
 ['full-stack-e2e','UI',['--test','--test-concurrency=1',...files('UI/tests/e2e','.test.mjs')]],
 ['player-regression','UI',['tests/browser/player-smoke.mjs']],
 ['account-regression','UI',['tests/browser/account-smoke.mjs']],
 ['responsive-keyboard','UI',['tests/browser/accessibility.mjs']],
];
const summary={date:new Date().toISOString(),status:'RUNNING',stages:[]};
const save=()=>fs.writeFileSync(path.join(evidence,'suite-summary.json'),JSON.stringify(summary,null,2));save();
for(const [name,cwd,args] of stages){
 console.log('Running '+name);const log=fs.openSync(path.join(evidence,name+'.log'),'w');const started=Date.now();
 const result=spawnSync(process.execPath,args,{cwd:path.join(root,cwd),stdio:['ignore',log,log],env:{...process.env,
 T07_BROWSER_TESTS:'yes',T08_BROWSER_UPLOAD:'yes',SECURITY_EVIDENCE_DIR:'docs/verification/evidence/T19/browser-security',
 RECOMMENDATION_EVIDENCE_DIR:'docs/verification/evidence/T19/recommendation',T19_EVIDENCE_DIR:'docs/verification/evidence/T19/e2e',
 PLAYER_EVIDENCE_DIR:'docs/verification/evidence/T19/player',ACCOUNT_EVIDENCE_DIR:'docs/verification/evidence/T19/accounts',
 ACCESSIBILITY_EVIDENCE_DIR:'docs/verification/evidence/T19/accessibility',T16_URL:process.env.T19_NEXT_URL||'http://127.0.0.1:3016',
 T11_BROWSER_TESTS:'yes',T13_BROWSER_TESTS:'yes',T18_PERFORMANCE:'yes',T18_EXPECT_ISOLATED:'yes'}});fs.closeSync(log);
 summary.stages.push({name,status:result.status===0?'PASS':'FAIL',exitCode:result.status,durationMs:Date.now()-started});save();
 if(result.error||result.status!==0){summary.status='FAIL';save();console.error(name+' failed; inspect its log. Remaining stages NOT_RUN.');process.exitCode=1;break;}
}
if(!process.exitCode){summary.status='PASS';save();console.log('PASS all T19 stages');}
