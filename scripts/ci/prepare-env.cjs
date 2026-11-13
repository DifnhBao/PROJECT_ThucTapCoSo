const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),file=path.resolve(process.argv[2]||'');
const allowed=[path.join(root,'.local-backups'),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
if(!allowed.some(p=>file.startsWith(p+path.sep)))throw Error('CI env must stay in ignored workspace or RUNNER_TEMP');
const secret=()=>crypto.randomBytes(24).toString('hex');const password='Ci1!'+secret();
const vars={NODE_ENV:'test',TEST_DB_HOST:'127.0.0.1',TEST_DB_PORT:'3307',TEST_DB_NAME:'tunetrek_test_ci',TEST_DB_USER:'ci_test_runner',TEST_DB_PASS:secret(),TEST_MYSQL_ROOT_PASSWORD:secret(),TEST_DB_RESET_ALLOWED:'yes',TEST_SEED_PASSWORD:password,JWT_SECRET:secret(),JWT_REFRESH_SECRET:secret(),CLOUDINARY_CLOUD_NAME:'ci-only',CLOUDINARY_API_KEY:'ci-only',CLOUDINARY_API_SECRET:'ci-only',MYSQL_DATABASE:'tunetrek_test_ci',MYSQL_ROOT_PASSWORD:secret(),DB_USER:'ci_test_runner',DB_PASS:secret(),MIGRATION_DB_USER:'ci_migrator',MIGRATION_DB_PASS:secret(),WEB_ORIGINS:'http://127.0.0.1:3000',APP_NODE_ENV:'development'};
fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Object.entries(vars).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{flag:'wx',mode:0o600});
if(process.env.GITHUB_ACTIONS==='true')for(const [key,value]of Object.entries(vars))if(/PASS|SECRET|KEY/.test(key))console.log('::add-mask::'+value);
console.log('Prepared isolated CI configuration; no production fallback.');
