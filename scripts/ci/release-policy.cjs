const cp=require('child_process'),fs=require('fs'),path=require('path');
function successful(runs,sha,repo){return runs.find(r=>r.head_sha===sha&&r.event==='push'&&r.status==='completed'&&r.conclusion==='success'&&r.head_repository?.full_name===repo);}
async function main(){const sha=process.env.RELEASE_SHA,repo=process.env.GITHUB_REPOSITORY;
 if(!/^[a-f0-9]{40}$/.test(sha||'')||!/^[-\w.]+\/[-\w.]+$/.test(repo||''))throw Error('Exact commit SHA and repository required');
 cp.execFileSync('git',['merge-base','--is-ancestor',sha,'origin/main'],{stdio:'ignore'});
 const r=await fetch(`https://api.github.com/repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&per_page=100`,{headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json'}});if(!r.ok)throw Error('Unable to verify CI status');
 const run=successful((await r.json()).workflow_runs,sha,repo);if(!run)throw Error('No successful push CI run for this exact main ancestor');
 fs.mkdirSync('artifacts/release',{recursive:true});fs.writeFileSync('artifacts/release/policy.json',JSON.stringify({sha,ciRun:run.html_url,repository:repo},null,2));console.log('PASS release policy');
}
if(require.main===module)main().catch(()=>{console.error('FAIL release policy: require exact tested main commit');process.exitCode=1;});module.exports={successful};
