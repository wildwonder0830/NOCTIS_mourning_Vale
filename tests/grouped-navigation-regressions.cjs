const test=require('node:test');const assert=require('node:assert/strict');const {boot}=require('./app-harness.cjs');
async function app(t){const h=await boot();t.after(()=>h.close());return h;}
test('editors and memory tools activate their parent tab and one view',async t=>{
 const h=await app(t);
 for(const [view,parent] of [['library','library'],['character','library'],['persona','library'],['memory','memory'],['lore','memory'],['rescue','memory'],['chat','chat'],['stats','stats'],['settings','settings']]){
   h.run(`selectTab('${view}')`);
   assert.equal(h.w.document.querySelectorAll('.view.active').length,1);
   assert.equal(h.w.document.querySelector('.view.active').dataset.view,view);
   assert.equal(h.w.document.querySelector('.tabs .active').dataset.tab,parent);
 }
 for(const key of ['character','persona','lore','rescue'])assert.equal(h.w.document.querySelector(`.tabs [data-tab="${key}"]`),null);
 assert.equal(h.requests.length,0);assert.deepEqual(h.errors,[]);
});
test('Library subsection buttons and existing create-character action stay connected',async t=>{
 const h=await app(t);
 h.w.document.querySelector('[data-view="library"] [data-section="persona"]').click();
 assert.equal(h.w.document.querySelector('.view.active').dataset.view,'persona');
 assert.ok(h.w.document.getElementById('personaSlotRow'));
 h.w.prompt=()=> 'New test character';h.run(`selectTab('library')`);h.w.document.getElementById('newCharacterBtn').click();
 assert.equal(h.w.document.querySelector('.view.active').dataset.view,'character');
 assert.equal(h.w.document.querySelector('.tabs .active').dataset.tab,'library');
 h.w.document.querySelector('[data-view="character"] [data-section="library"]').click();
 assert.equal(h.w.document.querySelector('.view.active').dataset.view,'library');
 assert.equal(h.requests.length,0);
});
