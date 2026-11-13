const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {start,publicPort,serviceEnvironment}=require('../../../scripts/deploy/start-demo.cjs');
function fixture(){const children=[],signals=new EventEmitter();const spawn=(bin,args,options)=>{const child=new EventEmitter();child.kills=[];child.kill=signal=>{child.kills.push(signal);queueMicrotask(()=>child.emit('close',0));};children.push({child,args,options});return child;};return {children,signals,spawn};}
test('demo supervisor keeps API loopback port distinct from the public Next port',()=>{
  assert.equal(publicPort({PORT:'10000'}),'10000');for(const PORT of ['5000','0','65536','abc'])assert.throws(()=>publicPort({PORT}));
});
test('demo supervisor forwards shutdown to both children and exits cleanly',async()=>{
  const f=fixture(),done=start({...f,env:{PORT:'10000'},root:'/fixture'});
  assert.equal(f.children[0].options.env.PORT,'5000');assert.ok(f.children[0].args[1].includes("host:'127.0.0.1'"));assert.equal(f.children[1].options.env.PORT,'10000');
  f.signals.emit('SIGTERM');assert.equal(await done,0);assert.ok(f.children.every(c=>c.child.kills.includes('SIGTERM')));assert.equal(f.signals.listenerCount('SIGTERM'),0);
});
test('demo supervisor fails the service and stops its peer when a child exits unexpectedly',async()=>{
  const f=fixture(),done=start({...f,env:{PORT:'10000'},root:'/fixture'});f.children[0].child.emit('close',1);assert.equal(await done,1);assert.deepEqual(f.children[1].child.kills,['SIGTERM']);
});
test('demo supervisor uses only a validated platform origin or explicit WEB_ORIGINS',()=>{
  assert.equal(serviceEnvironment({RENDER:'true',RENDER_EXTERNAL_URL:'https://demo.onrender.com'}).WEB_ORIGINS,'https://demo.onrender.com');
  assert.equal(serviceEnvironment({RENDER_EXTERNAL_URL:'https://demo.onrender.com'}).WEB_ORIGINS,undefined);
  assert.equal(serviceEnvironment({RENDER:'true',WEB_ORIGINS:'https://custom.example.test'}).WEB_ORIGINS,'https://custom.example.test');
  for(const value of ['http://demo.onrender.com','https://user:pass@demo.onrender.com','https://demo.onrender.com/path'])assert.throws(()=>serviceEnvironment({RENDER:'true',RENDER_EXTERNAL_URL:value}));
});
test('demo supervisor does not hide a child shutdown failure',async()=>{
  const f=fixture(),done=start({...f,env:{PORT:'10000'},root:'/fixture'});f.children[0].child.kill=()=>queueMicrotask(()=>f.children[0].child.emit('close',1));f.signals.emit('SIGTERM');assert.equal(await done,1);
});
