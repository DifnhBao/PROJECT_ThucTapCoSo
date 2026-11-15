// All child output remains private; upload only stage summaries and whitelisted diagnostics.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const args=process.argv.slice(2),stage=args.shift();if(!/^[a-z0-9-]+$/.test(stage||''))throw Error('Invalid stage');
let cwd=process.cwd();if(args[0]==='--cwd'){cwd=path.resolve(args[1]);args.splice(0,2);}if(args.shift()!=='--'||!args.length)throw Error('Expected Node arguments after --');
const root=path.resolve(__dirname,'../..'),privateDir=path.join(root,'.local-backups/ci/logs'),publicDir=path.resolve(process.env.CI_SAFE_DIR||path.join(root,'artifacts/ci'));fs.mkdirSync(privateDir,{recursive:true});fs.mkdirSync(publicDir,{recursive:true});
const fd=fs.openSync(path.join(privateDir,stage+'.log'),'w');const result=cp.spawnSync(process.execPath,args,{cwd,stdio:['ignore',fd,fd],env:process.env,windowsHide:true});fs.closeSync(fd);
const record={stage,status:result.status===0?'PASS':'FAIL',exitCode:result.status};fs.writeFileSync(path.join(publicDir,stage+'.json'),JSON.stringify(record,null,2));console.log(`${record.status}: ${stage}`);process.exitCode=result.status===0?0:1;
