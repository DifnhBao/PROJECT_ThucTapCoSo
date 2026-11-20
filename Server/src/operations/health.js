const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../config/env');
const required = {
  users: ['user_id','role'], songs: ['song_id','status','is_visible'],
  refresh_tokens: ['family_id','scope','token','revoked_at'],
  UserActivities: ['event_id','qualified'], recommendation_state: ['active_run_id'],
  media_assets: ['id','state'],
};
function assertSchema(migrations, columns) {
  const expected=fs.readdirSync(path.resolve(__dirname,'../../migrations')).filter(n=>n.endsWith('.js')).sort();
  if (migrations.length!==expected.length || expected.some(n=>!migrations.includes(n))) throw new Error('Schema migration version mismatch');
  for(const [table,names] of Object.entries(required)) for(const name of names) {
    if(!columns.some(c=>c.TABLE_NAME.toLowerCase()===table.toLowerCase() && c.COLUMN_NAME.toLowerCase()===name.toLowerCase())) throw new Error('Required schema column missing');
  }
}
async function probeDatabase() {
  const d=getDatabaseConfig();
  const c=await mysql.createConnection({host:d.host,port:d.port,user:d.username,password:d.password,database:d.database,connectTimeout:1000});
  try {
    const [m]=await c.query({sql:'SELECT name FROM SequelizeMeta',timeout:1000});
    const [columns]=await c.query({sql:'SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()',timeout:1000});
    assertSchema(m.map(r=>r.name),columns);
  } finally { c.destroy(); }
}
function readiness(probe=probeDatabase, timeoutMs=2500) {
  let flight;
  return () => {
    if(flight)return flight;
    let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Readiness deadline')),timeoutMs);});
    flight=Promise.race([Promise.resolve().then(probe),deadline]).finally(()=>{clearTimeout(timer);flight=null;});
    return flight;
  };
}
function mountHealth(app,{probe=probeDatabase,state={draining:false}}={}) {
  const check=readiness(probe);
  app.get('/health/live',(_req,res)=>res.json({status:'live'}));
  app.get('/health/ready',async(_req,res)=>{
    if(state.draining)return res.status(503).json({status:'not_ready'});
    try {await check();return res.status(state.draining?503:200).json({status:state.draining?'not_ready':'ready'});}
    catch {return res.status(503).json({status:'not_ready'});}
  });
}
module.exports={assertSchema,probeDatabase,readiness,mountHealth};
