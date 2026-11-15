const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const {once}=require('node:events');
const {readiness}=require('../../src/operations/health');const {createApp}=require('../../src/app');
const {createShutdown}=require('../../src/operations/shutdown');
test('readiness shares concurrent probes and enforces a finite deadline',async()=>{
 let release,calls=0;const check=readiness(()=>{calls++;return new Promise(r=>{release=r;});},1000);
 const a=check(),b=check();assert.equal(a,b);await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();await a;
 await assert.rejects(readiness(()=>new Promise(()=>{}),15)(),/deadline/);
});
test('health keeps liveness independent and fails ready safely for dependency failure/drain',async(t)=>{
 const state={draining:false};let fail=false;
 const app=createApp({runtimeState:state,readinessProbe:async()=>{if(fail)throw Error('private-password-internal-stack');}});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/health/ready')).status,200);fail=true;
 const r=await fetch(base+'/health/ready');assert.equal(r.status,503);assert.equal((await r.text()).includes('private-password'),false);
 assert.equal((await fetch(base+'/health/live')).status,200);fail=false;state.draining=true;assert.equal((await fetch(base+'/health/ready')).status,503);
});
test('access logs contain only fixed fields, never URL query/cookies/password',async(t)=>{
 const logs=[];t.mock.method(console,'info',s=>logs.push(JSON.parse(s)));
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 await fetch(`http://127.0.0.1:${server.address().port}/health/live?password=private-query`,{headers:{Cookie:'accessToken=private-cookie'}});
 assert.equal(logs.length,1);assert.deepEqual(Object.keys(logs[0]).sort(),['event','requestId','method','route','status','durationMs'].sort());
 assert.equal(logs[0].route,'/health/live');assert.equal(logs[0].status,200);assert.ok(logs[0].requestId);assert.equal(JSON.stringify(logs).includes('private-'),false);
});
test('shutdown drains in-flight request before closing pool and is idempotent',async()=>{
 let entered;const seen=new Promise(r=>{entered=r;});let release;const hold=new Promise(r=>{release=r;});let finished=false,closed=false;
 const server=http.createServer(async(_req,res)=>{entered();await hold;finished=true;res.end('done');});server.listen(0,'127.0.0.1');await once(server,'listening');
 const state={draining:false};const stop=createShutdown({server,state,pool:{close:async()=>{assert.ok(finished);closed=true;}}});
 const request=fetch(`http://127.0.0.1:${server.address().port}`);await seen;const stopping=stop();assert.equal(stop(),stopping);assert.equal(state.draining,true);assert.equal(closed,false);
 release();assert.equal(await(await request).text(),'done');await stopping;assert.equal(closed,true);assert.equal(server.listening,false);
});
