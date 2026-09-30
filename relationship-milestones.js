/* Noctis Mourning Vale — Relationship Milestones v1.0
   Additive module. Stores ceremonial relationship events inside chat.milestones
   so existing vault backup and multi-device merge logic can preserve them.
*/
(() => {
  const MODULE_VERSION = "1.0.0";
  const TYPE = "relationship";
  const PRESETS = [
    {title:"Interested", emoji:"🖤🌹", line:"Something has begun to pull them closer."},
    {title:"Courting", emoji:"🌹🕯️", line:"Intent has stepped out of the shadows."},
    {title:"Dating", emoji:"🖤✨", line:"They have chosen to explore this together."},
    {title:"Committed", emoji:"🔐🖤", line:"Their choice has become a promise."},
    {title:"Bonded", emoji:"🔗✨", line:"A bond now lives between them."},
    {title:"Marked", emoji:"🐺🌙", line:"The bond has been given a visible sign."},
    {title:"Mated", emoji:"🌙🐺🖤", line:"The mate bond has been recognized and accepted."},
    {title:"Fated", emoji:"✨♾️✨", line:"Fate has made itself impossible to ignore."},
    {title:"Blood-Bound", emoji:"🩸🌹", line:"Blood and choice have sealed something lasting."},
    {title:"Chosen", emoji:"🔮🕯️", line:"They chose one another with open eyes."},
    {title:"Engaged", emoji:"💍🖤", line:"A future together has been promised."},
    {title:"Married", emoji:"🕯️💍🌹", line:"Their lives have been joined by vow."},
    {title:"Crowned", emoji:"👑🖤", line:"Love and power now share a throne."},
    {title:"Immortal Consort", emoji:"♾️👑🌙", line:"Their bond has crossed beyond a mortal lifetime."}
  ];

  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const iso = () => new Date().toISOString();
  const makeId = () => (typeof uid === "function" ? uid() : `rel_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

  function chat(){ try { return typeof activeChat === "function" ? activeChat() : null; } catch { return null; } }
  function character(){ try { return typeof activeCharacter === "function" ? activeCharacter() : null; } catch { return null; } }
  function persona(){ try { return typeof activePersona === "function" ? activePersona() : null; } catch { return null; } }
  function persist(){ try { if(typeof saveVault === "function") saveVault(); } catch {} }

  function ensure(ch = chat()){
    if(!ch) return null;
    if(!Array.isArray(ch.milestones)) ch.milestones = [];
    if(!ch.relationshipState || typeof ch.relationshipState !== "object" || Array.isArray(ch.relationshipState)){
      ch.relationshipState = { currentTitle:"", currentEmoji:"", updatedAt:"" };
    }
    return ch;
  }

  function relationshipMilestones(ch = chat()){
    ensure(ch);
    return (ch?.milestones || []).filter(m => m && m.type === TYPE);
  }

  function names(){
    return {
      character: String(character()?.name || "Character").trim(),
      persona: String(persona()?.name || "You").trim()
    };
  }

  function currentState(ch = chat()){
    ensure(ch);
    const history = relationshipMilestones(ch);
    const last = history[history.length - 1];
    return ch?.relationshipState?.currentTitle
      ? ch.relationshipState
      : last ? {currentTitle:last.title,currentEmoji:last.emoji,updatedAt:last.createdAt} : {currentTitle:"",currentEmoji:"",updatedAt:""};
  }

  function addMilestone({title,emoji,line,note="",custom=false}){
    const ch = ensure();
    if(!ch) return null;
    title = String(title || "").trim();
    emoji = String(emoji || "✨🖤✨").trim();
    line = String(line || "").trim();
    note = String(note || "").trim();
    if(!title) return null;
    const n = names();
    const item = {
      id: makeId(), type: TYPE, title, emoji, line, note,
      participants:[n.persona,n.character], custom:!!custom,
      createdAt: iso(), updatedAt: iso()
    };
    ch.milestones.push(item);
    ch.relationshipState = {currentTitle:title,currentEmoji:emoji,updatedAt:item.createdAt};
    ch.updatedAt = iso();
    persist();
    renderStatus();
    showCeremony(item);
    return item;
  }

  function fmtDate(value){
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  }

  function showCeremony(item){
    const modal = $("#relationshipMilestoneCeremony");
    if(!modal) return;
    const n = names();
    $("#rmCeremonyEmoji").textContent = item.emoji || "✨🖤✨";
    $("#rmCeremonyTitle").textContent = item.title || "Milestone";
    $("#rmCeremonyNames").textContent = `${n.persona} + ${n.character}`;
    $("#rmCeremonyLine").textContent = item.line || item.note || "A new chapter has begun.";
    $("#rmCeremonyDate").textContent = fmtDate(item.createdAt);
    modal.classList.remove("hidden");
    requestAnimationFrame(()=>modal.classList.add("rm-open"));
  }

  function closeCeremony(){
    const modal=$("#relationshipMilestoneCeremony");
    if(!modal) return;
    modal.classList.remove("rm-open");
    setTimeout(()=>modal.classList.add("hidden"),180);
  }

  function openPanel(){
    const panel=$("#relationshipMilestonePanel");
    if(!panel) return;
    panel.classList.remove("hidden");
    renderPanel();
  }
  function closePanel(){ $("#relationshipMilestonePanel")?.classList.add("hidden"); }

  function renderStatus(){
    const host=$("#relationshipMilestoneStatus");
    if(!host) return;
    const state=currentState();
    if(!state.currentTitle){ host.innerHTML=`<span class="rm-status-empty">No relationship milestone yet</span>`; return; }
    host.innerHTML=`<span class="rm-status-emoji">${esc(state.currentEmoji||"🖤")}</span><span class="rm-status-title">${esc(state.currentTitle)}</span>`;
  }

  function renderPanel(){
    const select=$("#rmPreset");
    if(select && !select.dataset.ready){
      select.innerHTML = `<option value="">Choose a milestone…</option>` + PRESETS.map((p,i)=>`<option value="${i}">${esc(p.emoji)} ${esc(p.title)}</option>`).join("") + `<option value="custom">✨ Custom milestone…</option>`;
      select.dataset.ready="1";
    }
    renderHistory(); renderStatus();
  }

  function renderHistory(){
    const host=$("#rmHistory"); if(!host) return;
    const list=relationshipMilestones().slice().reverse();
    if(!list.length){ host.innerHTML=`<div class="rm-empty-history">No ceremonies recorded yet. The prophecy remains suspiciously quiet.</div>`; return; }
    host.innerHTML=list.map(m=>`<article class="rm-history-item">
      <div class="rm-history-emoji">${esc(m.emoji||"🖤")}</div>
      <div class="rm-history-copy"><strong>${esc(m.title||"Milestone")}</strong><span>${esc(m.line||m.note||"")}</span><small>${esc(fmtDate(m.createdAt))}</small></div>
      <button class="ghost small rm-replay" type="button" data-rm-id="${esc(m.id)}">Replay</button>
    </article>`).join("");
  }

  function syncPresetFields(){
    const select=$("#rmPreset"), emoji=$("#rmEmoji"), title=$("#rmTitle"), line=$("#rmLine"), customWrap=$("#rmCustomFields");
    if(!select) return;
    if(select.value === "custom"){
      customWrap?.classList.remove("hidden");
      if(title) title.value=""; if(emoji) emoji.value="✨🖤✨"; if(line) line.value="";
      title?.focus(); return;
    }
    customWrap?.classList.add("hidden");
    const p=PRESETS[Number(select.value)];
    if(!p) return;
    if(title) title.value=p.title; if(emoji) emoji.value=p.emoji; if(line) line.value=p.line;
  }

  function buildUI(){
    if($("#relationshipMilestoneBtn")) return;
    const toolbar=$('.chat-toolbar');
    if(toolbar){
      const b=document.createElement('button'); b.id='relationshipMilestoneBtn'; b.type='button'; b.className='ghost small rm-toolbar-btn'; b.textContent='🖤 Milestones'; toolbar.prepend(b);
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div id="relationshipMilestonePanel" class="rm-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="rmPanelTitle">
        <section class="rm-panel-card">
          <header class="rm-panel-head"><div><div class="rm-eyebrow">RELATIONSHIP ARC</div><h2 id="rmPanelTitle">Milestones</h2><div id="relationshipMilestoneStatus" class="rm-current"></div></div><button id="rmClosePanel" class="ghost small" type="button">Close</button></header>
          <div class="rm-form">
            <label>Milestone<select id="rmPreset"></select></label>
            <div id="rmCustomFields" class="hidden rm-custom-fields">
              <label>Title<input id="rmTitle" maxlength="60" placeholder="Blood-Oathed, Crowned, Soulbound…"></label>
              <label>Emoji / symbols<input id="rmEmoji" maxlength="24" placeholder="🩸🌹"></label>
              <label>Ceremonial line<textarea id="rmLine" rows="2" maxlength="220" placeholder="What should the popup say?"></textarea></label>
            </div>
            <label>Private note <span class="rm-optional">optional</span><textarea id="rmNote" rows="2" maxlength="300" placeholder="Why this moment matters…"></textarea></label>
            <button id="rmSave" class="send" type="button">✨ Record Milestone</button>
          </div>
          <div class="rm-history-title">History</div><div id="rmHistory" class="rm-history"></div>
        </section>
      </div>
      <div id="relationshipMilestoneCeremony" class="rm-ceremony-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="rmCeremonyTitle">
        <div class="rm-stars" aria-hidden="true"><i>✦</i><i>✧</i><i>⋆</i><i>✦</i><i>✧</i><i>⋆</i></div>
        <section class="rm-ceremony-card">
          <div class="rm-ceremony-kicker">✨ 🖤 RELATIONSHIP MILESTONE 🖤 ✨</div>
          <div id="rmCeremonyEmoji" class="rm-ceremony-emoji">🌙🐺🖤</div>
          <h2 id="rmCeremonyTitle" class="rm-ceremony-title">MATED</h2>
          <div id="rmCeremonyNames" class="rm-ceremony-names"></div>
          <p id="rmCeremonyLine" class="rm-ceremony-line"></p>
          <div id="rmCeremonyDate" class="rm-ceremony-date"></div>
          <div class="rm-ceremony-actions"><button id="rmViewHistory" class="ghost" type="button">View History</button><button id="rmContinue" class="send" type="button">Continue 🖤</button></div>
        </section>
      </div>`);

    $("#relationshipMilestoneBtn")?.addEventListener('click',openPanel);
    $("#rmClosePanel")?.addEventListener('click',closePanel);
    $("#rmPreset")?.addEventListener('change',syncPresetFields);
    $("#rmContinue")?.addEventListener('click',closeCeremony);
    $("#rmViewHistory")?.addEventListener('click',()=>{closeCeremony();openPanel();});
    $("#rmSave")?.addEventListener('click',()=>{
      const select=$("#rmPreset"); if(!select?.value) return;
      const custom=select.value==='custom';
      const p=custom?null:PRESETS[Number(select.value)];
      const item=addMilestone({
        title: custom ? $("#rmTitle")?.value : p?.title,
        emoji: custom ? $("#rmEmoji")?.value : p?.emoji,
        line: custom ? $("#rmLine")?.value : p?.line,
        note: $("#rmNote")?.value || "",
        custom
      });
      if(item){ $("#rmNote").value=""; closePanel(); }
    });
    $("#rmHistory")?.addEventListener('click',e=>{
      const b=e.target.closest('.rm-replay'); if(!b)return;
      const item=relationshipMilestones().find(m=>String(m.id)===String(b.dataset.rmId)); if(item) showCeremony(item);
    });
    $("#relationshipMilestonePanel")?.addEventListener('click',e=>{if(e.target.id==='relationshipMilestonePanel')closePanel();});
    $("#relationshipMilestoneCeremony")?.addEventListener('click',e=>{if(e.target.id==='relationshipMilestoneCeremony')closeCeremony();});
    renderPanel();
  }

  function hookRenders(){
    if(typeof renderAll === 'function' && !renderAll.__rmWrapped){
      const old=renderAll;
      const wrapped=function(...args){ const out=old.apply(this,args); setTimeout(()=>{buildUI();renderPanel();},0); return out; };
      wrapped.__rmWrapped=true; try{ window.renderAll=wrapped; }catch{}
    }
  }

  window.NoctisRelationshipMilestones = {version:MODULE_VERSION,presets:PRESETS,add:addMilestone,history:relationshipMilestones,open:openPanel,show:showCeremony};
  buildUI(); hookRenders();
  window.addEventListener('pageshow',()=>{buildUI();renderPanel();});
})();
