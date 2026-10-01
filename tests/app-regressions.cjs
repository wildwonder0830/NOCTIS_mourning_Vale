const test=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
async function app(t,seed){const h=await boot(seed);t.after(()=>h.close());return h;}

test('all modules boot and all tabs open without runtime errors or network calls',async t=>{
 const h=await app(t);
 for(const tab of h.w.document.querySelectorAll('.tab')){tab.click();await h.settle();}
 h.run('renderAll();compileSystemPrompt();apiMessages();');await h.settle();
 assert.deepEqual(h.errors,[]);assert.equal(h.requests.length,0);
 assert.equal(h.run('NoctisCompat.audit().ok'),true);
});
test('settings without an API key retain user preferences after reload',async t=>{
 const h=await app(t,{'noctis-private-settings-v0.4':{apiKey:'',model:'custom-model',ambientTextsEnabled:false,temperature:0.3}});
 assert.equal(h.run('settings.model'),'custom-model');assert.equal(h.run('settings.temperature'),0.3);
});
test('replacement import runs once and cancellation does not modify any character',async t=>{
 const h=await app(t);h.run('activeCharacter().height="original"');
 const id=h.run('activeCharacter().id');
 h.w.confirm=()=>false;
 await h.import({format:'noctis-character-replacement',targetCharacterId:id,character:{name:'Replacement',height:'changed',chats:[{messages:[]}]}});
 assert.equal(h.run('activeCharacter().height'),'original');assert.equal(h.run('activeCharacter().name'),'Noctis');
 h.w.confirm=()=>true;
 await h.import({format:'noctis-character-replacement',targetCharacterId:id,character:{name:'Replacement',height:'changed',chats:[]}});
 assert.equal(h.run('activeCharacter().name'),'Replacement');assert.equal(h.run('activeCharacter().chats.length'),1);
 assert.equal(h.alerts.length,1);
});
test('renamed backup merges unique characters instead of replacing the current vault',async t=>{
 const h=await app(t);const incoming=h.run('(()=>{const v=defaultVault();v.characters[0].name="Incoming";return clone(v)})()');
 await h.import(incoming,'my-renamed-file.json');
 assert.equal(h.run('vault.characters.length'),2);assert.deepEqual(h.errors,[]);
});
test('both import paths preserve complete persona fields and requested slot',async t=>{
 const h=await app(t);
 for(const id of ['importInput','personaImportInput']){
   await h.import({format:'noctis-persona',targetSlot:3,persona:{name:'Slot Three',height:'five feet',profileSheet:{custom:'detail'}}},'persona.json',id);
   assert.equal(h.run('activePersona().slot'),3);assert.equal(h.run('activePersona().height'),'five feet');
   assert.equal(h.run('activePersona().profileSheet.custom'),'detail');
 }
});
test('merge keeps newer edits and maps foreign persona IDs by slot',async t=>{
 const h=await app(t);
 const result=h.run(`(()=>{
   const a=clone(vault),b=clone(vault);b.personas.forEach((p,i)=>{p.id='foreign-'+i;p.updatedAt='2099-01-01';p.name='Incoming '+i;});
   b.characters[0].updatedAt='2099-01-01';b.characters[0].chats[0].updatedAt='2099-01-01';
   b.characters[0].chats[0].activePersonaId=b.personas[2].id;
   b.characters[0].chats[0].messages[0].text='edited';b.characters[0].chats[0].messages[0].editedAt='2099-01-01';
   return NoctisMerge.mergeVaults(a,b);
 })()`);
 assert.equal(result.personas.length,4);
 assert.equal(result.characters[0].chats[0].activePersonaId,result.personas[2].id);
 assert.equal(result.characters[0].chats[0].messages[0].text,'edited');
});
test('milestone memory replacement is idempotent and deletion removes the block',async t=>{
 const h=await app(t);
 h.run('activeChat().relationshipMemory="Manual memory";activeChat().milestones=[{id:"one",text:"Event"}];syncMilestonesToMemory();syncMilestonesToMemory();');
 assert.equal(h.run('activeChat().relationshipMemory.match(/AUTO MILESTONES/g).length'),2);
 h.run('activeChat().milestones=[];syncMilestonesToMemory();');
 assert.equal(h.run('activeChat().relationshipMemory'),'Manual memory');
});
test('typed continue generates a reply despite its command marker',async t=>{
 const h=await app(t);h.run('openRouterRequest=async()=>"Continued reply";');
 await h.run('handleChatCommand("/continue")');
 assert.equal(h.run('activeChat().messages.at(-1).text'),'Continued reply');
});
test('in-flight reply stays with original timeline and duplicate generation is blocked',async t=>{
 const h=await app(t);
 h.run('window.replyCalls=0;openRouterRequest=()=>{replyCalls++;return new Promise(r=>window.finishReply=r)};window.origin=activeChat();');
 const pending=h.run('generateReply()');await h.run('generateReply()');
 assert.equal(h.run('replyCalls'),1);
 h.run('const other=newChat("Other");activeCharacter().chats.push(other);activeCharacter().activeChatId=other.id;renderAll();finishReply("Original reply");');
 await pending;
 assert.equal(h.run('origin.messages.at(-1).text'),'Original reply');assert.equal(h.run('activeChat().messages.length'),0);
 assert.equal(h.w.document.getElementById('sendBtn').disabled,false);
});
test('regenerate never removes an assistant-only opening',async t=>{
 const h=await app(t);const before=h.run('JSON.stringify(activeChat().messages)');
 h.w.document.getElementById('regenBtn').click();await h.settle();
 assert.equal(h.run('JSON.stringify(activeChat().messages)'),before);
});
test('editing summarized message invalidates compact memory',async t=>{
 const h=await app(t);
 h.run('activeChat().messages=[{id:"u",role:"user",text:"Original"},{id:"a",role:"assistant",text:"Answer"}];activeChat().consolidatedMemory="Old facts";activeChat().consolidatedThroughMessageId="a";renderMessages();');
 h.w.document.querySelector('.message.user .message-tools button').click();
 h.w.document.querySelector('.message-edit').value='Corrected';h.w.document.querySelector('.message-edit-actions .send').click();
 assert.equal(h.run('activeChat().consolidatedMemory'),'');assert.equal(h.run('activeChat().messages[0].text'),'Corrected');
});
test('stats scanner accepts a valid all-zero packet',async t=>{
 const h=await app(t);h.run('openRouterRequest=async()=>"sex=0\\nkisses=0\\ndates=0\\nfights=0\\ntransformations=0\\nmajorInjuries=0";');
 h.w.document.getElementById('scanSceneStatsBtn').click();await h.settle();
 assert.match(h.w.document.getElementById('statsScanStatus').textContent,/Stats updated/);
 assert.equal(h.run('activeChat().statsScanThroughMessageId'),h.run('activeChat().messages.at(-1).id'));
});
test('milestone review checkpoints only scanned messages and cannot skip failed scans',async t=>{
 const h=await app(t);h.run('openRouterRequest=async()=>JSON.stringify({milestones:[]});');
 const last=h.run('activeChat().messages.at(-1).id');
 await h.w.NoctisRelationshipMilestones.sync();
 h.run('activeChat().messages.push({id:"new",role:"user",text:"New message"});');
 h.w.document.getElementById('rmMarkReviewed').click();
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),last);
 h.run('openRouterRequest=async()=>{throw new Error("Limit")};');await h.w.NoctisRelationshipMilestones.sync();
 h.w.document.getElementById('rmMarkReviewed').click();
 assert.equal(h.run('activeChat().relationshipMilestoneScanThroughMessageId'),last);
});
test('social refresh reports errors without unhandled rejection',async t=>{
 const h=await app(t);h.run('openRouterRequest=async()=>{throw new Error("Limit reached")};');
 h.w.document.getElementById('socialRefreshBtn').click();await h.settle();
 assert.match(h.w.document.getElementById('socialStatus').textContent,/Limit reached/);
 assert.equal(h.w.document.getElementById('socialRefreshBtn').disabled,false);
});

