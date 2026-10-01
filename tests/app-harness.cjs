const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
async function boot(seed={}){
  const errors=[],alerts=[],requests=[],intervals=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://noctis.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.alert=m=>alerts.push(m);w.confirm=()=>true;w.prompt=()=>null;
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=function(o){this.scrollTop=o.top;};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.setInterval=(callback,delay)=>{intervals.push({callback,delay});return intervals.length;};
  w.fetch=async (...args)=>{requests.push(args);if(w.__fetchMock)return w.__fetchMock(...args);throw new Error('Network disabled in tests');};
  w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
  for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,JSON.stringify(v));
  const run=s=>vm.runInContext(s,ctx);
  for(const s of [...w.document.scripts]){
    const file=s.getAttribute('src')?.split('?')[0];
    if(file)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  }
  vm.runInContext(fs.readFileSync(path.join(root,'relationship-milestones.js'),'utf8'),ctx,{filename:'relationship-milestones.js'});
  const settle=()=>new Promise(r=>setTimeout(r,20));
  await settle();
  return {w,dom,run,errors,alerts,requests,intervals,settle,close:()=>w.close(),async import(data,name='card.json',id='importInput'){
    const input=w.document.getElementById(id);
    Object.defineProperty(input,'files',{configurable:true,value:[{name,text:async()=>JSON.stringify(data)}]});
    input.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();
  }};
}
module.exports={boot};
