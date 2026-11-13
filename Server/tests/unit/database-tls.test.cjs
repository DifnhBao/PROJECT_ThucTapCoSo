const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rootCertificates}=require('node:tls');
const {getDatabaseConfig}=require('../../src/config/env');
const base={NODE_ENV:'production',DB_HOST:'db.example.test',DB_PORT:'3306',DB_NAME:'demo',DB_USER:'app',DB_PASS:'private-test-value'};
test('remote MySQL TLS verifies both certificate trust and hostname with a small pool',()=>{
  const config=getDatabaseConfig({...base,DB_TLS_MODE:'verify_identity',DB_POOL_MAX:'2'});
  assert.deepEqual(config.dialectOptions.ssl,{rejectUnauthorized:true,verifyIdentity:true});assert.equal(config.pool.max,2);
  assert.equal(getDatabaseConfig(base).dialectOptions,undefined);
});
test('remote MySQL CA accepts real PEM and escaped newlines but rejects invalid data safely',()=>{
  const ca=rootCertificates[0];
  assert.equal(getDatabaseConfig({...base,DB_TLS_MODE:'verify_identity',DB_TLS_CA:ca.replace(/\n/g,'\\n')}).dialectOptions.ssl.ca,ca);
  for(const value of ['private-test-value','-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----',ca+'\nprivate-test-value']){
    assert.throws(()=>getDatabaseConfig({...base,DB_TLS_MODE:'verify_identity',DB_TLS_CA:value}),e=>e.message.includes('DB_TLS_CA')&&!e.message.includes('private-test-value'));
  }
  assert.throws(()=>getDatabaseConfig({...base,DB_TLS_CA:ca}),/requires/);
});
test('remote MySQL config refuses unsupported TLS modes and unbounded shared-database pools',()=>{
  for(const DB_TLS_MODE of ['required','false','insecure'])assert.throws(()=>getDatabaseConfig({...base,DB_TLS_MODE}),/DB_TLS_MODE/);
  for(const DB_POOL_MAX of ['0','11','2oops','1.5'])assert.throws(()=>getDatabaseConfig({...base,DB_POOL_MAX}),/DB_POOL_MAX/);
});
