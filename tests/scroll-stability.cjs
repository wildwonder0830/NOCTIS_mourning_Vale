const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
function setup(){
  const frames=[];const moves=[];const classes=new Set();
  const messages={scrollTop:100,scrollHeight:1000,clientHeight:400,addEventListener(){},appendChild(){},innerHTML:''};
  const chat={id:'one',messages:[]};
  const context=vm.createContext({messagesEl:messages,topbarEl:{},documentScrollTop:()=>100,
    document:{body:{classList:{toggle(n,on){on?classes.add(n):classes.delete(n)}}},querySelector:()=>({scrollIntoView:x=>moves.push(['page',x])})},
    window:{addEventListener(){}},requestAnimationFrame:fn=>(frames.push(fn),frames.length),
    updateScrollBottomButton(){},isMessagesNearBottom:()=>messages.scrollHeight-messages.scrollTop-messages.clientHeight<60,
    activeCharacter:()=>({name:'Test'}),activeChat:()=>chat,setTimeout(){},
    messagesScrollable:()=>messages.scrollHeight>messages.clientHeight+8});
  messages.scrollTo=x=>moves.push(['messages',x]);
  vm.runInContext(source.slice(source.indexOf('// One scroll update per frame.'),source.indexOf('function compileSystemPrompt()')),context);
  vm.runInContext(source.slice(source.indexOf('function scrollMessagesToBottom('),source.indexOf('if(scrollBottomBtn)scrollBottomBtn')),context);
  return {context,messages,chat,frames,moves,classes,run:s=>vm.runInContext(s,context)};
}
test('header waits for meaningful movement and batches scroll work',()=>{
  const h=setup();h.run('reactToScrollDirection(105,100,"messages")');assert.equal(h.classes.size,0);
  h.run('reactToScrollDirection(125,100,"messages")');assert(h.classes.has('chrome-hidden'));
  h.run('reactToScrollDirection(100,125,"messages")');assert.equal(h.classes.size,0);
  h.run('scheduleScrollUpdate();scheduleScrollUpdate();scheduleScrollUpdate()');assert.equal(h.frames.length,1);
});
test('redraw preserves reading position; new chat and bottom reader follow latest',()=>{
  const h=setup();h.run('renderMessages()');assert.equal(h.messages.scrollTop,1000);
  h.messages.scrollTop=150;h.run('renderMessages()');assert.equal(h.messages.scrollTop,150);
  h.messages.scrollTop=590;h.run('renderMessages()');assert.equal(h.messages.scrollTop,1000);
  h.messages.scrollTop=100;h.chat.id='two';h.run('renderMessages()');assert.equal(h.messages.scrollTop,1000);
});
test('latest button starts only one scroll operation',()=>{
  const h=setup();h.run('scrollMessagesToBottom()');assert.equal(h.moves.length,1);assert.equal(h.moves[0][0],'messages');
  h.moves.length=0;h.messages.scrollHeight=400;h.run('scrollMessagesToBottom()');assert.equal(h.moves.length,1);assert.equal(h.moves[0][0],'page');
});
test('hidden header does not collapse its layout space',()=>{
  const css=fs.readFileSync('styles.css','utf8');
  for(const rule of css.matchAll(/body\.chrome-hidden \.topbar\{([^}]+)\}/g))assert(!/(?:max-height|padding-top|padding-bottom)\s*:/.test(rule[1]));
});
