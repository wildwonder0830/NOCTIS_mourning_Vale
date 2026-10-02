const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
test('dialogue, actions and texts render safely without rewriting stored messages',async t=>{
 const h=await boot();t.after(()=>h.close());
 const source='**He opens the door.** “Welcome home.” *He smiles.* "Tea?" [[PHONE:Alex]]See you soon.[[/PHONE]] <img src=x onerror=alert(1)>';
 h.w.sample=source;
 h.run(`activeChat().messages=[{id:'one',role:'assistant',text:sample,cleanedFormatting:true}];renderMessages();`);
 const d=h.w.document;
 assert.equal(d.querySelectorAll('.story-dialogue').length,2);
 assert.equal(d.querySelectorAll('.story-action').length,2);
 assert.equal(d.querySelectorAll('.inline-story-text').length,1);
 assert.equal(d.querySelectorAll('#messages img').length,0);
 assert.equal(h.run('activeChat().messages[0].text'),source);
 h.run('renderMessages()');assert.equal(d.querySelectorAll('.story-dialogue').length,2);
 assert.equal(h.requests.length,0);
});
test('milestones remain in chat and can replay without a generation',async t=>{
 const h=await boot();t.after(()=>h.close());
 h.run(`activeChat().messages=[{id:'one',role:'assistant',text:'A promise was made.',cleanedFormatting:true}];renderMessages();`);
 h.w.NoctisRelationshipMilestones.add({title:'Committed',line:'They made a promise.',sourceMessageId:'one',show:false});
 const d=h.w.document,card=d.querySelector('.story-milestone-card');assert.ok(card);
 assert.equal(card.previousElementSibling.dataset.messageId,'one');
 card.querySelector('button').click();await h.settle();
 assert.equal(d.getElementById('rmCeremonyTitle').textContent,'Committed');
 assert.ok(!d.getElementById('relationshipMilestoneCeremony').classList.contains('hidden'));
 assert.equal(h.requests.length,0);
});
test('live automatic celebration waits until the matching chat is visible',async t=>{
 const h=await boot();t.after(()=>h.close());
 h.run(`settings.apiKey='test';activeChat().relationshipMilestoneAutoCaughtUp=true;activeChat().messages=Array.from({length:12},(_,i)=>({id:'m'+i,role:i%2?'assistant':'user',text:'A story turn'}));openRouterRequest=async()=>JSON.stringify({milestones:[{title:'Committed',line:'A promise.',evidence:'They agreed.',messageIndex:12,confidence:'high'}]});selectTab('settings');`);
 await h.w.NoctisRelationshipMilestones.autoScan();
 assert.equal(h.run('activeChat().milestones[0].pendingCelebration'),true);
 h.run(`selectTab('chat')`);await h.settle();
 assert.equal(h.run('activeChat().milestones[0].pendingCelebration'),false);
 assert.ok(!h.w.document.getElementById('relationshipMilestoneCeremony').classList.contains('hidden'));
});

test('milestones have a dedicated top-level tab',async t=>{
 const h=await boot();t.after(()=>h.close());
 const d=h.w.document;
 assert.ok(d.querySelector('.tab[data-tab="milestones"]'));
 assert.ok(d.querySelector('[data-view="milestones"] #milestoneList'));
 assert.ok(d.querySelector('[data-view="milestones"] #relationshipMilestonePanel'));
 h.run('selectTab("milestones")');
 assert.ok(d.querySelector('[data-view="milestones"]').classList.contains('active'));
});

test('recent milestone discovered during first catch-up still celebrates',async t=>{
 const h=await boot();t.after(()=>h.close());
 h.run(`settings.apiKey='test';activeChat().relationshipMilestoneAutoCaughtUp=false;activeChat().messages=[{id:'m1',role:'user',text:'Will you marry me?'},{id:'m2',role:'assistant',text:'Yes. We are engaged.'}];openRouterRequest=async()=>JSON.stringify({milestones:[{title:'Engaged',line:'They promised a future together.',evidence:'A proposal was accepted.',messageIndex:2,confidence:'high'}]});selectTab('chat');`);
 await h.w.NoctisRelationshipMilestones.autoScan();await h.settle();
 assert.equal(h.run('activeChat().milestones[0].pendingCelebration'),false);
 assert.equal(h.w.document.getElementById('rmCeremonyTitle').textContent,'Engaged');
 assert.ok(!h.w.document.getElementById('relationshipMilestoneCeremony').classList.contains('hidden'));
});

test('milestone sync repairs a truncated closing bracket response locally',async t=>{
 const h=await boot();t.after(()=>h.close());
 h.run(`settings.apiKey='test';activeChat().messages=[{id:'m1',role:'user',text:'Will you marry me?'},{id:'m2',role:'assistant',text:'Yes. We are engaged.'}];openRouterRequest=async()=>'{"milestones":[{"title":"Engaged","line":"They promised a future together.","evidence":"A proposal was accepted.","messageIndex":2,"confidence":"high"}}';`);
 await h.w.NoctisRelationshipMilestones.sync();await h.settle();
 assert.equal(h.run('activeChat().milestones.length'),0);
 assert.match(h.w.document.getElementById('rmSyncStatus').textContent,/found 1|1 milestone/i);
});
