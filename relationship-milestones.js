/* Noctis Mourning Vale — Relationship Milestones v1.2
   Adds Milestone Sync / Backfill:
   - scans the active RP transcript in manageable chunks
   - suggests relationship milestones already present in canon
   - automatically saves clear events; uncertain events remain reviewable
   - remembers scan progress for future incremental syncs
*/
(() => {
  'use strict';

  const VERSION = '1.3.5';
  if(window.NoctisRelationshipMilestones?.version===VERSION)return;
  const TYPE = 'relationship';
  const SCAN_CHARS = 14000;
  const SCAN_OVERLAP = 2;

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
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const stamp = () => new Date().toISOString();
  const makeId = () => `rel_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');

  function injectStyles(){
    if($('#rmSelfStyles')) return;
    const style=document.createElement('style');
    style.id='rmSelfStyles';
    style.textContent=`
#syncBtn,#syncModal,#syncImportInput{display:none!important}
.rm-tab-panel{margin:0}.rm-tab-panel .rm-panel-card{width:100%;max-width:none;max-height:none;overflow:visible}
.rm-backdrop,.rm-ceremony-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(7,4,10,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))}
.rm-backdrop.hidden,.rm-ceremony-backdrop.hidden,.rm-custom-fields.hidden,.rm-sync-box.hidden{display:none!important}
.rm-panel-card{width:min(720px,100%);max-height:88dvh;overflow:auto;background:linear-gradient(180deg,#1a1020,#100b15);border:1px solid rgba(213,162,255,.3);border-radius:24px;padding:20px;box-shadow:0 28px 80px rgba(0,0,0,.48);color:inherit}
.rm-panel-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}.rm-panel-head h2{margin:.15rem 0 .3rem}.rm-eyebrow,.rm-ceremony-kicker{letter-spacing:.13em;font-size:.72rem;text-transform:uppercase;opacity:.8}.rm-current{display:flex;align-items:center;gap:8px;min-height:24px}.rm-status-emoji{font-size:1.25rem}.rm-status-title{font-weight:750}.rm-status-empty{opacity:.6;font-size:.9rem}
.rm-form{display:grid;gap:12px}.rm-form label{display:grid;gap:6px}.rm-form input,.rm-form select,.rm-form textarea{width:100%;box-sizing:border-box}.rm-custom-fields{display:grid;gap:12px}.rm-optional{opacity:.55;font-weight:400}.rm-actions-row{display:flex;gap:10px;flex-wrap:wrap}.rm-actions-row>*{flex:1 1 150px}
.rm-history-title{margin:24px 0 10px;font-weight:800;letter-spacing:.04em}.rm-history{display:grid;gap:9px}.rm-history-item{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.rm-history-emoji{font-size:1.6rem}.rm-history-copy{display:grid;gap:2px}.rm-history-copy span{font-size:.87rem;opacity:.72}.rm-history-copy small{opacity:.48}.rm-empty-history{padding:18px;text-align:center;opacity:.6;border:1px dashed rgba(255,255,255,.12);border-radius:16px}.rm-toolbar-btn{white-space:nowrap}.rm-diagnostic{font-size:.78rem;opacity:.58;margin-top:8px}
.rm-sync-box{margin:18px 0 4px;padding:14px;border-radius:18px;border:1px solid rgba(174,109,220,.28);background:rgba(127,61,160,.08)}.rm-sync-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}.rm-sync-head strong{font-size:1rem}.rm-sync-status{font-size:.86rem;opacity:.75;line-height:1.35;margin:6px 0 12px}.rm-sync-list{display:grid;gap:9px;max-height:38dvh;overflow:auto}.rm-sync-item{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:flex-start;padding:11px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.065)}.rm-sync-check{margin-top:7px;transform:scale(1.15)}.rm-sync-emoji{font-size:1.45rem;line-height:1.25}.rm-sync-copy{display:grid;gap:3px}.rm-sync-copy strong{font-size:.95rem}.rm-sync-line{font-size:.84rem;opacity:.83}.rm-sync-evidence{font-size:.78rem;opacity:.58;line-height:1.35}.rm-sync-meta{font-size:.72rem;opacity:.42}.rm-sync-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.rm-sync-buttons>*{flex:1 1 130px}
.rm-ceremony-backdrop{opacity:0;transition:opacity .18s ease;overflow:hidden}.rm-ceremony-backdrop.rm-open{opacity:1}.rm-ceremony-card{position:relative;width:min(560px,100%);text-align:center;padding:34px 22px 26px;border-radius:30px;background:radial-gradient(circle at 50% 0%,rgba(136,61,170,.24),transparent 44%),linear-gradient(180deg,#1b1022,#0d0912);border:1px solid rgba(226,179,255,.38);box-shadow:0 30px 100px rgba(0,0,0,.62),0 0 54px rgba(142,73,181,.18);transform:scale(.92) translateY(10px);transition:transform .22s cubic-bezier(.2,.9,.2,1.15)}.rm-open .rm-ceremony-card{transform:scale(1) translateY(0)}.rm-ceremony-emoji{font-size:clamp(3rem,14vw,5.4rem);line-height:1.1;margin:20px 0 10px;filter:drop-shadow(0 0 20px rgba(238,193,255,.25));animation:rmFloat 2.8s ease-in-out infinite}.rm-ceremony-title{font-size:clamp(2rem,10vw,3.7rem);line-height:1;margin:.1em 0 .18em;letter-spacing:.045em;text-transform:uppercase}.rm-ceremony-names{font-size:1.08rem;font-weight:700;opacity:.9}.rm-ceremony-line{max-width:430px;margin:18px auto 8px;font-style:italic;line-height:1.5;opacity:.82}.rm-ceremony-date{font-size:.78rem;opacity:.48;margin-top:10px}.rm-ceremony-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:24px}.rm-stars{position:absolute;inset:0;pointer-events:none}.rm-stars i{position:absolute;font-style:normal;opacity:.26;animation:rmTwinkle 2s ease-in-out infinite}.rm-stars i:nth-child(1){left:8%;top:17%;font-size:1.4rem}.rm-stars i:nth-child(2){right:10%;top:24%;font-size:1.1rem;animation-delay:.4s}.rm-stars i:nth-child(3){left:17%;bottom:20%;animation-delay:.8s}.rm-stars i:nth-child(4){right:15%;bottom:16%;font-size:1.5rem;animation-delay:1.1s}.rm-stars i:nth-child(5){left:47%;top:7%;animation-delay:.65s}.rm-stars i:nth-child(6){right:5%;top:55%;animation-delay:1.4s}
@keyframes rmFloat{50%{transform:translateY(-5px) scale(1.025)}}@keyframes rmTwinkle{0%,100%{opacity:.15;transform:scale(.9)}50%{opacity:.65;transform:scale(1.18)}}
@media(max-width:600px){.rm-panel-card{padding:16px;border-radius:20px}.rm-history-item{grid-template-columns:auto 1fr}.rm-history-item .rm-replay{grid-column:2;justify-self:start}.rm-ceremony-card{padding:28px 16px 22px}.rm-ceremony-actions>*{flex:1 1 140px}.rm-sync-item{grid-template-columns:auto auto 1fr}.rm-sync-head{display:block}.rm-sync-head button{margin-top:8px}}
@media(prefers-reduced-motion:reduce){.rm-ceremony-backdrop,.rm-ceremony-card,.rm-ceremony-emoji,.rm-stars i{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(style);
  }

  function hideSync(){
    ['syncBtn','syncModal','syncImportInput'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.setProperty('display','none','important');
    });
  }

  function getChat(){ try{return typeof activeChat==='function' ? activeChat() : null;}catch{return null;} }
  function getCharacter(){ try{return typeof activeCharacter==='function' ? activeCharacter() : null;}catch{return null;} }
  function getPersona(){ try{return typeof activePersona==='function' ? activePersona() : null;}catch{return null;} }
  function save(){ try{if(typeof saveVault==='function') saveVault();}catch(e){console.warn('[Milestones] saveVault failed',e);} }
  function syncCoreMemory(){ try{if(typeof syncMilestonesToMemory==='function') syncMilestonesToMemory();}catch{} }

  function ensure(ch=getChat()){
    if(!ch) return null;
    if(!Array.isArray(ch.milestones)) ch.milestones=[];
    if(!ch.relationshipState || typeof ch.relationshipState!=='object' || Array.isArray(ch.relationshipState)){
      ch.relationshipState={currentTitle:'',currentEmoji:'',updatedAt:''};
    }
    if(!('relationshipMilestoneScanThroughMessageId' in ch)) ch.relationshipMilestoneScanThroughMessageId=null;
    return ch;
  }

  function history(ch=getChat()){
    ensure(ch);
    return (ch?.milestones||[]).filter(m=>m?.type===TYPE);
  }

  function names(){
    return {
      character:String(getCharacter()?.name||'Character').trim(),
      persona:String(getPersona()?.name||'You').trim()
    };
  }

  function fmtDate(value){
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  }

  function currentState(){
    const ch=ensure();
    if(!ch) return {currentTitle:'',currentEmoji:'',updatedAt:''};
    const list=history(ch), last=list[list.length-1];
    return ch.relationshipState?.currentTitle
      ? ch.relationshipState
      : last
        ? {currentTitle:last.title,currentEmoji:last.emoji,updatedAt:last.occurredAt||last.createdAt}
        : {currentTitle:'',currentEmoji:'',updatedAt:''};
  }

  function addMilestone({
    title,emoji,line,note='',custom=false,
    source='manual',sourceMessageId=null,sourceMessageIndex=null,
    occurredAt=null,evidence='',show=true
  }){
    const ch=ensure();
    if(!ch){
      alert('Noctis milestone storage is not available on this screen yet. Open a roleplay chat and try again.');
      return null;
    }

    title=String(title||'').trim();
    emoji=String(emoji||'✨🖤✨').trim();
    line=String(line||'').trim();
    note=String(note||'').trim();
    evidence=String(evidence||'').trim();
    if(!title) return null;

    const n=names();
    const createdAt=stamp();
    const item={
      id:makeId(),type:TYPE,title,emoji,line,note,
      text:`${emoji} ${title}: ${line}`,
      participants:[n.persona,n.character],
      custom:!!custom,
      source,
      sourceMessageId:sourceMessageId||null,
      sourceMessageIndex:Number.isInteger(Number(sourceMessageIndex))?Number(sourceMessageIndex):null,
      occurredAt:occurredAt||null,
      evidence,
      createdAt,
      updatedAt:createdAt
    };

    ch.milestones.push(item);
    ch.relationshipState={
      currentTitle:title,
      currentEmoji:emoji,
      updatedAt:item.occurredAt||createdAt
    };
    ch.updatedAt=createdAt;
    syncCoreMemory();
    save();
    renderAllBits();
    if(!document.querySelector('.message-edit'))renderMessages();
    if(show) showCeremony(item);
    return item;
  }

  let closeTimer=null, ceremonyChat=null, returnFocus=null;
  function showCeremony(item){
    clearTimeout(closeTimer);
    buildUI();
    const modal=$('#relationshipMilestoneCeremony');
    if(!modal)return;
    const n=names();
    ceremonyChat=getChat();
    returnFocus=document.activeElement;
    if(item.pendingCelebration){item.pendingCelebration=false;save();}
    $('#rmCeremonyEmoji').textContent=item.emoji||'✨🖤✨';
    $('#rmCeremonyTitle').textContent=item.title||'Milestone';
    $('#rmCeremonyNames').textContent=item.participants?.length?item.participants.join(' & '):`${n.persona} + ${n.character}`;
    $('#rmCeremonyLine').textContent=item.line||item.note||'A new chapter has begun.';
    $('#rmCeremonyDate').textContent=fmtDate(item.occurredAt||item.createdAt||stamp());
    modal.classList.remove('hidden');
    requestAnimationFrame(()=>{modal.classList.add('rm-open');$('#rmContinue')?.focus({preventScroll:true});});
  }

  function testCeremony(){
    showCeremony({
      title:'FATED',
      emoji:'✨♾️🖤',
      line:'The milestone system is alive. Noctis heard the prophecy.',
      createdAt:stamp()
    });
  }

  function closeCeremony(){
    const m=$('#relationshipMilestoneCeremony');
    if(!m)return;
    m.classList.remove('rm-open');
    clearTimeout(closeTimer);
    closeTimer=setTimeout(()=>{m.classList.add('hidden');returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});flushCelebrations();},180);
  }

  function flushCelebrations(){
    const modal=$('#relationshipMilestoneCeremony');
    if(modal && !modal.classList.contains('hidden'))return;
    if(document.visibilityState==='hidden' || !document.querySelector('[data-view="chat"].active'))return;
    const pending=history().find(item=>item.pendingCelebration);
    if(pending)showCeremony(pending);
  }

  function openPanel(){
    buildUI();
    if(pendingReview?.chat!==getChat()){
      pendingSuggestions=[];
      $('#rmSyncBox')?.classList.add('hidden');
    }
    if(typeof selectTab==='function')selectTab('milestones');
    renderAllBits();
    renderAutoStatus();
  }
  function closePanel(){if(typeof selectTab==='function')selectTab('chat');}

  function renderStatus(){
    const host=$('#relationshipMilestoneStatus');
    if(!host)return;
    const s=currentState();
    host.innerHTML=s.currentTitle
      ? `<span class="rm-status-emoji">${esc(s.currentEmoji||'🖤')}</span><span class="rm-status-title">${esc(s.currentTitle)}</span>`
      : `<span class="rm-status-empty">No relationship milestone yet</span>`;
    const d=$('#rmDiagnostic');
    if(d)d.textContent=getChat()
      ? `Connected to active timeline • milestone sync ready • v${VERSION}`
      : `Popup ready • open a Chat timeline to save milestones • v${VERSION}`;
  }

  function renderHistory(){
    const host=$('#rmHistory');
    if(!host)return;
    const list=history().slice().sort((a,b)=>{
      const aa=Date.parse(a.occurredAt||a.createdAt||'')||0;
      const bb=Date.parse(b.occurredAt||b.createdAt||'')||0;
      return bb-aa;
    });
    host.innerHTML=list.length
      ? list.map(m=>`<article class="rm-history-item">
          <div class="rm-history-emoji">${esc(m.emoji||'🖤')}</div>
          <div class="rm-history-copy">
            <strong>${esc(m.title||'Milestone')}</strong>
            <span>${esc(m.line||m.note||'')}</span>
            <small>${esc(fmtDate(m.occurredAt||m.createdAt))}${m.source==='story-sync'?' • Story Sync':''}</small>
          </div>
          <button class="ghost small rm-replay" type="button" data-rm-id="${esc(m.id)}">Replay</button>
        </article>`).join('')
      : `<div class="rm-empty-history">No ceremonies recorded yet. The prophecy remains suspiciously quiet.</div>`;
  }

  function renderAllBits(){renderStatus();renderHistory();}

  function fillPreset(){
    const s=$('#rmPreset'),wrap=$('#rmCustomFields');
    if(!s)return;
    if(s.value==='custom'){
      wrap?.classList.remove('hidden');
      $('#rmTitle').value='';
      $('#rmEmoji').value='✨🖤✨';
      $('#rmLine').value='';
      return;
    }
    wrap?.classList.add('hidden');
    const p=PRESETS[Number(s.value)];
    if(p){
      $('#rmTitle').value=p.title;
      $('#rmEmoji').value=p.emoji;
      $('#rmLine').value=p.line;
    }
  }

  /* ---------------- STORY MILESTONE SYNC ---------------- */

  function storyMessages(){
    const ch=ensure();
    if(!ch) return [];
    return (ch.messages||[]).filter(m=>
      m && !m.error &&
      (m.role==='user'||m.role==='assistant') &&
      String(m.text||'').trim()
    );
  }

  function scanStartIndex(msgs, full=false){
    if(full) return 0;
    const ch=ensure();
    if(!ch?.relationshipMilestoneScanThroughMessageId) return 0;
    const i=msgs.findIndex(m=>String(m.id)===String(ch.relationshipMilestoneScanThroughMessageId));
    return i>=0 ? i+1 : 0;
  }

  function buildChunks(msgs,startIndex){
    const chunks=[];
    let i=startIndex;
    while(i<msgs.length){
      let j=i, chars=0;
      while(j<msgs.length){
        const len=String(msgs[j]?.text||'').length+70;
        if(j>i && chars+len>SCAN_CHARS) break;
        chars+=len;
        j++;
      }
      chunks.push({start:i,end:j});
      if(j>=msgs.length) break;
      i=Math.max(i+1,j-SCAN_OVERLAP);
    }
    return chunks;
  }

  function transcriptFor(msgs,start,end){
    return msgs.slice(start,end).map((m,offset)=>{
      const idx=start+offset+1;
      const who=m.role==='user'?'PROTAGONIST':'CHARACTER';
      return `[${idx}] ${who}: ${String(m.text||'').trim()}`;
    }).join('\n\n');
  }

  function cleanJson(raw){
    let text=String(raw||'').trim();
    text=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();

    const firstObj=text.indexOf('{'), firstArr=text.indexOf('[');
    const starts=[firstObj,firstArr].filter(i=>i>=0);
    if(starts.length) text=text.slice(Math.min(...starts));

    const extractOrRepair=(input)=>{
      const stack=[];let inString=false,escape=false,end=-1;
      for(let i=0;i<input.length;i++){
        const ch=input[i];
        if(inString){
          if(escape){escape=false;continue;}
          if(ch==='\\'){escape=true;continue;}
          if(ch==='"')inString=false;
          continue;
        }
        if(ch==='"'){inString=true;continue;}
        if(ch==='{'||ch==='[')stack.push(ch);
        else if(ch==='}'||ch===']'){
          const want=ch==='}'?'{':'[';
          if(stack.at(-1)!==want)continue;
          stack.pop();
          if(!stack.length){end=i+1;break;}
        }
      }
      let out=end>0?input.slice(0,end):input;
      out=out.replace(/,\s*([}\]])/g,'$1').trim();
      if(end<0 && stack.length){
        for(let i=stack.length-1;i>=0;i--) out+=stack[i]==='{'?'}':']';
      }
      return out;
    };

    const candidates=[text,extractOrRepair(text)];
    let lastErr;
    for(const candidate of candidates){
      try{return JSON.parse(candidate);}catch(err){lastErr=err;}
    }
    throw lastErr;
  }

  function presetForTitle(title){
    return PRESETS.find(p=>norm(p.title)===norm(title))||null;
  }

  function normalizeSuggestion(x,msgs){
    if(!x || typeof x!=='object') return null;
    let title=String(x.title||'').trim();
    if(!title) return null;

    const preset=presetForTitle(title);
    const emoji=String(x.emoji||preset?.emoji||'✨🖤✨').trim();
    const line=String(x.line||preset?.line||'A lasting relationship milestone occurred.').trim();
    const evidence=String(x.evidence||'').trim();
    const confidence=/^high$/i.test(String(x.confidence||''))?'high':'medium';

    let messageIndex=Number(x.messageIndex);
    if(!Number.isInteger(messageIndex) || messageIndex<1 || messageIndex>msgs.length) messageIndex=null;
    const sourceMsg=messageIndex?msgs[messageIndex-1]:null;

    return {
      id:`suggest_${Math.random().toString(36).slice(2,9)}`,
      title,
      emoji,
      line,
      evidence,
      confidence,
      messageIndex,
      sourceMessageId:sourceMsg?.id||null,
      occurredAt:sourceMsg?.createdAt||sourceMsg?.timestamp||null,
      custom:!preset
    };
  }

  function suggestionKey(s){
    if(s.sourceMessageId) return `${norm(s.title)}|id:${s.sourceMessageId}`;
    return `${norm(s.title)}|${norm(s.line).slice(0,120)}`;
  }

  function dedupeSuggestions(items){
    const out=[], seen=new Set();
    for(const s of items){
      const k=suggestionKey(s);
      if(seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out.sort((a,b)=>(a.messageIndex||999999)-(b.messageIndex||999999));
  }

  function alreadyRecorded(s){
    return history().some(m=>{
      if(s.sourceMessageId && m.sourceMessageId && String(s.sourceMessageId)===String(m.sourceMessageId) && norm(s.title)===norm(m.title)) return true;
      return norm(m.title)===norm(s.title) && norm(m.line)===norm(s.line);
    });
  }

  async function analyzeChunk(msgs,chunk,chunkNumber,totalChunks){
    const transcript=transcriptFor(msgs,chunk.start,chunk.end);
    const presetNames=PRESETS.map(p=>p.title).join(', ');

    const prompt=`You are a continuity archivist reviewing an EXISTING fictional roleplay transcript for relationship milestones that have ALREADY HAPPENED.

Your job is retrospective detection only. Do not write new story, do not predict future events, and do not invent anything.

Find only durable relationship milestones that future continuity should remember.

GOOD milestone examples:
- first kiss or first sexual intimacy when it materially changes the relationship
- mutual love confession
- becoming official / dating / committed
- explicit mate recognition, mate acceptance, bonding, marking, claiming, blood bond, soul bond
- engagement, marriage, vows, moving in together
- breakup, separation, reconciliation, forgiveness after a major rupture
- pregnancy / becoming parents when clearly established
- a supernatural or political relationship status such as being crowned consort
- another clear relationship-defining event

Use one of these exact preset titles when it truly fits:
${presetNames}

Otherwise use a short custom title such as "First Kiss", "Love Confessed", "Reconciled", "Moved In", or "Expecting a Child".

STRICT RULES:
- The event must actually occur in the supplied transcript or be unambiguously established as already-canon there.
- CHARACTER/assistant narration is not self-verifying evidence for a protagonist-affecting permanent event. For sex, first intimacy, orgasm, biting/marking, mate/bond/claim states, engagement, marriage, pregnancy, children, transformation, major injury, moving in, breakup, or reconciliation, require explicit PROTAGONIST participation/confirmation in the transcript or an already-recorded canon source.
- If a CHARACTER reply invents a mark, bond, sexual event, child, or other milestone and the PROTAGONIST does not confirm or participate in it, do NOT archive it as a completed milestone.
- Possessive language and labels such as "mine", "mate", "Alpha", "claimed", or "owned" are not proof that a supernatural/relationship state actually exists.
- Do not count plans, fantasies, hypotheticals, flirting, teasing, ordinary kisses after the first, routine sex, repeated references to an already-counted event, or temporary emotions.
- Chemistry alone is not Interested, Courting, Dating, Mated, Fated, etc.
- Never infer consent to a permanent bond. Mated, Marked, Bonded, Blood-Bound, marriage, engagement, claiming, pregnancy decisions, or similar permanent states require explicit story evidence.
- Do not turn possessive dialogue into a permanent relationship state unless the story clearly establishes it.
- Prefer fewer high-quality milestones over many weak ones.
- messageIndex MUST be the bracketed message number where the event is best evidenced.
- evidence must be a concise paraphrase, not a quotation.
- confidence must be "high" or "medium".
- Return ONLY valid JSON. No markdown.

JSON schema:
{
  "milestones": [
    {
      "title": "Dating",
      "emoji": "🖤✨",
      "line": "They chose to begin a relationship together.",
      "evidence": "They explicitly agreed they were boyfriend and girlfriend.",
      "messageIndex": 42,
      "confidence": "high"
    }
  ]
}

If none are present, return:
{"milestones":[]}

TRANSCRIPT CHUNK ${chunkNumber} OF ${totalChunks}:
${transcript}

ALREADY RECORDED — do not repeat these events:
${history().map(m=>`${m.title}: ${m.line}`).join('\n')||'(none)'}`;

    const raw=await openRouterRequest([
      {role:'system',content:'Return ONLY valid JSON for retrospective fictional relationship milestone extraction. Never invent events.'},
      {role:'user',content:prompt}
    ],1400,0.02);

    const data=cleanJson(raw);
    if(!Array.isArray(data?.milestones))throw new Error('Invalid milestone response; scan progress was not advanced');
    const arr=data.milestones;
    return arr.map(x=>normalizeSuggestion(x,msgs)).filter(Boolean);
  }

  let pendingSuggestions=[];
  let pendingReview=null;
  let scanBusy=false;
  function renderAutoStatus(){
    const ch=getChat(), el=$('#rmAutoStatus'), toggle=$('#rmAutoEnabled');
    const review=$('#rmReviewAutomatic');
    if(review){const n=ch?.relationshipMilestoneAutoSuggestions?.length||0;review.hidden=!n;review.textContent=`Review ${n} uncertain milestone${n===1?'':'s'}`;}
    if(toggle)toggle.checked=settings.autoRelationshipMilestones!==false;
    if(el)el.textContent=settings.autoRelationshipMilestones===false?'Automatic scans paused.':
      (ch?.relationshipMilestoneAutoStatus||'Catches up this chat, then checks batches of 12 new messages. Maximum 4 automatic batches per UTC day across chats. Uses your selected model and credits. Only high-confidence events are saved.');
  }

  async function autoScan(){
    renderAutoStatus();
    if(settings.autoRelationshipMilestones===false || !settings.apiKey || scanBusy ||
      document.visibilityState==='hidden' || (typeof mainGenerationBusy!=='undefined' && mainGenerationBusy) || pendingReview?.complete)return;
    const ch=ensure(), msgs=storyMessages().map(m=>({...m}));
    // Catch up older history even when a chat is waiting for its next reply.
    while(msgs.length && msgs.at(-1).role!=='assistant')msgs.pop();
    if(!ch || !msgs.length || Date.now()<Number(ch.relationshipMilestoneAutoRetryAt||0))return;
    const start=scanStartIndex(msgs);
    if(start>=msgs.length)return;
    // Batch ordinary live detection, but scan sooner when the newest scene contains an obvious relationship-milestone signal.
    const recentText=msgs.slice(Math.max(start,msgs.length-4)).map(m=>String(m.text||'')).join('\n').toLowerCase();
    const urgentSignal=/\b(i love you|love you|boyfriend|girlfriend|partner|dating|exclusive|committed|engaged|proposal|marry me|married|wedding|mated|mate bond|bonded|marked|claimed|fated|blood[- ]bound|pregnant|pregnancy|broke up|break up|we're done|reconciled|reconciliation)\b/i.test(recentText);
    if(ch.relationshipMilestoneAutoCaughtUp && msgs.length-start<12 && !urgentSignal){
      ch.relationshipMilestoneAutoStatus=`Waiting to batch 12 new messages (${msgs.length-start}/12). Obvious milestone language will trigger an earlier check.`;renderAutoStatus();return;
    }
    const day=new Date().toISOString().slice(0,10);
    let budget;try{budget=JSON.parse(localStorage.getItem('noctis-milestone-auto-budget')||'null');}catch{}
    if(!budget||budget.day!==day)budget={day,count:0};
    if(budget.count>=4){ch.relationshipMilestoneAutoStatus='Automatic daily scan budget used (4 batches). Story replies remain available if your provider allows them. Catch-up resumes tomorrow; manual sync is available.';renderAutoStatus();return;}
    if(!ch.relationshipMilestoneAutoCatchupTarget)ch.relationshipMilestoneAutoCatchupTarget=msgs.at(-1).id;
    const catchup=!ch.relationshipMilestoneAutoCaughtUp;
    const chunk=buildChunks(msgs,Math.max(0,start-SCAN_OVERLAP))[0];
    // Ensure a long overlap cannot prevent forward progress.
    if(chunk.end<=start){chunk.start=start;chunk.end=buildChunks(msgs,start)[0].end;}
    scanBusy=true;
    budget.count++;localStorage.setItem('noctis-milestone-auto-budget',JSON.stringify(budget));
    ch.relationshipMilestoneAutoStatus=`${catchup?'Catching up':'Checking new replies'}: reading through message ${chunk.end} of ${msgs.length}…`;
    save();renderAutoStatus();
    try{
      const found=await analyzeChunk(msgs,chunk,1,1);
      if(getChat()!==ch)return;
      const current=storyMessages();
      if(msgs.slice(0,chunk.end).some((m,i)=>current[i]?.id!==m.id||current[i]?.text!==m.text))throw new Error('Story changed during the scan');
      if(settings.autoRelationshipMilestones===false)return;
      let last=null, added=0;
      for(const s of dedupeSuggestions(found)){
        if(!s.evidence||!s.sourceMessageId||s.messageIndex<=chunk.start||s.messageIndex>chunk.end||alreadyRecorded(s))continue;
        if(s.confidence!=='high'){
          ch.relationshipMilestoneAutoSuggestions=dedupeSuggestions([...(ch.relationshipMilestoneAutoSuggestions||[]),s]);continue;
        }
        last=addMilestone({...s,note:s.evidence,source:'automatic',sourceMessageIndex:s.messageIndex,show:false});added++;
        const sourceIndex=s.messageIndex?Number(s.messageIndex)-1:-1;
        const isRecent=sourceIndex>=Math.max(0,msgs.length-4);
        if(last && (!catchup || isRecent))last.pendingCelebration=true;
      }
      ch.relationshipMilestoneAutoSuggestions=(ch.relationshipMilestoneAutoSuggestions||[]).filter(s=>!alreadyRecorded(s));
      ch.relationshipMilestoneScanThroughMessageId=msgs[chunk.end-1].id;
      const target=msgs.findIndex(m=>m.id===ch.relationshipMilestoneAutoCatchupTarget);
      if(target<chunk.end)ch.relationshipMilestoneAutoCaughtUp=true;
      ch.relationshipMilestoneAutoRetryAt=0;
      ch.relationshipMilestoneAutoStatus=chunk.end<msgs.length?
        `Catch-up saved through message ${chunk.end} of ${msgs.length}. Continuing automatically…`:
        `Up to date through message ${chunk.end}. New replies will be checked automatically.`;
      ch.updatedAt=stamp();save();renderAllBits();renderAutoStatus();
      // Old backfill stays quiet, but a newly-detected recent event still gets its celebration.
      if(last?.pendingCelebration)flushCelebrations();
    }catch(err){
      ch.relationshipMilestoneAutoRetryAt=Date.now()+30*60*1000;
      ch.relationshipMilestoneAutoStatus=`Automatic scan paused for 30 minutes: ${err?.message||String(err)}. Saved progress is retained.`;
      ch.updatedAt=stamp();save();renderAutoStatus();
    }finally{scanBusy=false;}
  }
  function validReview(){
    if(!pendingReview || pendingReview.chat!==getChat() || !pendingReview.complete){
      setSyncStatus('Finish a scan of this timeline before marking it reviewed.');return false;
    }
    const current=storyMessages();
    if(pendingReview.messages.some((m,i)=>current[i]?.id!==m.id || current[i]?.text!==m.text)){
      setSyncStatus('The scanned transcript was edited. Run Milestone Sync again.');return false;
    }
    return true;
  }

  function setSyncStatus(text){
    const el=$('#rmSyncStatus');
    if(el) el.textContent=text||'';
  }

  function renderSyncSuggestions(){
    const box=$('#rmSyncBox'), list=$('#rmSyncList');
    if(!box||!list)return;
    box.classList.remove('hidden');

    if(!pendingSuggestions.length){
      list.innerHTML=`<div class="rm-empty-history">No unrecorded relationship milestones were found in this scan.</div>`;
      $('#rmAddSelected').disabled=true;
      return;
    }

    $('#rmAddSelected').disabled=false;
    list.innerHTML=pendingSuggestions.map((s,i)=>`
      <label class="rm-sync-item">
        <input class="rm-sync-check" type="checkbox" data-sync-index="${i}" checked />
        <span class="rm-sync-emoji">${esc(s.emoji)}</span>
        <span class="rm-sync-copy">
          <strong>${esc(s.title)}</strong>
          <span class="rm-sync-line">${esc(s.line)}</span>
          <span class="rm-sync-evidence">${esc(s.evidence||'Detected from the story transcript.')}</span>
          <span class="rm-sync-meta">${s.messageIndex?`Around story message ${s.messageIndex}`:'Story transcript'} • ${esc(s.confidence)} confidence</span>
        </span>
      </label>`).join('');
  }

  async function runMilestoneSync(full=false){
    if(scanBusy)return;
    pendingReview=null;
    const ch=ensure();
    if(!ch){alert('Open a story timeline first.');return;}
    if(typeof openRouterRequest!=='function'){
      alert('Milestone Sync needs Noctis model access. Open Settings and make sure the model connection works.');
      return;
    }

    const msgs=storyMessages();
    if(!msgs.length){setSyncStatus('There is no story transcript to scan yet.');$('#rmSyncBox')?.classList.remove('hidden');return;}

    const start=scanStartIndex(msgs,full);
    if(start>=msgs.length && !full){
      pendingSuggestions=[];
      renderSyncSuggestions();
      setSyncStatus('Milestone Sync is already caught up with this story. Use Rescan All if you want Noctis to reread the full timeline.');
      return;
    }

    const chunks=buildChunks(msgs,start);
    scanBusy=true;
    pendingReview={chat:ch,messages:msgs.map(m=>({id:m.id,text:m.text})),complete:false};
    pendingSuggestions=[];
    $('#rmSyncBox')?.classList.remove('hidden');
    const syncBtn=$('#rmStorySync'), allBtn=$('#rmRescanAll');
    if(syncBtn)syncBtn.disabled=true;
    if(allBtn)allBtn.disabled=true;

    try{
      let found=[];
      for(let i=0;i<chunks.length;i++){
        setSyncStatus(`Reading story… chunk ${i+1} of ${chunks.length}. ${found.length?`${found.length} possible milestone${found.length===1?'':'s'} found so far.`:''}`);
        const chunkFound=await analyzeChunk(msgs,chunks[i],i+1,chunks.length);
        if(getChat()!==ch)throw new Error("Timeline changed during scan. Reopen the original timeline and scan again");
        found.push(...chunkFound);
      }

      found=dedupeSuggestions(found).filter(s=>!alreadyRecorded(s));
      pendingReview.complete=true;
      pendingSuggestions=found;
      renderSyncSuggestions();
      setSyncStatus(found.length
        ? `Found ${found.length} possible unrecorded milestone${found.length===1?'':'s'}. Review them below; nothing is saved until you tap Add Selected.`
        : `Scan complete. No new unrecorded relationship milestones were found.`);
    }catch(err){
      pendingSuggestions=[];
      renderSyncSuggestions();
      setSyncStatus(`Milestone Sync could not finish: ${err?.message||String(err)}. Nothing was added or changed.`);
    }finally{
      scanBusy=false;
      if(syncBtn)syncBtn.disabled=false;
      if(allBtn)allBtn.disabled=false;
    }
  }

  function addSelectedSuggestions(){
    if(!validReview())return;
    const ch=ensure();
    if(!ch)return;

    const checks=[...document.querySelectorAll('#rmSyncList .rm-sync-check:checked')];
    const selected=checks
      .map(c=>pendingSuggestions[Number(c.dataset.syncIndex)])
      .filter(Boolean)
      .sort((a,b)=>(a.messageIndex||999999)-(b.messageIndex||999999));

    if(!selected.length){
      setSyncStatus('Nothing selected yet.');
      return;
    }

    let last=null;
    for(const s of selected){
      last=addMilestone({
        title:s.title,
        emoji:s.emoji,
        line:s.line,
        note:s.evidence,
        custom:s.custom,
        source:'story-sync',
        sourceMessageId:s.sourceMessageId,
        sourceMessageIndex:s.messageIndex,
        occurredAt:s.occurredAt,
        evidence:s.evidence,
        show:false
      });
    }

    const msgs=storyMessages();
    ch.relationshipMilestoneScanThroughMessageId=pendingReview.messages.at(-1)?.id||null;
    ch.updatedAt=stamp();
    ch.relationshipMilestoneAutoSuggestions=(ch.relationshipMilestoneAutoSuggestions||[]).filter(s=>!selected.some(x=>suggestionKey(x)===suggestionKey(s)));
    syncCoreMemory();
    save();

    pendingSuggestions=pendingSuggestions.filter(s=>!selected.includes(s));
    if(!pendingSuggestions.length)pendingReview=null;
    renderSyncSuggestions();
    renderAllBits();
    setSyncStatus(`Added ${selected.length} milestone${selected.length===1?'':'s'} to this timeline. Future syncs will start after the story you just reviewed.`);

    if(last) showCeremony({
      ...last,
      title:selected.length===1?last.title:'MILESTONE SYNC',
      emoji:selected.length===1?last.emoji:'✨📜🖤',
      line:selected.length===1?last.line:`${selected.length} existing relationship milestones were restored from the story.`
    });
  }

  function markScanReviewed(){
    if(!validReview())return;
    const ch=ensure();
    const msgs=storyMessages();
    if(!ch||!msgs.length)return;
    ch.relationshipMilestoneScanThroughMessageId=pendingReview.messages.at(-1)?.id||null;
    ch.relationshipMilestoneAutoSuggestions=[];
    ch.updatedAt=stamp();
    save();
    pendingSuggestions=[];
    pendingReview=null;
    renderSyncSuggestions();
    setSyncStatus('Marked this story as reviewed. Future syncs will scan only newer messages.');
  }

  function selectAllSuggestions(on=true){
    document.querySelectorAll('#rmSyncList .rm-sync-check').forEach(c=>c.checked=!!on);
  }

  /* ---------------- UI ---------------- */

  function buildUI(){
    injectStyles();
    hideSync();

    if(!$('#relationshipMilestonePanel')){
      const host=$('#relationshipMilestoneTabHost')||document.body;
      host.insertAdjacentHTML('beforeend',`
<div id="relationshipMilestonePanel" class="rm-tab-panel">
  <section class="rm-panel-card">
    <header class="rm-panel-head">
      <div>
        <div class="rm-eyebrow">RELATIONSHIP ARC</div>
        <h2>Milestones</h2>
        <div id="relationshipMilestoneStatus" class="rm-current"></div>
        <div id="rmDiagnostic" class="rm-diagnostic"></div>
      </div>
      <button id="rmClosePanel" class="ghost small" type="button">Back to Story</button>
    </header>

    <div class="rm-form">
      <label><input id="rmAutoEnabled" type="checkbox" checked /> Automatically catch up and detect milestones</label>
      <p id="rmAutoStatus" class="hint" aria-live="polite"></p>
      <button id="rmReviewAutomatic" class="ghost small" type="button" hidden>Review uncertain milestones</button>
      <div class="rm-actions-row">
        <button id="rmStorySync" class="send" type="button">🔄 Milestone Sync</button>
        <button id="rmTest" class="ghost" type="button">✨ Test Popup</button>
      </div>

      <div id="rmSyncBox" class="rm-sync-box hidden">
        <div class="rm-sync-head">
          <div>
            <strong>Story Milestone Review</strong>
            <div id="rmSyncStatus" class="rm-sync-status">No scan running.</div>
          </div>
          <button id="rmRescanAll" class="ghost small" type="button">↺ Rescan All</button>
        </div>
        <div id="rmSyncList" class="rm-sync-list"></div>
        <div class="rm-sync-buttons">
          <button id="rmSelectAll" class="ghost small" type="button">Select All</button>
          <button id="rmSelectNone" class="ghost small" type="button">Select None</button>
          <button id="rmMarkReviewed" class="ghost small" type="button">Mark Reviewed</button>
          <button id="rmAddSelected" class="send small" type="button">🖤 Add Selected</button>
        </div>
      </div>

      <label>Milestone
        <select id="rmPreset">
          <option value="">Choose a milestone…</option>
          ${PRESETS.map((p,i)=>`<option value="${i}">${esc(p.emoji)} ${esc(p.title)}</option>`).join('')}
          <option value="custom">✨ Custom milestone…</option>
        </select>
      </label>

      <div id="rmCustomFields" class="hidden rm-custom-fields">
        <label>Title<input id="rmTitle" maxlength="60" placeholder="Blood-Oathed, Crowned, Soulbound…"></label>
        <label>Emoji / symbols<input id="rmEmoji" maxlength="24" placeholder="🩸🌹"></label>
        <label>Ceremonial line<textarea id="rmLine" rows="2" maxlength="220"></textarea></label>
      </div>

      <label>Private note <span class="rm-optional">optional</span>
        <textarea id="rmNote" rows="2" maxlength="300"></textarea>
      </label>

      <button id="rmSave" class="send" type="button">🖤 Record Milestone</button>
    </div>

    <div class="rm-history-title">History</div>
    <div id="rmHistory" class="rm-history"></div>
  </section>
</div>

<div id="relationshipMilestoneCeremony" class="rm-ceremony-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="rmCeremonyTitle" aria-describedby="rmCeremonyLine">
  <div class="rm-stars" aria-hidden="true"><i>✦</i><i>✧</i><i>⋆</i><i>✦</i><i>✧</i><i>⋆</i></div>
  <section class="rm-ceremony-card">
    <div class="rm-ceremony-kicker">✨ 🖤 RELATIONSHIP MILESTONE 🖤 ✨</div>
    <div id="rmCeremonyEmoji" class="rm-ceremony-emoji">🌙🐺🖤</div>
    <h2 id="rmCeremonyTitle" class="rm-ceremony-title">MATED</h2>
    <div id="rmCeremonyNames" class="rm-ceremony-names"></div>
    <p id="rmCeremonyLine" class="rm-ceremony-line"></p>
    <div id="rmCeremonyDate" class="rm-ceremony-date"></div>
    <div class="rm-ceremony-actions">
      <button id="rmViewHistory" class="ghost" type="button">View History</button>
      <button id="rmContinue" class="send" type="button">Continue 🖤</button>
    </div>
  </section>
</div>`);

      // Keep celebration popups outside the hidden tab view so they can appear over the active story.
      const ceremony=$('#relationshipMilestoneCeremony');
      if(ceremony && ceremony.parentElement!==document.body)document.body.appendChild(ceremony);

      $('#rmClosePanel').addEventListener('click',closePanel);
      $('#rmReviewAutomatic').addEventListener('click',()=>{
        const ch=ensure();if(scanBusy||!ch)return;
        const msgs=storyMessages(),through=msgs.findIndex(m=>m.id===ch.relationshipMilestoneScanThroughMessageId);
        pendingSuggestions=(ch.relationshipMilestoneAutoSuggestions||[]).filter(s=>!alreadyRecorded(s));
        pendingReview={chat:ch,messages:msgs.slice(0,through+1).map(m=>({id:m.id,text:m.text})),complete:true};
        renderSyncSuggestions();setSyncStatus('These events were uncertain. Select only the ones your story established.');
      });
      $('#rmAutoEnabled').addEventListener('change',e=>{
        settings.autoRelationshipMilestones=e.target.checked;saveSettings();renderAutoStatus();
        if(e.target.checked)autoScan();
      });
      $('#rmPreset').addEventListener('change',fillPreset);
      $('#rmTest').addEventListener('click',testCeremony);
      $('#rmStorySync').addEventListener('click',()=>runMilestoneSync(false));
      $('#rmRescanAll').addEventListener('click',()=>runMilestoneSync(true));
      $('#rmSelectAll').addEventListener('click',()=>selectAllSuggestions(true));
      $('#rmSelectNone').addEventListener('click',()=>selectAllSuggestions(false));
      $('#rmMarkReviewed').addEventListener('click',markScanReviewed);
      $('#rmAddSelected').addEventListener('click',addSelectedSuggestions);
      $('#rmContinue').addEventListener('click',closeCeremony);
      $('#rmViewHistory').addEventListener('click',()=>{closeCeremony();openPanel();});

      $('#rmSave').addEventListener('click',()=>{
        const s=$('#rmPreset');
        if(!s.value)return;
        const custom=s.value==='custom';
        const p=custom?null:PRESETS[Number(s.value)];
        const item=addMilestone({
          title:custom?$('#rmTitle').value:p?.title,
          emoji:custom?$('#rmEmoji').value:p?.emoji,
          line:custom?$('#rmLine').value:p?.line,
          note:$('#rmNote').value,
          custom
        });
        if(item){
          $('#rmNote').value='';
        }
      });

      $('#rmHistory').addEventListener('click',e=>{
        const b=e.target.closest('.rm-replay');
        if(!b)return;
        const item=history().find(m=>String(m.id)===String(b.dataset.rmId));
        if(item)showCeremony(item);
      });

      $('#relationshipMilestonePanel').addEventListener('click',e=>{
        if(e.target.id==='relationshipMilestonePanel')closePanel();
      });

      $('#relationshipMilestoneCeremony').addEventListener('click',e=>{
        if(e.target.id==='relationshipMilestoneCeremony')closeCeremony();
      });
    }

    renderAllBits();renderAutoStatus();
  }

  let attempts=0;
  function boot(){
    attempts++;
    buildUI();
    if(attempts<20 && !$('#relationshipMilestoneTabHost')) setTimeout(boot,500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.addEventListener('pageshow',()=>{buildUI();flushCelebrations();});
  document.addEventListener('visibilitychange',flushCelebrations);
  document.addEventListener('keydown',event=>{
    const modal=$('#relationshipMilestoneCeremony');
    if(!modal || modal.classList.contains('hidden'))return;
    if(event.key==='Escape'){event.preventDefault();closeCeremony();}
    if(event.key==='Tab'){
      const first=$('#rmViewHistory'),last=$('#rmContinue');
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  new MutationObserver(()=>{
    const modal=$('#relationshipMilestoneCeremony');
    if(ceremonyChat && ceremonyChat!==getChat() && modal && !modal.classList.contains('hidden'))closeCeremony();
    flushCelebrations();
  }).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['class']});
  setTimeout(flushCelebrations,0);
  setInterval(autoScan,120000);
  setTimeout(autoScan,10000);
  new MutationObserver(()=>{
    hideSync();
    if(!$('#relationshipMilestonePanel') && $('#relationshipMilestoneTabHost'))buildUI();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.NoctisRelationshipMilestones={
    version:VERSION,
    presets:PRESETS,
    open:openPanel,
    test:testCeremony,
    show:showCeremony,
    add:addMilestone,
    history,
    autoScan,
    sync:()=>runMilestoneSync(false),
    rescanAll:()=>runMilestoneSync(true)
  };
})();
