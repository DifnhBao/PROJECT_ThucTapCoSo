const {test}=require('node:test');
const assert=require('node:assert/strict');
test('T21 deliberate regression proves required CI blocks a failing test',()=>assert.fail('T21 controlled red proof; remove after failed run is recorded'));
