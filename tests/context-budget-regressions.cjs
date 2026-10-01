const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
test('compact context preserves stored transcript, hard limits, memory and latest turns',async t=>{
 const h=await boot();t.after(()=>h.close());
 h.run(`activeChat().messages=Array.from({length:40},(_,i)=>({id:'m'+i,role:i%2?'assistant':'user',text:'Turn '+i+' '+ 'x'.repeat(1500)}));activeChat().consolidatedMemory='Important earlier promise';activePersona().profileSheet.fields.hardLimits='Protected limit '+ 'z'.repeat(3500);activePersona().profileSheet.fields.q123='Interview duplicate marker';`);
 const sent=JSON.parse(h.run('JSON.stringify(apiMessages())'));
 assert.ok(sent.filter(x=>x.role!=='system').length<=16);
 assert.ok(sent.some(x=>x.content.includes('Turn 39')));
 assert.ok(sent[0].content.includes('Important earlier promise'));
 assert.ok(sent[0].content.includes('Protected limit '+ 'z'.repeat(3500)));
 assert.ok(!sent[0].content.includes('Interview duplicate marker'));
 assert.equal(h.run('activeChat().messages.length'),40);
});
test('automatic milestones batch live replies and share a four-batch daily ceiling',async t=>{
 const h=await boot();t.after(()=>h.close());
 h.run(`settings.apiKey='test';window.calls=0;openRouterRequest=async()=>{calls++;return JSON.stringify({milestones:[]})};activeChat().messages=[{id:'a',role:'assistant',text:'Hello'}];`);
 await h.w.NoctisRelationshipMilestones.autoScan();
 h.run(`activeChat().messages.push({id:'b',role:'assistant',text:'Another reply'});`);
 await h.w.NoctisRelationshipMilestones.autoScan();assert.equal(h.run('calls'),1);
 h.run(`activeChat().messages.push(...Array.from({length:12},(_,i)=>({id:'c'+i,role:'assistant',text:'A new turn'})));localStorage.setItem('noctis-milestone-auto-budget',JSON.stringify({day:new Date().toISOString().slice(0,10),count:4}));`);
 await h.w.NoctisRelationshipMilestones.autoScan();assert.equal(h.run('calls'),1);
 assert.match(h.run('activeChat().relationshipMilestoneAutoStatus'),/daily scan budget/);
});
test('daily allowance errors are returned after one provider request',async t=>{
 const h=await boot();t.after(()=>h.close());h.run(`settings.apiKey='test';`);
 h.w.__fetchMock=async()=>{const data={error:{message:'Rate limit exceeded: free-models-per-day',code:429}};return {ok:false,status:429,json:async()=>data,clone:()=>({json:async()=>data})};};
 await assert.rejects(h.run(`openRouterRequest([{role:'user',content:'test'}])`),/free-models-per-day/);
 assert.equal(h.requests.length,1);
});
