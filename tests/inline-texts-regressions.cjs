const test=require('node:test');const assert=require('node:assert/strict');const {boot}=require('./app-harness.cjs');
async function app(t){const h=await boot();t.after(()=>h.close());return h;}
test('story text cards preserve stored content, bold prose and safe text rendering',async t=>{
 const h=await app(t);
 h.run(`activeChat().messages=[{id:'inline-test',role:'assistant',text:'**He waits.**\\n[[PHONE:Derek]]<img src=x onerror=alert(1)> Are you there?[[/PHONE]]\\nThen silence.'}];renderMessages();`);
 assert.equal(h.w.document.querySelectorAll('.inline-story-text').length,1);
 assert.match(h.w.document.querySelector('.inline-story-text').textContent,/Derek/);
 assert.equal(h.w.document.querySelector('.inline-story-text img'),null);
 assert.equal(h.w.document.querySelector('.message-body strong').textContent,'He waits.');
 assert.match(h.run('activeChat().messages[0].text'),/\[\[PHONE:Derek\]\]/);
 h.run('renderMessages()');assert.equal(h.w.document.querySelectorAll('.inline-story-text').length,1);
 assert.equal(h.requests.length,0);
});
test('legacy threads survive and are readable but are not repeated in prompts',async t=>{
 const h=await app(t);
 h.run(`activeCharacter().phoneContacts=[{id:'d',name:'Derek',relationship:'friend'}];activeChat().phoneThreads={d:[{role:'assistant',text:'UNIQUE_ARCHIVE_CONTENT'}]};activeChat().phoneGroups=[{id:'g',name:'Friends'}];activeChat().groupThreads={g:[{role:'user',text:'GROUP_ARCHIVE_CONTENT'}]};renderAll();`);
 const archive=h.w.document.getElementById('legacyPhoneArchive');archive.open=true;archive.dispatchEvent(new h.w.Event('toggle'));
 assert.match(archive.textContent,/UNIQUE_ARCHIVE_CONTENT/);assert.match(archive.textContent,/GROUP_ARCHIVE_CONTENT/);
 const prompt=h.run('compileSystemPrompt()');assert.doesNotMatch(prompt,/UNIQUE_ARCHIVE_CONTENT/);assert.match(prompt,/Known contacts:\nDerek/);
 assert.equal(h.run('activeChat().phoneThreads.d.length'),1);assert.equal(h.requests.length,0);
});
test('phone generation is disabled even if old settings are enabled',async t=>{
 const h=await app(t);h.run('settings.ambientTextsEnabled=true');
 for(const interval of h.intervals.filter(i=>i.delay===60000))await interval.callback();
 await h.settle();assert.equal(h.requests.length,0);
 h.run(`selectTab('phone')`);assert.equal(h.w.document.querySelector('[data-view="phone"]').classList.contains('active'),false);
});
