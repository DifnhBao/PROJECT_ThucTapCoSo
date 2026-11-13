const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
for(const [label,changes,pattern] of [
 ['application database',{NODE_ENV:'test',TEST_DB_NAME:'tunetrek_demo',TEST_DB_RESET_ALLOWED:'yes'},/Test database name must/],
 ['missing destructive opt-in',{NODE_ENV:'test',TEST_DB_NAME:'tunetrek_test_t19',TEST_DB_RESET_ALLOWED:'no'},/Destructive tests require/],
]) test('T19 runner refuses '+label+' before running any stage',()=>{
 const result=spawnSync(process.execPath,[path.join(root,'scripts/verify-t19.cjs')],{env:{...process.env,...changes},encoding:'utf8',timeout:10000});
 assert.equal(result.status,1);assert.match(result.stderr,pattern);assert.equal(result.stdout.includes('Running '),false);
});
