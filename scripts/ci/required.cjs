const fs=require('fs'),path=require('path');
const output=path.resolve(process.argv[2]||'artifacts/ci/required.json');const needs=JSON.parse(process.env.NEEDS_JSON||'null');
const expected=['ui','api','integration','security','containers'];
const pass=needs&&expected.every(k=>needs[k]?.result==='success');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({status:pass?'PASS':'FAIL',jobs:Object.fromEntries(expected.map(k=>[k,needs?.[k]?.result||'missing']))},null,2));if(!pass)process.exitCode=1;
