/* Noctis Mourning Vale — Relationship Milestones v1.1
   Self-contained milestone module: injects its own CSS, hides Sync UI,
   retries initialization, and provides a Test Popup button.
*/
(() => {
  'use strict';
  const VERSION = '1.1.0';
  const TYPE = 'relationship';
  const PRESETS = [
    ['Interested','🖤🌹','Something has begun to pull them closer.'],
    ['Courting','🌹🕯️','Intent has stepped out of the shadows.'],
    ['Dating','🖤✨','They have chosen to explore this together.'],
    ['Committed','🔐🖤','Their choice has become a promise.'],
    ['Bonded','🔗✨','A bond now lives between them.'],
    ['Marked','🐺🌙','The bond has been given a visible sign.'],
    ['Mated','🌙🐺🖤','The mate bond has been recognized and accepted.'],
    ['Fated','✨♾️✨','Fate has made itself impossible to ignore.'],
    ['Blood-Bound','🩸🌹','Blood and choice have sealed something lasting.'],
    ['Chosen','🔮🕯️','They chose one another with open eyes.'],
    ['Engaged','💍🖤','A future together has been promised.'],
    ['Married','🕯️💍🌹','Their lives have been joined by vow.'],
    ['Crowned','👑🖤','Love and power now share a throne.'],
    ['Immortal Consort','♾️👑🌙','Their bond has crossed beyond a mortal lifetime.']
  ].map(([title,emoji,line])=>({title,emoji,line}));

  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const now = () => new Date().toISOString();
  const makeId = () => `rel_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

  function injectStyles(){
    if($('#rmSelfStyles')) return;
    const style=document.createElement('style');
    style.id='rmSelfStyles';
    style.textContent=`
#syncBtn,#syncModal,#syncImportInput{display:none!important}
.rm-backdrop,.rm-ceremony-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(7,4,10,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))}
.rm-backdrop.hidden,.rm-ceremony-backdrop.hidden,.rm-custom-fields.hidden{display:none!important}
.rm-panel-card{width:min(680px,100%);max-height:88dvh;overflow:auto;background:linear-gradient(180deg,#1a1020,#100b15);border:1px solid rgba(213,162,255,.3);border-radius:24px;padding:20px;box-shadow:0 28px 80px rgba(0,0,0,.48);color:inherit}
.rm-panel-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}.rm-panel-head h2{margin:.15rem 0 .3rem}.rm-eyebrow,.rm-ceremony-kicker{letter-spacing:.13em;font-size:.72rem;text-transform:uppercase;opacity:.8}.rm-current{display:flex;align-items:center;gap:8px;min-height:24px}.rm-status-emoji{font-size:1.25rem}.rm-status-title{font-weight:750}.rm-status-empty{opacity:.6;font-size:.9rem}.rm-form{display:grid;gap:12px}.rm-form label{display:grid;gap:6px}.rm-form input,.rm-form select,.rm-form textarea{width:100%;box-sizing:border-box}.rm-custom-fields{display:grid;gap:12px}.rm-optional{opacity:.55;font-weight:400}.rm-actions-row{display:flex;gap:10px;flex-wrap:wrap}.rm-actions-row>*{flex:1 1 180px}.rm-history-title{margin:24px 0 10px;font-weight:800;letter-spacing:.04em}.rm-history{display:grid;gap:9px}.rm-history-item{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.rm-history-emoji{font-size:1.6rem}.rm-history-copy{display:grid;gap:2px}.rm-history-copy span{font-size:.87rem;opacity:.72}.rm-history-copy small{opacity:.48}.rm-empty-history{padding:18px;text-align:center;opacity:.6;border:1px dashed rgba(255,255,255,.12);border-radius:16px}.rm-toolbar-btn{white-space:nowrap}.rm-diagnostic{font-size:.78rem;opacity:.58;margin-top:8px}
.rm-ceremony-backdrop{opacity:0;transition:opacity .18s ease;overflow:hidden}.rm-ceremony-backdrop.rm-open{opacity:1}.rm-ceremony-card{position:relative;width:min(560px,100%);text-align:center;padding:34px 22px 26px;border-radius:30px;background:radial-gradient(circle at 50% 0%,rgba(136,61,170,.24),transparent 44%),linear-gradient(180deg,#1b1022,#0d0912);border:1px solid rgba(226,179,255,.38);box-shadow:0 30px 100px rgba(0,0,0,.62),0 0 54px rgba(142,73,181,.18);transform:scale(.92) translateY(10px);transition:transform .22s cubic-bezier(.2,.9,.2,1.15)}.rm-open .rm-ceremony-card{transform:scale(1) translateY(0)}.rm-ceremony-emoji{font-size:clamp(3rem,14vw,5.4rem);line-height:1.1;margin:20px 0 10px;filter:drop-shadow(0 0 20px rgba(238,193,255,.25));animation:rmFloat 2.8s ease-in-out infinite}.rm-ceremony-title{font-size:clamp(2rem,10vw,3.7rem);line-height:1;margin:.1em 0 .18em;letter-spacing:.045em;text-transform:uppercase}.rm-ceremony-names{font-size:1.08rem;font-weight:700;opacity:.9}.rm-ceremony-line{max-width:430px;margin:18px auto 8px;font-style:italic;line-height:1.5;opacity:.82}.rm-ceremony-date{font-size:.78rem;opacity:.48;margin-top:10px}.rm-ceremony-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:24px}.rm-stars{position:absolute;inset:0;pointer-events:none}.rm-stars i{position:absolute;font-style:normal;opacity:.26;animation:rmTwinkle 2s ease-in-out infinite}.rm-stars i:nth-child(1){left:8%;top:17%;font-size:1.4rem}.rm-stars i:nth-child(2){right:10%;top:24%;font-size:1.1rem;animation-delay:.4s}.rm-stars i:nth-child(3){left:17%;bottom:20%;animation-delay:.8s}.rm-stars i:nth-child(4){right:15%;bottom:16%;font-size:1.5rem;animation-delay:1.1s}.rm-stars i:nth-child(5){left:47%;top:7%;animation-delay:.65s}.rm-stars i:nth-child(6){right:5%;top:55%;animation-delay:1.4s}@keyframes rmFloat{50%{transform:translateY(-5px) scale(1.025)}}@keyframes rmTwinkle{0%,100%{opacity:.15;transform:scale(.9)}50%{opacity:.65;transform:scale(1.18)}}
@media(max-width:600px){.rm-panel-card{padding:16px;border-radius:20px}.rm-history-item{grid-template-columns:auto 1fr}.rm-history-item .rm-replay{grid-column:2;justify-self:start}.rm-ceremony-card{padding:28px 16px 22px}.rm-ceremony-actions>*{flex:1 1 140px}}
@media(prefers-reduced-motion:reduce){.rm-ceremony-backdrop,.rm-ceremony-card,.rm-ceremony-emoji,.rm-stars i{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(style);
  }

  function hideSync(){
    ['syncBtn','syncModal','syncImportInput'].forEach(id=>{const el=document.getElementById(id); if(el) el.style.setProperty('display','none','important');});
  }

  function getChat(){ try{return typeof activeChat==='function' ? activeChat() : null;}catch{return null;} }
  function getCharacter(){ try{return typeof activeCharacter==='function' ? activeCharacter() : null;}catch{return null;} }
  function getPersona(){ try{return typeof activePersona==='function' ? activePersona() : null;}catch{return null;} }
  function save(){ try{if(typeof saveVault==='function') saveVault();}catch(e){console.warn('[Milestones] saveVault failed',e);} }

  function ensure(ch=getChat()){
    if(!ch) return null;
    if(!Array.isArray(ch.milestones)) ch.milestones=[];
    if(!ch.relationshipState || typeof ch.relationshipState!=='object' || Array.isArray(ch.relationshipState)) ch.relationshipState={currentTitle:'',currentEmoji:'',updatedAt:''};
    return ch;
  }
  function history(ch=getChat()){ ensure(ch); return (ch?.milestones||[]).filter(m=>m?.type===TYPE); }
  function names(){return {character:String(getCharacter()?.name||'Character').trim(),persona:String(getPersona()?.name||'You').trim()};}
  function fmtDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});}

  function currentState(){
    const ch=ensure(); if(!ch) return {currentTitle:'',currentEmoji:'',updatedAt:''};
    const list=history(ch), last=list[list.length-1];
    return ch.relationshipState?.currentTitle ? ch.relationshipState : last ? {currentTitle:last.title,currentEmoji:last.emoji,updatedAt:last.createdAt} : {currentTitle:'',currentEmoji:'',updatedAt:''};
  }

  function addMilestone({title,emoji,line,note='',custom=false}){
    const ch=ensure();
    if(!ch){alert('Noctis milestone storage is not available on this screen yet. Open a roleplay chat and try again.');return null;}
    title=String(title||'').trim(); emoji=String(emoji||'✨🖤✨').trim(); line=String(line||'').trim(); note=String(note||'').trim();
    if(!title) return null;
    const n=names(); const stamp=now();
    const item={id:makeId(),type:TYPE,title,emoji,line,note,text:`${emoji} ${title}: ${line}`,participants:[n.persona,n.character],custom:!!custom,createdAt:stamp,updatedAt:stamp};
    ch.milestones.push(item); ch.relationshipState={currentTitle:title,currentEmoji:emoji,updatedAt:stamp}; ch.updatedAt=stamp; save(); renderAllBits(); showCeremony(item); return item;
  }

  function showCeremony(item){
    buildUI(); const modal=$('#relationshipMilestoneCeremony'); if(!modal)return;
    const n=names();
    $('#rmCeremonyEmoji').textContent=item.emoji||'✨🖤✨'; $('#rmCeremonyTitle').textContent=item.title||'Milestone'; $('#rmCeremonyNames').textContent=`${n.persona} + ${n.character}`; $('#rmCeremonyLine').textContent=item.line||item.note||'A new chapter has begun.'; $('#rmCeremonyDate').textContent=fmtDate(item.createdAt||now());
    modal.classList.remove('hidden'); requestAnimationFrame(()=>modal.classList.add('rm-open'));
  }
  function testCeremony(){showCeremony({title:'FATED',emoji:'✨♾️🖤',line:'The milestone system is alive. Noctis heard the prophecy.',createdAt:now()});}
  function closeCeremony(){const m=$('#relationshipMilestoneCeremony');if(!m)return;m.classList.remove('rm-open');setTimeout(()=>m.classList.add('hidden'),180);}
  function openPanel(){buildUI();$('#relationshipMilestonePanel')?.classList.remove('hidden');renderAllBits();}
  function closePanel(){$('#relationshipMilestonePanel')?.classList.add('hidden');}

  function renderStatus(){
    const host=$('#relationshipMilestoneStatus');if(!host)return;const s=currentState();
    host.innerHTML=s.currentTitle?`<span class="rm-status-emoji">${esc(s.currentEmoji||'🖤')}</span><span class="rm-status-title">${esc(s.currentTitle)}</span>`:`<span class="rm-status-empty">No relationship milestone yet</span>`;
    const d=$('#rmDiagnostic'); if(d)d.textContent=getChat()?`Connected to active timeline • v${VERSION}`:`Popup ready • open a Chat timeline to save milestones • v${VERSION}`;
  }
  function renderHistory(){
    const host=$('#rmHistory');if(!host)return;const list=history().slice().reverse();
    host.innerHTML=list.length?list.map(m=>`<article class="rm-history-item"><div class="rm-history-emoji">${esc(m.emoji||'🖤')}</div><div class="rm-history-copy"><strong>${esc(m.title||'Milestone')}</strong><span>${esc(m.line||m.note||'')}</span><small>${esc(fmtDate(m.createdAt))}</small></div><button class="ghost small rm-replay" type="button" data-rm-id="${esc(m.id)}">Replay</button></article>`).join(''):`<div class="rm-empty-history">No ceremonies recorded yet. The prophecy remains suspiciously quiet.</div>`;
  }
  function renderAllBits(){renderStatus();renderHistory();}
  function fillPreset(){
    const s=$('#rmPreset'),wrap=$('#rmCustomFields');if(!s)return;
    if(s.value==='custom'){wrap?.classList.remove('hidden');$('#rmTitle').value='';$('#rmEmoji').value='✨🖤✨';$('#rmLine').value='';return;}
    wrap?.classList.add('hidden'); const p=PRESETS[Number(s.value)]; if(p){$('#rmTitle').value=p.title;$('#rmEmoji').value=p.emoji;$('#rmLine').value=p.line;}
  }

  function buildUI(){
    injectStyles();hideSync();
    let toolbar=$('.chat-toolbar');
    if(!$('#relationshipMilestoneBtn')){
      const b=document.createElement('button');b.id='relationshipMilestoneBtn';b.type='button';b.className='ghost small rm-toolbar-btn';b.textContent='🖤 Milestones';b.addEventListener('click',openPanel);
      if(toolbar) toolbar.prepend(b); else { b.style.position='fixed';b.style.right='12px';b.style.bottom='calc(14px + env(safe-area-inset-bottom))';b.style.zIndex='5000';document.body.appendChild(b); }
    }
    if(!$('#relationshipMilestonePanel')){
      document.body.insertAdjacentHTML('beforeend',`
<div id="relationshipMilestonePanel" class="rm-backdrop hidden" role="dialog" aria-modal="true"><section class="rm-panel-card"><header class="rm-panel-head"><div><div class="rm-eyebrow">RELATIONSHIP ARC</div><h2>Milestones</h2><div id="relationshipMilestoneStatus" class="rm-current"></div><div id="rmDiagnostic" class="rm-diagnostic"></div></div><button id="rmClosePanel" class="ghost small" type="button">Close</button></header><div class="rm-form"><label>Milestone<select id="rmPreset"><option value="">Choose a milestone…</option>${PRESETS.map((p,i)=>`<option value="${i}">${esc(p.emoji)} ${esc(p.title)}</option>`).join('')}<option value="custom">✨ Custom milestone…</option></select></label><div id="rmCustomFields" class="hidden rm-custom-fields"><label>Title<input id="rmTitle" maxlength="60" placeholder="Blood-Oathed, Crowned, Soulbound…"></label><label>Emoji / symbols<input id="rmEmoji" maxlength="24" placeholder="🩸🌹"></label><label>Ceremonial line<textarea id="rmLine" rows="2" maxlength="220"></textarea></label></div><label>Private note <span class="rm-optional">optional</span><textarea id="rmNote" rows="2" maxlength="300"></textarea></label><div class="rm-actions-row"><button id="rmTest" class="ghost" type="button">✨ Test Popup</button><button id="rmSave" class="send" type="button">🖤 Record Milestone</button></div></div><div class="rm-history-title">History</div><div id="rmHistory" class="rm-history"></div></section></div>
<div id="relationshipMilestoneCeremony" class="rm-ceremony-backdrop hidden" role="dialog" aria-modal="true"><div class="rm-stars" aria-hidden="true"><i>✦</i><i>✧</i><i>⋆</i><i>✦</i><i>✧</i><i>⋆</i></div><section class="rm-ceremony-card"><div class="rm-ceremony-kicker">✨ 🖤 RELATIONSHIP MILESTONE 🖤 ✨</div><div id="rmCeremonyEmoji" class="rm-ceremony-emoji">🌙🐺🖤</div><h2 id="rmCeremonyTitle" class="rm-ceremony-title">MATED</h2><div id="rmCeremonyNames" class="rm-ceremony-names"></div><p id="rmCeremonyLine" class="rm-ceremony-line"></p><div id="rmCeremonyDate" class="rm-ceremony-date"></div><div class="rm-ceremony-actions"><button id="rmViewHistory" class="ghost" type="button">View History</button><button id="rmContinue" class="send" type="button">Continue 🖤</button></div></section></div>`);
      $('#rmClosePanel').addEventListener('click',closePanel);$('#rmPreset').addEventListener('change',fillPreset);$('#rmTest').addEventListener('click',testCeremony);$('#rmContinue').addEventListener('click',closeCeremony);$('#rmViewHistory').addEventListener('click',()=>{closeCeremony();openPanel();});
      $('#rmSave').addEventListener('click',()=>{const s=$('#rmPreset');if(!s.value)return;const custom=s.value==='custom';const p=custom?null:PRESETS[Number(s.value)];const item=addMilestone({title:custom?$('#rmTitle').value:p?.title,emoji:custom?$('#rmEmoji').value:p?.emoji,line:custom?$('#rmLine').value:p?.line,note:$('#rmNote').value,custom});if(item){$('#rmNote').value='';closePanel();}});
      $('#rmHistory').addEventListener('click',e=>{const b=e.target.closest('.rm-replay');if(!b)return;const item=history().find(m=>String(m.id)===String(b.dataset.rmId));if(item)showCeremony(item);});
      $('#relationshipMilestonePanel').addEventListener('click',e=>{if(e.target.id==='relationshipMilestonePanel')closePanel();});$('#relationshipMilestoneCeremony').addEventListener('click',e=>{if(e.target.id==='relationshipMilestoneCeremony')closeCeremony();});
    }
    renderAllBits();
  }

  let attempts=0;
  function boot(){attempts++;buildUI();if(attempts<20 && !$('.chat-toolbar')) setTimeout(boot,500);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('pageshow',buildUI);
  new MutationObserver(()=>{hideSync();if(!$('#relationshipMilestoneBtn'))buildUI();}).observe(document.documentElement,{childList:true,subtree:true});
  window.NoctisRelationshipMilestones={version:VERSION,presets:PRESETS,open:openPanel,test:testCeremony,add:addMilestone,history};
})();
