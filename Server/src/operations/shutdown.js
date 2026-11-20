function createShutdown({server,pool,state,timeoutMs=10000}) {
  let flight;
  return function shutdown() {
    if(flight)return flight;
    state.draining=true;
    console.info(JSON.stringify({event:'shutdown_started'}));
    flight=(async()=>{
      const force=setTimeout(()=>{console.error(JSON.stringify({event:'shutdown_timeout'}));server.closeAllConnections();process.exit(1);},timeoutMs);
      force.unref();
      try {
        await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
        await pool.close();console.info(JSON.stringify({event:'shutdown_complete'}));
      } finally {clearTimeout(force);}
    })();
    return flight;
  };
}
module.exports={createShutdown};
