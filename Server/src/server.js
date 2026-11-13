async function startServer({port,host,readinessProbe}={}) {
  const {loadEnvironment,getRuntimeConfig}=require('./config/env');loadEnvironment();
  const config=getRuntimeConfig();
  const {probeDatabase,readiness}=require('./operations/health');
  const state={draining:false},probe=readinessProbe||probeDatabase;
  const app=require('./app').createApp({readinessProbe:probe,runtimeState:state});
  const {sequelize}=require('./models');
  const server=require('node:http').createServer(app);
  try {
    await sequelize.authenticate();await readiness(probe)();
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port??config.port,host,()=>{server.removeListener('error',reject);resolve();});});
  } catch(e) {await sequelize.close();throw e;}
  const stop=require('./operations/shutdown').createShutdown({server,pool:sequelize,state});
  const shutdown=()=>{process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);return stop();};
  function onSignal(){shutdown().catch(()=>{console.error(JSON.stringify({event:'shutdown_failed'}));process.exitCode=1;});}
  process.once('SIGINT',onSignal);process.once('SIGTERM',onSignal);
  console.info(JSON.stringify({event:'api_started',port:server.address().port}));
  return {app,server,shutdown};
}
if(require.main===module)startServer().catch(e=>{
  const {ConfigurationError}=require('./config/env');
  console.error(JSON.stringify({event:'startup_failed',message:e instanceof ConfigurationError?e.message:'Database/schema/configuration unavailable'}));process.exitCode=1;
});
module.exports={startServer};