test('failed regeneration preserves the original reply',async t=>{
 const h=await app(t);h.run('activeChat().messages=[{id:"u",role:"user",text:"Hello"},{id:"a",role:"assistant",text:"Original reply"}];openRouterRequest=async()=>{throw new Error("Limit")};');
 h.w.document.getElementById('regenBtn').click();await h.settle();
 assert.equal(h.run('activeChat().messages.at(-1).text'),'Original reply');
 h.run('openRouterRequest=async()=>"Replacement reply";');
 h.w.document.getElementById('regenBtn').click();await h.settle();
 assert.equal(h.run('activeChat().messages.length'),2);assert.equal(h.run('activeChat().messages.at(-1).text'),'Replacement reply');
});
test('generated draft never overwrites text typed while waiting',async t=>{
 const h=await app(t);h.run('openRouterRequest=()=>new Promise(r=>window.finishDraft=r);');
 const pending=h.run('generateMyTurn()');h.w.document.getElementById('messageInput').value='My own writing';
 h.run('finishDraft("Suggested draft")');await pending;
 assert.equal(h.w.document.getElementById('messageInput').value,'My own writing');
 assert.match(h.run('activeChat().messages.at(-1).text'),/SAVED DRAFT/);
});
test('phone markers preserve unknown-contact texts until the contact exists',async t=>{
 const h=await app(t);h.run(`activeCharacter().phoneContacts=[{id:'known',name:'Known'}];activeChat().messages=[{id:'phone-event',role:'assistant',text:'[[PHONE:Known]]Hello[[/PHONE]] [[PHONE:Unknown]]Keep me[[/PHONE]]'}];renderMessages();`);
 assert.match(h.run('activeChat().messages[0].text'),/Keep me/);
 assert.equal(h.run('activeChat().phoneThreads.known.length'),1);
 h.run(`activeCharacter().phoneContacts.push({id:'unknown',name:'Unknown'});renderMessages();renderMessages();`);
 assert.equal(h.run('activeChat().phoneThreads.unknown.length'),1);
});
test('clearing a group conversation leaves the direct conversation intact',async t=>{
 const h=await app(t);h.w.document.getElementById('createBestieTrioBtn').click();
 h.run('const ch=activeChat(),gid=ch.phoneGroups[0].id;ch.groupThreads[gid]=[{id:"g",role:"user",text:"Group"}];ch.phoneThreads[activeCharacter().activePhoneContactId]=[{id:"p",role:"user",text:"Direct"}];document.getElementById("phoneForm").dataset.groupId=gid;');
 h.w.document.getElementById('clearPhoneThreadBtn').click();
 assert.equal(h.run('activeChat().groupThreads[activeChat().phoneGroups[0].id].length'),0);
 assert.equal(h.run('activeChat().phoneThreads[activeCharacter().activePhoneContactId].length'),1);
 h.w.document.querySelector('.phone-directory-open').click();
 assert.equal(h.w.document.getElementById('phoneForm').dataset.groupId,undefined);
});
test('milestone suggestions cannot be added to a different timeline',async t=>{
 const h=await app(t);h.run('openRouterRequest=async()=>JSON.stringify({milestones:[{title:"Dating",line:"Agreed to date",evidence:"Agreement",messageIndex:1,confidence:"high"}]});');
 await h.w.NoctisRelationshipMilestones.sync();
 h.run('const next=newChat("Other");activeCharacter().chats.push(next);activeCharacter().activeChatId=next.id;');
 h.w.document.getElementById('rmAddSelected').click();
 assert.equal(h.run('activeChat().milestones.length'),0);
});
test('malformed backup is rejected without changing the saved vault',async t=>{
 const h=await app(t);const before=h.run('JSON.stringify(vault)');
 await h.import({characters:[{name:'broken',chats:null}]},'renamed.json');
 assert.equal(h.run('JSON.stringify(vault)'),before);assert.match(h.alerts.at(-1),/invalid/);
});
