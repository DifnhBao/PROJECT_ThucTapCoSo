// Local stack backup/restore. Credentials stay inside the database container.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),allowed=path.join(root,'.local-backups');
const args=process.argv.slice(2),mode=args.shift(),flags={};
for(let i=0;i<args.length;i+=2){if(!['--stack-env','--project','--file','--target'].includes(args[i])||!args[i+1])throw Error('Invalid backup arguments');flags[args[i]]=args[i+1];}
if(!['backup','restore'].includes(mode)||!flags['--stack-env']||!flags['--project']||!/^[a-z0-9][a-z0-9_-]+$/.test(flags['--project']))throw Error('Usage: stack-backup.cjs backup|restore --stack-env path --project name [--file backup.sql --target tunetrek_restore_name]');
if(mode==='restore' && (process.env.RESTORE_ALLOWED!=='yes'||!/^tunetrek_restore_[a-z0-9_]+$/.test(flags['--target']||'')||!flags['--file']))throw Error('Restore requires RESTORE_ALLOWED=yes, an explicit file and a separate tunetrek_restore_* target');
const prefix=['compose','--env-file',path.resolve(flags['--stack-env']),'-p',flags['--project'],'-f',path.join(root,'docker-compose.yml'),'exec','-T','db'];
function execute(script,input,stdio){const r=cp.spawnSync('docker',[...prefix,'sh','-c',script],{input,encoding:'utf8',stdio:stdio||['pipe','pipe','pipe'],timeout:120000});if(r.status!==0)throw Error('Database backup/restore command failed; inspect local configuration (credentials suppressed)');return (r.stdout||'').trim();}
function sql(text,db=false){return execute('MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --protocol=socket -uroot --batch --skip-column-names '+(db?'"$MYSQL_DATABASE"':''),text);}
function safe(file){const p=path.resolve(file);if(!p.startsWith(allowed+path.sep))throw Error('Backup file must stay under ignored .local-backups');return p;}
const source=sql('SELECT DATABASE();',true);if(!/^tunetrek_demo(?:_[a-z0-9]+)*$/.test(source))throw Error('Backup source must be an explicitly configured tunetrek_demo database');
if(mode==='backup'){
 const dir=path.join(allowed,'t20/backups');fs.mkdirSync(dir,{recursive:true});
 const file=safe(path.join(dir,'tunetrek-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sql'));
 const fd=fs.openSync(file+'.partial','wx');
 try{execute('MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --protocol=socket -u "$MYSQL_USER" --single-transaction --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"',undefined,['ignore',fd,'pipe']);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 fs.renameSync(file+'.partial',file);const sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 fs.writeFileSync(file+'.json',JSON.stringify({sourceDatabase:source,sha256,createdAt:new Date().toISOString()},null,2),{flag:'wx'});
 console.log(JSON.stringify({backup:path.relative(root,file),sha256}));
}else{
 const target=flags['--target'];if(process.env.RESTORE_ALLOWED!=='yes'||!/^tunetrek_restore_[a-z0-9_]+$/.test(target||'')||target===source)throw Error('Restore requires RESTORE_ALLOWED=yes and a separate tunetrek_restore_* target');
 const file=safe(flags['--file']||'');const body=fs.readFileSync(file);const meta=JSON.parse(fs.readFileSync(file+'.json','utf8'));
 if(meta.sourceDatabase!==source||crypto.createHash('sha256').update(body).digest('hex')!==meta.sha256)throw Error('Backup provenance/hash mismatch');
 if(/^\s*(USE\b|(CREATE|DROP|ALTER)\s+DATABASE\b)/im.test(body.toString('utf8')))throw Error('Database-switching SQL is not an allowed restore input');
 if(sql(`SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${target}';`)!=='0')throw Error('Restore target already exists; refusing overwrite');
 sql(`CREATE DATABASE \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
 execute(`MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --protocol=socket -uroot ${target}`,body);
 const tables=sql('SHOW TABLES;',true).split('\n');
 if(tables.some(t=>!/^\w+$/.test(t)))throw Error('Unexpected table identifier');
 const counts=db=>sql(tables.map(t=>`SELECT '${t}',COUNT(*) FROM \`${db}\`.\`${t}\``).join(' UNION ALL '));
 const original=counts(source),restored=counts(target);if(original!==restored)throw Error('Restore row counts do not match source; preserve backup for investigation');
 console.log(JSON.stringify({restoredDatabase:target,tableCounts:restored.split('\n').map(line=>{const [table,count]=line.split('\t');return{table,count:Number(count)};}),sha256:meta.sha256}));
}
