const {test}=require('node:test');
const assert=require('node:assert/strict');
const {targetOrigin,probe}=require('../../../scripts/deploy/probe-https.cjs');
test('deployment probe refuses HTTP, embedded credentials, paths and loopback',()=>{
  for(const url of ['http://demo.example.test','https://user:secret@demo.example.test','https://demo.example.test/path','https://demo.example.test/?token=x','https://localhost','https://127.0.0.1'])assert.throws(()=>targetOrigin(url));
  assert.equal(targetOrigin('https://demo.example.test'),'https://demo.example.test');
});
test('deployment probe never follows redirects while credentials could be sent',async()=>{
  let calls=0;
  await assert.rejects(probe({SMOKE_URL:'https://demo.example.test'},async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://other.example.test'}});}));
  assert.equal(calls,1);
});
test('deployment probe refuses session writes without explicit demo opt-in',async()=>{
  let calls=0;
  await assert.rejects(probe({SMOKE_URL:'https://demo.example.test',SMOKE_USERNAME:'fixture',SMOKE_PASSWORD:'private-fixture'},async()=>{calls++;}));assert.equal(calls,0);
});
test('deployment probe keeps cookie values and passwords out of evidence and logs out',async()=>{
  const routes=[];
  const output=await probe({SMOKE_URL:'https://demo.example.test',SMOKE_USERNAME:'fixture',SMOKE_PASSWORD:'private-fixture',SMOKE_ALLOW_SESSION_MUTATIONS:'yes'},async(url,options)=>{
    const route=new URL(url).pathname;routes.push(route);const headers=new Headers();let status=200;
    if(route==='/api/auth/login'||route==='/api/auth/refresh-token')for(const name of ['accessToken','refreshToken'])headers.append('set-cookie',name+'=private-cookie; Path=/; HttpOnly; Secure; SameSite=Lax');
    if(route==='/api/songs/pending')status=403;
    if(route==='/api/auth/logout')for(const name of ['accessToken','refreshToken'])headers.append('set-cookie',name+'=; Path=/; HttpOnly; Secure; SameSite=Lax');
    if(route==='/api/users/me'&&routes.at(-2)==='/api/auth/logout')status=401;
    if(route==='/api/auth/refresh-token')assert.ok(options.headers.Cookie.includes('private-cookie'));
    return new Response(null,{status,headers});
  });
  assert.equal(output.sessionChecks,'PASS');assert.equal(JSON.stringify(output).includes('private-cookie'),false);assert.equal(JSON.stringify(output).includes('private-fixture'),false);assert.ok(routes.includes('/api/auth/logout'));
});
