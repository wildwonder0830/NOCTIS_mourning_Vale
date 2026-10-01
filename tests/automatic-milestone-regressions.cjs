const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
async function app(t){const h=await boot();t.after(()=>h.close());h.run(`settings.apiKey='test';activeChat().messages=[{id:'a',role:'user',text:'Will you date me?'},{id:'b',role:'assistant',text:'Yes, we are dating.'}];window.calls=0;`);return h;}
test('automatic catch-up saves once, survives reload, then detects new replies',async t=>{
 const h=await app(t);h.run(`openRouterRequest=async()=>{calls++;return JSON.stringify({milestones:[{title:'Dating',line:'They agreed to date.',evidence:'Mutual agreement.',messageIndex:2,confidence:'high'}]})};`);
 await h.w.NoctisRelationshipMilestones.autoScan();await h.w.NoctisRelationshipMilestones.autoScan();
 assert.equal(h.run('calls'),1);assert.equal(h.run('activeChat().milestones.length'),1);
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),'b');
 assert.equal(h.run('activeChat().relationshipMilestoneAutoCaughtUp'),true);
 const saved=JSON.parse(h.run('JSON.stringify(vault)'));
 const reload=await boot({'noctis-mourning-vale-v0.3':saved});t.after(()=>reload.close());
 reload.run(`settings.apiKey='test';window.calls=0;openRouterRequest=async()=>{calls++;return JSON.stringify({milestones:[]})};`);
 await reload.w.NoctisRelationshipMilestones.autoScan();assert.equal(reload.run('calls'),0);
 h.run(`activeChat().messages.push(...Array.from({length:12},(_,i)=>({id:'c'+i,role:i%2?'assistant':'user',text:'New story turn'})));openRouterRequest=async()=>{calls++;return JSON.stringify({milestones:[]})};`);
 await h.w.NoctisRelationshipMilestones.autoScan();assert.equal(h.run('calls'),2);
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),'c11');
});
test('uncertain events persist for review and missing evidence cannot auto-save',async t=>{
 const h=await app(t);h.run(`openRouterRequest=async()=>JSON.stringify({milestones:[{title:'Dating',line:'Maybe dating.',evidence:'Unclear agreement.',messageIndex:2,confidence:'medium'},{title:'Married',messageIndex:2,confidence:'high'}]});`);
 await h.w.NoctisRelationshipMilestones.autoScan();assert.equal(h.run('activeChat().milestones.length'),0);
 assert.equal(h.run('activeChat().relationshipMilestoneAutoSuggestions.length'),1);
 h.w.document.getElementById('rmReviewAutomatic').click();h.w.document.getElementById('rmAddSelected').click();
 assert.equal(h.run('activeChat().milestones.length'),1);assert.equal(h.run('activeChat().relationshipMilestoneAutoSuggestions.length'),0);
});
test('failed chunks retain checkpoint, back off, and resume completed history',async t=>{
 const h=await app(t);h.run(`activeChat().messages=Array.from({length:8},(_,i)=>({id:'m'+i,role:i%2?'assistant':'user',text:'x'.repeat(6000)}));openRouterRequest=async()=>{calls++;return JSON.stringify({milestones:[]})};`);
 await h.w.NoctisRelationshipMilestones.autoScan();const checkpoint=h.run('activeChat().relationshipMilestoneScanThroughMessageId');assert.ok(checkpoint);
 h.run(`openRouterRequest=async()=>{calls++;throw Error('rate limited')};`);await h.w.NoctisRelationshipMilestones.autoScan();
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),checkpoint);
 const calls=h.run('calls');await h.w.NoctisRelationshipMilestones.autoScan();assert.equal(h.run('calls'),calls);
 h.run(`activeChat().relationshipMilestoneAutoRetryAt=0;openRouterRequest=async()=>{calls++;return JSON.stringify({milestones:[]})};`);
 await h.w.NoctisRelationshipMilestones.autoScan();assert.notEqual(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),checkpoint);
});
test('switching or editing a timeline during analysis cannot commit stale results',async t=>{
 const h=await app(t);h.run(`window.origin=activeChat();openRouterRequest=()=>new Promise(r=>window.finish=r);`);
 const task=h.w.NoctisRelationshipMilestones.autoScan();h.run(`activeChat().messages[1].text='No, we are not dating.';finish(JSON.stringify({milestones:[]}));`);await task;
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),null);
 h.run(`activeChat().relationshipMilestoneAutoRetryAt=0;`);const next=h.w.NoctisRelationshipMilestones.autoScan();
 h.run(`const other=newChat('Other');activeCharacter().chats.push(other);activeCharacter().activeChatId=other.id;finish(JSON.stringify({milestones:[]}));`);await next;
 assert.equal(h.run('origin.relationshipMilestoneScanThroughMessageId'),null);
});
test('disabled automation and invalid responses never advance milestones',async t=>{
 const h=await app(t);h.run(`settings.autoRelationshipMilestones=false;openRouterRequest=async()=>{calls++;return JSON.stringify({})};`);
 await h.w.NoctisRelationshipMilestones.autoScan();assert.equal(h.run('calls'),0);
 h.run(`settings.autoRelationshipMilestones=true;`);await h.w.NoctisRelationshipMilestones.autoScan();
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),null);
 assert.match(h.run('activeChat().relationshipMilestoneAutoStatus'),/Invalid milestone response/);
});
