const fs=require('fs'),path=require('path');const files=process.argv.slice(2);if(!files.length)throw Error('Audit inputs required');
const root=path.resolve(__dirname,'../..'),policy=JSON.parse(fs.readFileSync(path.join(root,'docs/security/dependency-exceptions.json')));const findings=[];let failed=false;
for(const file of files){let x;try{x=JSON.parse(fs.readFileSync(file));}catch{failed=true;continue;}if(x.error||!x.metadata||!x.vulnerabilities){failed=true;continue;}
 for(const [name,v]of Object.entries(x.vulnerabilities)){const blocking=['high','critical'].includes(v.severity);
  const advisories=v.via.filter(a=>typeof a==='object').map(a=>String(a.source));
  const accepted=advisories.length>0&&advisories.every(id=>policy.some(p=>p.package===name&&p.advisory===id&&p.owner&&p.reason&&Date.parse(p.expiresAt)>Date.now()));
  findings.push({package:name,severity:v.severity,advisories,state:blocking?(accepted?'accepted':'blocked'):'below-threshold'});if(blocking&&!accepted)failed=true;
 }}
const output=path.resolve(process.env.CI_SAFE_DIR||path.join(root,'artifacts/ci'));fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'dependency-audit.json'),JSON.stringify({status:failed?'FAIL':'PASS',gateThreshold:'high',findings},null,2));console.log((failed?'FAIL':'PASS')+' dependency policy');if(failed)process.exitCode=1;
