// One free Render service; API is loopback-only, Next owns the public port.
const cp=require('node:child_process'),path=require('node:path');
function publicPort(env){const port=String(env.PORT||'10000');if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535||Number(port)===5000)throw Error('INVALID_PUBLIC_PORT');return port;}
function serviceEnvironment(env){
  const result={...env};
  if(!result.WEB_ORIGINS&&result.RENDER==='true'){
    let url;try{url=new URL(result.RENDER_EXTERNAL_URL);}catch{throw Error('INVALID_RENDER_ORIGIN');}
    if(url.protocol!=='https:'||url.origin!==result.RENDER_EXTERNAL_URL.replace(/\/$/,''))throw Error('INVALID_RENDER_ORIGIN');
    result.WEB_ORIGINS=url.origin;
  }
  return result;
}
function start({env=process.env,spawn=cp.spawn,signals=process,root='/app',deadlineMs=15000}={}){
  env=serviceEnvironment(env);
  const port=publicPort(env),children=[];let stopping=false,exitCode=0,timer;
  return new Promise(resolve=>{
    function stop(failed){if(failed)exitCode=1;if(stopping)return;stopping=true;for(const c of children)if(!c.closed)c.child.kill('SIGTERM');timer=setTimeout(()=>{exitCode=1;for(const c of children)if(!c.closed)c.child.kill('SIGKILL');},deadlineMs);timer.unref();}
    const onSignal=()=>stop(false);signals.once('SIGTERM',onSignal);signals.once('SIGINT',onSignal);
    for(const [name,args,cwd,overrides] of [
      ['api',['-e',"require('./src/server').startServer({host:'127.0.0.1'}).catch(()=>{console.error('API startup failed');process.exitCode=1;})"],'api',{PORT:'5000'}],
      ['web',['server.js'],'web',{PORT:port,HOSTNAME:'0.0.0.0'}],
    ]){
      const child=spawn(process.execPath,args,{cwd:path.join(root,cwd),env:{...env,...overrides},stdio:'inherit',windowsHide:true}),entry={child,closed:false};children.push(entry);
      child.once('error',()=>stop(true));
      child.once('close',code=>{entry.closed=true;if(stopping&&code!==null&&code!==undefined&&code!==0)exitCode=1;if(!stopping)stop(true);if(children.length===2&&children.every(c=>c.closed)){clearTimeout(timer);signals.removeListener('SIGTERM',onSignal);signals.removeListener('SIGINT',onSignal);resolve(exitCode);}});
      // Only constant service names are logged; never the inherited environment.
      child.once('error',()=>console.error('Demo child failed: '+name));
    }
  });
}
if(require.main===module){start().then(code=>{process.exitCode=code;}).catch(()=>{console.error('Demo startup failed');process.exitCode=1;});}
module.exports={start,publicPort,serviceEnvironment};
