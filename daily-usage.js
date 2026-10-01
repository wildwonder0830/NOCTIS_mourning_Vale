/* Noctis v0.15.8 — Device-local daily usage, no additional model calls. */
(() => {
  'use strict';
  const KEY='noctis-daily-usage-v1';
  // Paid Nemotron Ultra comparison rate, verified 2026-09-30; not a bill.
  const RATE={input:0.50,output:2.20};
  const localDay=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const money=n=>`$${Number(n||0).toFixed(2)}`;
  const number=n=>Math.round(n||0).toLocaleString();
  const empty=()=>({requests:0,failed:0,input:0,output:0,unmetered:0,reportedCost:0,costReported:0,byModel:{}});
  const tokens=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;
  let storageError='';
  function load(){
    try{
      const data=JSON.parse(localStorage.getItem(KEY)||'null');
      if(data?.version===1 && data.days && data.startedDay)return data;
    }catch{}
    const d=new Date();
    return {version:1,startedAt:d.toISOString(),startedDay:localDay(d),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,days:{}};
  }
  function save(db){
    try{localStorage.setItem(KEY,JSON.stringify(db));storageError='';}
    catch{storageError='Daily tracking could not be saved. Browser storage may be full.';}
  }
  save(load());
  function comparison(row){return (row.input*RATE.input+row.output*RATE.output)/1e6;}
  function record(data,model,ok,startedAt=Date.now()){
    const db=load(),day=localDay(new Date(startedAt));
    const row=db.days[day]||(db.days[day]=empty());
    const modelRow=row.byModel[model]||(row.byModel[model]=empty());
    for(const target of [row,modelRow]){
      if(!ok){target.failed++;continue;}
      target.requests++;
      const usage=data?.usage;
      if(!usage || (usage.prompt_tokens==null && usage.input_tokens==null) || (usage.completion_tokens==null && usage.output_tokens==null))target.unmetered++;
      target.input+=tokens(usage?.prompt_tokens??usage?.input_tokens);
      target.output+=tokens(usage?.completion_tokens??usage?.output_tokens);
      if(typeof usage?.cost==='number' && Number.isFinite(usage.cost)){
        target.reportedCost+=Math.max(0,usage.cost);target.costReported++;
      }
    }
    save(db);window.NoctisActiveUsage?.record(data,model,ok,startedAt);render();
  }
  function snapshot(date=new Date()){
    const db=load(),today=localDay(date),rows=[];
    for(let i=6;i>=0;i--){
      const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()-i,12);
      const day=localDay(d),tracked=day>=db.startedDay;
      rows.push({day,tracked,partial:day===today||day===db.startedDay,...(db.days[day]||empty())});
    }
    // Include zero-use full days; exclude today and the installation's partial day.
    const complete=rows.filter(r=>r.tracked&&!r.partial&&!r.limited);
    const sum=complete.reduce((a,r)=>({requests:a.requests+r.requests,cost:a.cost+comparison(r),unmetered:a.unmetered+r.unmetered}),{requests:0,cost:0,unmetered:0});
    return {db,today,rows,completeDays:complete.length,averageRequests:complete.length?sum.requests/complete.length:null,projectedMonth:complete.length?sum.cost/complete.length*30:null,unmetered:sum.unmetered};
  }
  function summary(){
    const s=snapshot();
    return [
      'NOCTIS — 7-DAY USAGE REPORT',
      window.NoctisActiveUsage?.summary()||'',
      `Tracking began: ${s.db.startedAt}; local timezone: ${s.db.timezone}`,
      'This browser only. Today and the first tracking day are partial.',
      'Day | successful requests | failed attempts | input tokens | output tokens | paid Nemotron equivalent',
      ...s.rows.map(r=>r.tracked?`${r.day}${r.partial?' (partial)':''}${r.limited?' (limited by free allowance)':''} | ${r.requests} | ${r.failed} | ${r.input} | ${r.output} | ${money(comparison(r))}${r.unmetered?' | missing usage: '+r.unmetered:''}`:`${r.day} | not tracked`),
      `Completed days sampled: ${s.completeDays}`,
      s.completeDays?`Average requests/day: ${s.averageRequests.toFixed(1)}; 30-day paid equivalent: ${money(s.projectedMonth)}`:'Monthly projection: waiting for a full tracked day.',
      'Comparison uses $0.50/M input + $2.20/M output, verified 2026-09-30. Excludes purchase fees; providers and future usage can differ. Not actual spend.',
      'Model totals by day:',
      ...s.rows.filter(r=>r.tracked).flatMap(r=>Object.entries(r.byModel).map(([model,v])=>`${r.day} | ${model} | ${v.requests} successful, ${v.failed} failed | ${v.input} input, ${v.output} output`))
    ].join('\n');
  }
  function render(){
    const host=document.getElementById('usagePanel');if(!host)return;
    let panel=document.getElementById('dailyUsagePanel');
    if(!panel){
      panel=document.createElement('section');panel.id='dailyUsagePanel';panel.className='daily-usage-panel';
      host.insertAdjacentElement('afterend',panel);
    }
    // Preserve an open report and its selection while background requests finish.
    if(panel.querySelector('#dailyUsageReport'))return;
    window.NoctisActiveUsage?.render();
    const s=snapshot(),today=s.rows.at(-1),ready=s.completeDays>=5;
    panel.innerHTML=`<h3>Daily Usage · 7-Day Study</h3>
      <p class="hint">Started ${s.db.startedDay} · this browser only · local calendar days. Your earlier monthly total stays separate.</p>
      <div class="usage-grid"><div><strong>${number(today.requests)}</strong><span>successful requests today</span></div><div><strong>${number(today.failed)}</strong><span>failed attempts today</span></div><div><strong>${money(comparison(today))}</strong><span>today’s paid Nemotron equivalent</span></div><div><strong>${s.completeDays}</strong><span>${ready?'enough full days for an initial estimate':'unrestricted full days (historical view)'}</span></div></div>
      <div class="daily-usage-scroll"><table><thead><tr><th>Day</th><th>Requests</th><th>Failed</th><th>Input</th><th>Output</th><th>Paid equivalent</th></tr></thead><tbody>${s.rows.map(r=>`<tr><th>${r.day.slice(5)}${r.partial&&r.tracked?' *':''}${r.limited?' · Limited':''}</th>${r.tracked?`<td>${number(r.requests)}</td><td>${number(r.failed)}</td><td>${number(r.input)}</td><td>${number(r.output)}</td><td>${money(comparison(r))}</td>`:'<td colspan="5">Not tracked</td>'}</tr>`).join('')}</tbody></table></div>
      <p class="hint">${s.completeDays?`${ready?'':'Early estimate · '}${s.averageRequests.toFixed(1)} requests/day · <strong>${money(s.projectedMonth)} per 30 days</strong> at the comparison rate. Based on ${s.completeDays} complete calendar days, including zero-use days.`:'Use the active-play estimate above; a full day is not required.'}</p>
      <p class="hint tiny">* Partial day. Partial and free-limit days are excluded from calendar averages. Requests include RP, drafts, regeneration and scans; historical totals may include retired phone/social calls. Free usage still shows its paid equivalent, not a charge. Comparison: $0.50/M input + $2.20/M output (Sep 30, 2026); excludes purchase fees and higher provider rates. Failed attempts are separate; missing usage can make estimates too low.</p>
      <button id="dailyUsageReportBtn" class="ghost small" type="button">Show report to share</button>
      <p class="hint tiny">Use the same browser for the study, or share a report from each device. Backups and the monthly counter reset do not combine or erase this daily log.</p>`;
    if(today.unmetered||s.unmetered){
      const note=document.createElement('p');note.className='hint';note.textContent='Some successful responses did not report token usage. Cost estimates are incomplete.';panel.appendChild(note);
    }
    if(storageError){const note=document.createElement('p');note.textContent=storageError;panel.appendChild(note);}
    panel.querySelector('#dailyUsageReportBtn').addEventListener('click',()=>{
      const report=document.createElement('textarea');report.id='dailyUsageReport';report.readOnly=true;report.rows=12;report.value=summary();report.setAttribute('aria-label','Daily usage report to copy');
      const close=document.createElement('button');close.type='button';close.className='ghost small';close.textContent='Close report';
      close.addEventListener('click',()=>{report.remove();close.remove();render();});
      panel.append(report,close);report.focus();report.select();
    });
  }
  const style=document.createElement('style');style.textContent='.daily-usage-panel{margin:20px 0;padding:16px;border:1px solid var(--line,#49354f);border-radius:16px}.daily-usage-scroll{overflow-x:auto;margin-top:14px}.daily-usage-panel table{width:100%;border-collapse:collapse;font-size:.85rem;white-space:nowrap}.daily-usage-panel th,.daily-usage-panel td{padding:9px 10px;text-align:right;border-bottom:1px solid #49354f}.daily-usage-panel th:first-child{text-align:left}.daily-usage-panel textarea{margin-top:12px;width:100%}';document.head.appendChild(style);
  function markLimited(at=Date.now()){const db=load(),key=localDay(new Date(at));const row=db.days[key]||(db.days[key]=empty());row.limited=true;save(db);render();}
  window.NoctisDailyUsage={record,render,snapshot,summary,markLimited};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  window.addEventListener('pageshow',render);
  setInterval(()=>{if(!document.hidden)render();},60000);
})();
