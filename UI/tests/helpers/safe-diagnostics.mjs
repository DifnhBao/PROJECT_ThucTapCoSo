import fs from 'node:fs/promises';
const words=new Set('api auth admin login register logout refresh-token users me songs search view upload favorites like-status ratings playlists summary recommendations pending approve reject artists activity media similar profile'.split(' '));
export function safeRoute(url){try{return new URL(url).pathname.split('/').map(s=>words.has(s)?s:s?':value':'').join('/');}catch{return '[invalid]';}}
export function attachDiagnostics(page){
 const trace=[],start=Date.now();const push=row=>{trace.push({atMs:Date.now()-start,...row});if(trace.length>400)trace.shift();};
 page.on('response',r=>{const id=r.headers()['x-request-id'];push({event:'response',method:r.request().method(),route:safeRoute(r.url()),status:r.status(),...(/^[0-9a-f-]{36}$/i.test(id||'')?{requestId:id}:{})});});
 page.on('requestfailed',r=>push({event:'requestfailed',method:r.method(),route:safeRoute(r.url())}));
 page.on('pageerror',()=>push({event:'pageerror'}));
 return trace;
}
export async function saveFailure(file,error,stage,traces){
 const frames=String(error.stack||'').split('\n').slice(1).flatMap(s=>{const m=s.match(/([\w.-]+\.(?:mjs|cjs|tsx|ts|js):\d+:\d+)/);return m?[m[1]]:[];});
 await fs.writeFile(file,JSON.stringify({stage,errorType:['Error','AssertionError','TimeoutError','TypeError','SyntaxError','RangeError','ApiError'].includes(error.name)?error.name:'Error',frames,traces},null,2));
}
