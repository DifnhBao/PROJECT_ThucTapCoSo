const {performance}=require('node:perf_hooks');
const namespaces=new Set(['auth','songs','users','playlists','ratings','favorites','artists','activity','recommendations','media']);
function accessLog(req,res,next) {
  const started=performance.now();let logged=false;
  const finish=()=>{
    if(logged)return;logged=true;
    const namespace=req.originalUrl.split('/')[2];
    const route=typeof req.route?.path==='string'?req.route.path:'[unmatched]';
    // Fixed schema: never serialize body, query, raw URL, headers or errors.
    console.info(JSON.stringify({event:'http_request',requestId:req.requestId,method:req.method,
      route:(namespaces.has(namespace)?'/api/'+namespace:'')+route,
      status:res.writableFinished?res.statusCode:499,durationMs:Math.round((performance.now()-started)*100)/100}));
  };
  res.once('finish',finish);res.once('close',finish);next();
}
module.exports={accessLog};
