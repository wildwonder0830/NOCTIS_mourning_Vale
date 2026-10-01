const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
test('love-interest editor persists multiple people and prompt keeps them distinct',async t=>{
 const h=await boot();t.after(()=>h.close());
 const d=h.w.document;
 h.run(`selectTab('character');document.getElementById('addLoveInterestBtn').click();document.querySelector('.li-name').value='Dante';document.querySelector('.li-name').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.li-role').value='Mafia don';document.querySelector('.li-role').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('addLoveInterestBtn').click();`);
 assert.equal(h.run('activeCharacter().loveInterests.length'),2);
 assert.match(h.run('compileSystemPrompt()'),/LOVE INTERESTS \/ ROMANTIC ENSEMBLE/);
 assert.match(h.run('compileSystemPrompt()'),/Dante/);
 assert.equal(d.querySelectorAll('.love-interest-card').length,2);
 assert.equal(h.requests.length,0);assert.deepEqual(h.errors,[]);
});
test('legacy characters receive an empty love-interest list without changing existing canon',async t=>{
 const h=await boot();t.after(()=>h.close());
 assert.ok(Array.isArray(h.run('activeCharacter().loveInterests')));
 assert.equal(h.run('activeCharacter().backstory'), 'A temporary test character used to validate the Noctis Mourning Vale engine.');
});
