const test=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./app-harness.cjs');
const KEY='noctis-daily-usage-v1';
async function app(t,seed){const h=await boot(seed);t.after(()=>h.close());return h;}
test('daily tracker starts separately from historical monthly totals',async t=>{
 const h=await app(t,{'noctis-usage-v0.8':{'2026-09':{requests:79,input:819735,output:43634,cost:0}}});
 assert.equal(h.w.NoctisDailyUsage.snapshot().rows.at(-1).requests,0);
 assert.equal(JSON.parse(h.w.localStorage.getItem('noctis-usage-v0.8'))['2026-09'].requests,79);
 assert.ok(h.w.document.getElementById('dailyUsagePanel'));
 assert.equal(h.requests.length,0);
});
test('records free tokens, reported billing, failures, missing usage, and per-model totals',async t=>{
 const h=await app(t),u=h.w.NoctisDailyUsage;
 u.record({usage:{prompt_tokens:10000,completion_tokens:500,cost:0}},'sample:free',true);
 u.record(null,'sample:free',false);u.record({},'paid-model',true);
 const today=u.snapshot().rows.at(-1);
 assert.equal(today.requests,2);assert.equal(today.failed,1);assert.equal(today.input,10000);
 assert.equal(today.output,500);assert.equal(today.unmetered,1);assert.equal(today.reportedCost,0);
 assert.equal(today.byModel['sample:free'].requests,1);
 assert.match(u.summary(),/missing usage: 1/);
});
test('seven-day average excludes partial days and includes zero-use full days across month boundary',async t=>{
 const h=await app(t),u=h.w.NoctisDailyUsage;
 h.w.localStorage.setItem(KEY,JSON.stringify({version:1,startedAt:'2026-09-29T20:00:00Z',startedDay:'2026-09-29',timezone:'UTC',days:{'2026-09-30':{requests:100,failed:0,input:1000000,output:100000,unmetered:0,byModel:{}}}}));
 const s=u.snapshot(new h.w.Date(2026,9,3,12));
 assert.equal(s.completeDays,3);assert.equal(s.averageRequests,100/3);
 assert.ok(Math.abs(s.projectedMonth-7.2)<1e-9);
 assert.equal(s.rows.length,7);assert.equal(s.rows.at(-1).day,'2026-10-03');
});
test('actual fetch hook counts one success and one failure without extra API calls',async t=>{
 const h=await app(t);
 h.w.__fetchMock=async()=>({ok:true,clone:()=>({json:async()=>({usage:{prompt_tokens:100,completion_tokens:20}})})});
 await h.w.fetch('https://openrouter.ai/api/v1/chat/completions',{body:JSON.stringify({model:'test:free'})});await h.settle();
 h.w.__fetchMock=async()=>({ok:false,clone:()=>({json:async()=>({error:{message:'rate limited'}})})});
 await h.w.fetch('https://openrouter.ai/api/v1/chat/completions',{body:'{}'});await h.settle();
 const row=h.w.NoctisDailyUsage.snapshot().rows.at(-1);
 assert.equal(row.requests,1);assert.equal(row.failed,1);assert.equal(row.input,100);assert.equal(h.requests.length,2);
});
test('report is copyable and daily history survives monthly counter reset and reload',async t=>{
 const h=await app(t);h.w.NoctisDailyUsage.record({usage:{prompt_tokens:100,completion_tokens:20}},'test',true);
 const saved=h.w.localStorage.getItem(KEY);
 h.w.document.getElementById('resetUsageBtn').click();assert.equal(h.w.localStorage.getItem(KEY),saved);
 h.w.document.getElementById('dailyUsageReportBtn').click();assert.match(h.w.document.getElementById('dailyUsageReport').value,/NOCTIS — 7-DAY USAGE REPORT/);
 const next=await app(t,{[KEY]:JSON.parse(saved)});assert.equal(next.w.NoctisDailyUsage.snapshot().rows.at(-1).requests,1);
});
