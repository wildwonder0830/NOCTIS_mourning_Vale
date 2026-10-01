const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
test('polish preserves controls and navigation without requests',async()=>{
  const h=await boot();
  try {
    const d=h.w.document;
    assert.ok(d.querySelector('.vault-tools #exportBtn'));
    assert.ok(d.querySelector('.vault-tools #importInput'));
    assert.ok(d.querySelector('[data-view="settings"] #buildBadge'));
    assert.ok(d.querySelector('.story-tools #deleteChatBtn'));
    assert.ok(d.querySelector('.card-continue'));
    h.run('selectTab("memory")'); await h.settle();
    assert.equal(d.querySelector('#topbar h1').textContent,'Memory');
    const size=d.getElementById('readingSize'); size.value='large';
    size.dispatchEvent(new h.w.Event('change'));
    assert.equal(d.documentElement.dataset.readingSize,'large');
    assert.equal(h.w.localStorage.getItem('noctis.readingSize'),'large');
    assert.equal(h.requests.length,0);
    assert.deepEqual(h.errors,[]);
  } finally {h.close();}
});
