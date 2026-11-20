const url=new URL(process.argv[2]);
if(!['127.0.0.1','localhost'].includes(url.hostname))process.exit(1);
fetch(url,{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1));
