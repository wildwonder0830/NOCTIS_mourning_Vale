const test=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
async function app(t){const h=await boot();t.after(()=>h.close());return h;}
async function send(h,text='Hello'){
 h.w.document.getElementById('phoneInput').value=text;
 h.w.document.getElementById('phoneForm').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));
 await h.settle();
}
const thread='activeChat().phoneThreads[activeCharacter().activePhoneContactId]';
const leak='The user wants me to write an unsolicited text message from "New Character". Looking at the context:\n1. Recent phone thread...';

test('phone output removes delimited reasoning and rejects incomplete or free-form planning',async t=>{
 const h=await app(t),guard=h.w.NoctisPhoneOutput;
 assert.equal(guard.clean('<think>private planning</think>Meet me at eight.'),'Meet me at eight.');
 for(const value of [leak,'<think>incomplete','<analysis>only planning</analysis>','I need to write one text message to Amanda.','Analysis: choose a reply'])assert.throws(()=>guard.clean(value));
 for(const value of ['Let me think about it.','I need to write a letter to my brother.','The tea is ready.','I love you.'])assert.equal(guard.clean(value),value);
});
test('direct phone replies reject commentary once without saving it or retrying',async t=>{
 const h=await app(t);h.w.responseText=leak;
 h.run('window.calls=0;openRouterRequest=async()=>{calls++;return responseText};');
 await send(h);
 assert.equal(h.run('calls'),1);assert.equal(h.run(`${thread}.length`),1);
 assert.equal(h.run(`${thread}[0].role`),'user');
 assert.match(h.alerts.at(-1),/planning text/);
 assert.equal(h.w.document.getElementById('phoneSendBtn').disabled,false);
 assert.equal(h.w.document.getElementById('phoneTyping').textContent,'');
});
test('clean direct replies save only the final message',async t=>{
 const h=await app(t);h.run('openRouterRequest=async()=>"<think>I should confess my love</think>The tea is ready.";');
 await send(h);
 assert.equal(h.run(`${thread}.at(-1).text`),'The tea is ready.');
 assert.equal(Boolean(h.run('activeChat().pendingMilestone')),false);
});
test('existing bad messages are hidden and excluded from both continuity paths without erasing originals',async t=>{
 const h=await app(t);h.w.bad=leak;
 h.run(`window.original={id:'bad',role:'assistant',text:bad,createdAt:now()};${thread}.push(original,{id:'good',role:'assistant',text:'Tea is ready.',createdAt:now()});renderAll();`);
 assert.match(h.w.document.getElementById('phoneMessages').textContent,/Model commentary hidden/);
 assert.ok(!h.w.document.getElementById('phoneMessages').textContent.includes(leak));
 assert.ok(!h.run('compileSystemPrompt()').includes(leak));
 assert.ok(!h.run('JSON.stringify(apiMessages())').includes(leak));
 assert.equal(h.run(`${thread}[0].text`),leak);
 assert.ok(h.run('compileSystemPrompt()').includes('Tea is ready.'));
 h.run('openRouterRequest=async messages=>{window.lastPhone=JSON.stringify(messages);return "On my way."};');await send(h);
 assert.ok(!h.w.lastPhone.includes('Looking at the context'));
});
test('unnamed contacts cannot spend credits and leave the composer intact',async t=>{
 const h=await app(t);
 h.run('activeCharacter().phoneContacts[0].name="New Character";window.calls=0;openRouterRequest=async()=>{calls++;return "Hello"};');
 await send(h,'Keep my draft');
 assert.equal(h.run('calls'),0);assert.equal(h.w.document.getElementById('phoneInput').value,'Keep my draft');
 assert.match(h.alerts.at(-1),/Contact Settings/);
 const ambient=h.intervals.find(x=>x.callback.name==='maybeSendAmbientText').callback;
 h.run('settings.ambientTextsEnabled=true;activeChat().nextAmbientTextAt=1;');await ambient();
 assert.equal(h.run('calls'),0);
});
test('automatic texts reject the screenshot failure without unread or daily-send increments',async t=>{
 const h=await app(t);h.w.responseText=leak;
 h.run('settings.ambientTextsEnabled=true;activeChat().nextAmbientTextAt=1;window.calls=0;openRouterRequest=async m=>{calls++;window.ambientPrompt=m[0].content;return responseText};');
 const ambient=h.intervals.find(x=>x.callback.name==='maybeSendAmbientText').callback;
 await ambient();
 assert.equal(h.run('calls'),1);assert.equal(h.run(`${thread}.length`),0);
 assert.equal(h.run('activeChat().ambientTextsToday'),0);
 assert.equal(h.run('Object.values(activeChat().phoneUnread).reduce((a,b)=>a+b,0)'),0);
 assert.match(h.w.ambientPrompt,/PHONE \/ TEXT MESSAGE MODE/);
 assert.ok(h.run('activeChat().nextAmbientTextAt')>Date.now());
 h.w.responseText='Are you still awake?';h.run('activeChat().nextAmbientTextAt=1;');await ambient();
 assert.equal(h.run(`${thread}.at(-1).text`),'Are you still awake?');
 assert.equal(h.run('activeChat().ambientTextsToday'),1);
});
test('group output validation is atomic and retains valid named replies',async t=>{
 const h=await app(t);h.w.document.getElementById('createBestieTrioBtn').click();
 h.run('document.getElementById("phoneForm").dataset.groupId=activeChat().phoneGroups[0].id;openRouterRequest=async()=>"Mara|Hello\\nVivian|The user wants me to write a reply.";');
 await send(h);
 assert.equal(h.run('activeChat().groupThreads[activeChat().phoneGroups[0].id].length'),1);
 assert.match(h.alerts.at(-1),/planning text/);
 h.run('document.getElementById("phoneForm").dataset.groupId=activeChat().phoneGroups[0].id;openRouterRequest=async()=>"<think>planning</think>Mara|Hello\\nVivian|Meet us downstairs.";');
 await send(h);
 assert.equal(h.run('activeChat().groupThreads[activeChat().phoneGroups[0].id].length'),4);
});
test('provider request excludes separate reasoning and reads final content only',async t=>{
 const h=await app(t);
 h.w.__fetchMock=async()=>{const data={choices:[{message:{content:'Final message',reasoning:'Private planning'}}]};return {ok:true,json:async()=>data,clone:()=>({json:async()=>data})};};
 h.run('settings.apiKey="test-key";');
 assert.equal(await h.run('openRouterRequest([{role:"user",content:"Hi"}])'),'Final message');
 assert.equal(JSON.parse(h.requests[0][1].body).reasoning.exclude,true);
});
