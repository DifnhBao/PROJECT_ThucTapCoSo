const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'.local-backups/t21/self-tests');fs.mkdirSync(out,{recursive:true});
const run=(script,args=[],env={})=>cp.spawnSync(process.execPath,[path.join(root,'scripts/ci',script),...args],{cwd:root,env:{...process.env,CI_SAFE_DIR:out,...env},encoding:'utf8',timeout:10000});
test('CI required fails when any required job is failed, skipped, cancelled or missing',()=>{
 const good=Object.fromEntries(['ui','api','integration','security','containers'].map(k=>[k,{result:'success'}]));
 assert.equal(run('required.cjs',[path.join(out,'required.json')],{NEEDS_JSON:JSON.stringify(good)}).status,0);
 for(const result of ['failure','skipped','cancelled',undefined]){const copy={...good,integration:{result}};assert.equal(run('required.cjs',[path.join(out,'required.json')],{NEEDS_JSON:JSON.stringify(copy)}).status,1);}
});
test('CI child failure is propagated without printing private child output',()=>{
 const r=run('command.cjs',['ci-red-sentinel','--','--eval',"console.log('synthetic-private-value');process.exitCode=1"]);
 assert.equal(r.status,1);assert.equal(r.stdout.includes('synthetic-private-value'),false);assert.equal(JSON.parse(fs.readFileSync(path.join(out,'ci-red-sentinel.json'))).status,'FAIL');
});
test('CI audit fails on malformed scanner output and unaccepted high finding',()=>{
 const file=path.join(out,'audit.json');fs.writeFileSync(file,'{}');assert.equal(run('check-audit.cjs',[file]).status,1);
 fs.writeFileSync(file,JSON.stringify({metadata:{},vulnerabilities:{fixture:{severity:'high',via:[{source:1}]}}}));assert.equal(run('check-audit.cjs',[file]).status,1);
 fs.writeFileSync(file,JSON.stringify({metadata:{},vulnerabilities:{}}));assert.equal(run('check-audit.cjs',[file]).status,0);
});
test('release gate accepts only successful push CI for exact SHA in same repository',()=>{
 const {successful}=require('../../../scripts/ci/release-policy.cjs');const sha='a'.repeat(40),repo='owner/project';const item={head_sha:sha,event:'push',status:'completed',conclusion:'success',head_repository:{full_name:repo}};
 assert.equal(successful([item],sha,repo),item);
 for(const change of [{event:'pull_request'},{conclusion:'failure'},{head_sha:'b'.repeat(40)},{head_repository:{full_name:'fork/project'}}])assert.equal(successful([{...item,...change}],sha,repo),undefined);
});
