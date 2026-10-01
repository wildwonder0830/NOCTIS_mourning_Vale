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
test('legacy phone submission cannot generate replies or modify archived threads',async t=>{
 const h=await app(t);h.run('window.calls=0;openRouterRequest=async()=>{calls++;return "Hello"};');
 const before=h.run(`JSON.stringify(${thread})`);await send(h);
 assert.equal(h.run('calls'),0);assert.equal(h.run(`JSON.stringify(${thread})`),before);
 assert.equal(h.intervals.some(x=>x.callback.name==='maybeSendAmbientText'),false);
});
test('provider request excludes separate reasoning and reads final content only',async t=>{
 const h=await app(t);
 h.w.__fetchMock=async()=>{const data={choices:[{message:{content:'Final message',reasoning:'Private planning'}}]};return {ok:true,json:async()=>data,clone:()=>({json:async()=>data})};};
 h.run('settings.apiKey="test-key";');
 assert.equal(await h.run('openRouterRequest([{role:"user",content:"Hi"}])'),'Final message');
 assert.equal(JSON.parse(h.requests[0][1].body).reasoning.exclude,true);
});
