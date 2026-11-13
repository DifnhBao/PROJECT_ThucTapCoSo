const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const script=path.resolve(__dirname,'../../../scripts/stack-backup.cjs');
for(const [name,target,opt] of [['source/demo target','tunetrek_demo','yes'],['missing restore opt-in','tunetrek_restore_t20','no']]){
 test('T20 restore refuses '+name+' before invoking Docker',()=>{
 const r=spawnSync(process.execPath,[script,'restore','--stack-env','nonexistent.env','--project','test','--file','.local-backups/absent.sql','--target',target],{env:{...process.env,RESTORE_ALLOWED:opt},encoding:'utf8',timeout:5000});
 assert.equal(r.status,1);assert.match(r.stderr,/Restore requires RESTORE_ALLOWED=yes/);assert.equal(r.stderr.includes('Database backup/restore command failed'),false);
 });
}
