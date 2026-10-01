/* Active-play sampling. Local only; never sends model requests. */
(() => {
  'use strict';
  const KEY='noctis-active-usage-v1', money=n=>`$${n.toFixed(2)}`;
  let db;try{db=JSON.parse(localStorage.getItem(KEY));}catch{}
  if(!db||db.version!==1)db={version:1,hours:8,sessions:[]};
  let running=false,current=null,lastTick=Date.now();
  const day=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch{const p=document.getElementById('activeStatus');if(p)p.textContent='Unable to save play measurements: browser storage is full.';}}
  function tick(now=Date.now()){
    if(running&&current){current.ms+=Math.max(0,Math.min(now-lastTick,15000));current.end=now;save();}
    lastTick=now;
  }
  function start(){if(running)return;const now=Date.now();current={start:now,end:now,ms:0,requests:0,failed:0,input:0,output:0,missing:0};db.sessions.push(current);running=true;lastTick=now;save();render();}
  function pause(){tick();running=false;current=null;save();render();}
  function markLimited(at=Date.now()){
    window.NoctisDailyUsage?.markLimited(at);pause();
  }
  function record(data,model,ok,startedAt){
    tick();
    const s=[...db.sessions].reverse().find(s=>startedAt>=s.start&&startedAt<=s.end);
    if(s){
      if(ok){s.requests++;const u=data?.usage;
        if(!u||(u.prompt_tokens??u.input_tokens)==null||(u.completion_tokens??u.output_tokens)==null)s.missing++;
        const num=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;
        s.input+=num(u?.prompt_tokens??u?.input_tokens);s.output+=num(u?.completion_tokens??u?.output_tokens);
      }else s.failed++;
      save();
    }
    const message=String(data?.error?.message||'');
    if(!ok&&/daily|per.day|requests.per.day/i.test(message)&&/limit|quota|exceed/i.test(message))markLimited(startedAt);
    render();
  }
  function snapshot(){
    const cutoff=Date.now()-7*86400000,ss=db.sessions.filter(s=>s.start>=cutoff);
    const total=ss.reduce((a,s)=>{for(const k of ['ms','requests','failed','input','output','missing'])a[k]+=s[k]||0;return a;},{ms:0,requests:0,failed:0,input:0,output:0,missing:0});
    const hours=total.ms/3600000;
    return {...total,hours,desiredHours:db.hours,running,requestsPerHour:hours?total.requests/hours:null,
      gemmaMonth:hours?(total.input*.09+total.output*.34)/1e6/hours*db.hours*30:null,
      nemotronMonth:hours?(total.input*.5+total.output*2.2)/1e6/hours*db.hours*30:null};
  }
  function summary(){const s=snapshot();return `ACTIVE PLAY — last 7 days\nMeasured hours: ${s.hours.toFixed(2)}; successes: ${s.requests}; failures: ${s.failed}; input: ${s.input}; output: ${s.output}; missing usage: ${s.missing}\nDesired hours/day: ${s.desiredHours}\n${s.hours>=.25&&s.requests?`Requests/hour: ${s.requestsPerHour.toFixed(1)}; 30-day Gemma estimate: ${money(s.gemmaMonth)}; Nemotron: ${money(s.nemotronMonth)}`:'Collect at least 15 minutes and one successful request for an early estimate.'}\nEstimates exclude fees and activity outside measured sessions. Missing usage understates cost. Rates: Gemma $0.09/$0.34; Nemotron $0.50/$2.20 per million input/output tokens. Provider rates vary.`;}
  function render(){
    const host=document.getElementById('dailyUsagePanel');if(!host)return;
    let panel=document.getElementById('activeUsagePanel');
    if(!panel){panel=document.createElement('section');panel.id='activeUsagePanel';panel.className='daily-usage-panel';host.before(panel);
      panel.innerHTML=`<h3>Active Play · Budget Estimate</h3><p class="hint">Tap Start when you begin playing and Pause for breaks. Switching apps or locking the screen pauses the timer; tap Start when you return. All requests started during measured play count, including phone, social and scans.</p><button id="activeToggle" type="button" class="ghost">Start measuring play</button> <button id="activeLimit" type="button" class="ghost">Free daily limit reached</button><label for="activeHours">Hours I’d like to play per day</label><input id="activeHours" type="number" min="0.5" max="24" step="0.5"><p id="activeStatus" class="hint" aria-live="polite"></p><p id="activeEstimate" class="hint"></p><p class="hint tiny">Last 7 days · this browser only. Estimates are not charges or guarantees. Gemma comparison uses $0.09/M input + $0.34/M output (Oct 1, 2026); Nemotron $0.50/M + $2.20/M. Excludes purchase fees, higher provider rates and requests outside measured play. No extra AI calls.</p>`;
      panel.querySelector('#activeToggle').onclick=()=>running?pause():start();panel.querySelector('#activeLimit').onclick=()=>markLimited();
      const input=panel.querySelector('#activeHours');input.value=db.hours;input.onchange=()=>{const v=Number(input.value);if(Number.isFinite(v)&&v>=.5&&v<=24){db.hours=v;save();}input.value=db.hours;render();};
    }
    const s=snapshot();panel.querySelector('#activeToggle').textContent=running?'Pause measurement':'Start measuring play';
    panel.querySelector('#activeStatus').textContent=`${running?'Measuring':'Paused'} · ${(s.ms/60000).toFixed(1)} minutes · ${s.requests} successful requests · ${s.failed} failed attempts`;
    panel.querySelector('#activeEstimate').textContent=s.hours>=.25&&s.requests?`${s.hours<2?'Early estimate · ':''}${s.requestsPerHour.toFixed(1)} requests/hour → about ${Math.round(s.requestsPerHour*s.desiredHours)} requests/day at ${s.desiredHours} hours/day. Estimated 30 days: Gemma ${money(s.gemmaMonth)} · Nemotron ${money(s.nemotronMonth)}.${s.missing?' Some token usage is missing; costs are underestimated.':''} Limited samples may understate demand; collect several ordinary play sessions.`:'Measure at least 15 minutes with a successful reply for an early estimate. No full day is required. Earlier tokens are preserved in the daily log, but cannot establish past play time.';
  }
  window.NoctisActiveUsage={start,pause,record,snapshot,render,summary,markLimited};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  setInterval(()=>{tick();render();},10000);
})();
