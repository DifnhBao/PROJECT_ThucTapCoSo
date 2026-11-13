import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {safeRoute,saveFailure} from '../helpers/safe-diagnostics.mjs';
test('CI diagnostic URLs discard queries, identifiers and arbitrary path content',()=>{
 assert.equal(safeRoute('http://localhost/api/songs/123?password=private-query'),'/api/songs/:value');
 assert.equal(safeRoute('https://host/api/auth/private-path-token'),'/'+'api/auth/:value');
 assert.equal(safeRoute('not a URL'),'[invalid]');
});

test('CI failure metadata excludes error message and arbitrary exception names',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ci-safe-'));const file=path.join(dir,'failure.json');
 try{await saveFailure(file,{name:'private-name',message:'private-message',stack:'Error: private-message\n at run (/workspace/test.mjs:10:2)'},'fixed-stage',{user:[]});const raw=await fs.readFile(file,'utf8');assert.equal(raw.includes('private-'),false);assert.deepEqual(JSON.parse(raw).frames,['test.mjs:10:2']);}finally{await fs.unlink(file).catch(()=>{});await fs.rmdir(dir);}
});
