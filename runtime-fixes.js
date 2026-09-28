/* Noctis Mourning Vale v0.12.4 — Persona Slot + Phone Recovery UI Fixes */
(() => {
  const BUILD="0.13.0";
  const key=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");

  /* ---------- PERSONA IMPORT: RESPECT TARGET SLOT ---------- */
  function personaSource(parsed){
    if(parsed?.format==="noctis-persona" && parsed?.persona)return parsed.persona;
    if(parsed?.persona && typeof parsed.persona==="object")return parsed.persona;
    if(parsed?.name && (parsed?.appearance!==undefined || parsed?.personality!==undefined || parsed?.canon!==undefined))return parsed;
    return null;
  }

  function requestedSlot(parsed,src){
    const raw = parsed?.targetSlot ?? parsed?.slot ?? src?.targetSlot ?? src?.slot;
    const n=Number(raw);
    return Number.isInteger(n) && n>=1 && n<=4 ? n : null;
  }

  function importPersonaIntoSlot(src,slotNumber=null){
    ensurePersonas(vault);
    let p=null;

    if(slotNumber){
      p=vault.personas.find(x=>Number(x.slot)===slotNumber) || vault.personas[slotNumber-1];
    }else{
      p=activePersona();
    }

    if(!p)throw new Error("Could not find the requested persona slot.");

    const keys=["name","age","pronouns","species","occupation","relationshipStyle","appearance","personality","powers","canon","preferences","height","weight","build","eyeColor","hairColor","hairStyle","skinTone","distinguishingFeatures","apparentAge","actualAge","currentForm"];
    keys.forEach(k=>p[k]=typeof src[k]==="string"?src[k]:"");
    p.updatedAt=now();

    /* The imported slot becomes active for the current timeline so the user
       immediately sees the persona they just imported. */
    activeChat().activePersonaId=p.id;

    saveVault();
    renderPersonas();
    renderPersonaFields();
    renderPersonaBadge();
    return p;
  }

  function patchPersonaImport(){
    const old=document.getElementById("personaImportInput");
    if(!old || old.dataset.slotAware==="1")return;

    const fresh=old.cloneNode(true);
    fresh.dataset.slotAware="1";
    old.parentNode.replaceChild(fresh,old);

    fresh.addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const parsed=JSON.parse(await file.text());
        const src=personaSource(parsed);
        if(!src)throw new Error("That file is not a Noctis persona import.");

        const slot=requestedSlot(parsed,src);
        const p=importPersonaIntoSlot(src,slot);
        alert(`Imported ${p.name||"persona"} into Persona Slot ${p.slot}.`);
      }catch(err){
        alert(`Could not import persona: ${err?.message||String(err)}`);
      }finally{
        e.target.value="";
      }
    });
  }

  /* ---------- PHONE: VISIBLE RP TEXT RECOVERY ---------- */
  function ensurePhoneData(){
    const c=activeCharacter(),ch=activeChat();
    if(!Array.isArray(c.phoneContacts))c.phoneContacts=[];
    if(!ch.phoneThreads||typeof ch.phoneThreads!=="object"||Array.isArray(ch.phoneThreads))ch.phoneThreads={};
    if(!ch.phoneUnread||typeof ch.phoneUnread!=="object"||Array.isArray(ch.phoneUnread))ch.phoneUnread={};
    c.phoneContacts.forEach(p=>{
      if(!Array.isArray(ch.phoneThreads[p.id]))ch.phoneThreads[p.id]=[];
      if(!Number.isFinite(Number(ch.phoneUnread[p.id])))ch.phoneUnread[p.id]=0;
    });
  }

  function findPhoneContact(name){
    const wanted=key(name);
    return (activeCharacter().phoneContacts||[]).find(p=>{
      const names=[p.name,p.displayName].map(key).filter(Boolean);
      return names.includes(wanted) || names.some(n=>wanted.includes(n)||n.includes(wanted));
    }) || null;
  }

  function addRecoveredText(contact,text){
    const ch=activeChat(),clean=String(text||"").trim();
    if(!contact||!clean)return false;
    const thread=ch.phoneThreads[contact.id]||(ch.phoneThreads[contact.id]=[]);
    if(thread.some(m=>m.role==="assistant" && key(m.text)===key(clean)))return false;
    thread.push({id:uid(),role:"assistant",text:clean,createdAt:now(),fromMainRp:true,recovered:true});
    ch.phoneUnread[contact.id]=Number(ch.phoneUnread[contact.id]||0)+1;
    ch.updatedAt=now();
    return true;
  }

  function parseRecovery(raw){
    const rows=[];
    String(raw||"").split(/\r?\n/).forEach(line=>{
      const t=line.trim();
      if(!/^PHONE\|/i.test(t))return;
      const parts=t.split("|").slice(1);
      const name=String(parts.shift()||"").trim();
      const text=parts.join("|").trim();
      if(name&&text)rows.push({name,text});
    });
    return rows;
  }

  async function recoverRpTexts(){
    ensurePhoneData();
    const c=activeCharacter(),ch=activeChat();
    const contacts=c.phoneContacts||[];
    const status=document.getElementById("rpPhoneSyncStatus");

    if(!contacts.length){
      if(status)status.textContent="Add Henry to Phone Contacts first.";
      else alert("Add Henry to Phone Contacts first.");
      return;
    }

    const recent=(ch.messages||[]).filter(m=>m.role==="assistant"&&m.text).slice(-60);
    if(!recent.length){
      if(status)status.textContent="No recent character RP posts to scan.";
      return;
    }

    const roster=contacts.map(p=>`${p.name}${p.displayName&&p.displayName!==p.name?` / ${p.displayName}`:""}${p.relationship?` — ${p.relationship}`:""}`).join("\n");
    const transcript=recent.map((m,i)=>`[${i+1}] ${m.text}`).join("\n\n");

    const btn=document.getElementById("rpPhoneSyncBtn");
    if(btn){btn.disabled=true;btn.textContent="Scanning…"}
    if(status)status.textContent=`Scanning ${recent.length} recent character posts…`;

    const prompt=`MAIN-RP PHONE RECOVERY

Known phone contacts:
${roster}

From the RP transcript below, extract ONLY text/SMS messages that one of those known contacts ACTUALLY SENT to the protagonist.

Important:
- Spoken dialogue is NOT a text.
- Thoughts are NOT texts.
- Drafts that were not sent are NOT texts.
- A character holding or checking a phone is NOT enough.
- If a character sent three separate texts, return THREE separate lines.
- Preserve the actual message wording as closely as possible.

Return ONLY:
PHONE|Exact Contact Name|message text

If none exist, return:
NONE

TRANSCRIPT:
${transcript}`;

    try{
      const raw=await openRouterRequest([
        {role:"system",content:"Extract only actually-sent phone messages. Return PHONE|name|message lines or NONE. No JSON, markdown, or explanation."},
        {role:"user",content:prompt}
      ],800,0.05);

      const rows=parseRecovery(raw);
      let added=0;
      rows.forEach(r=>{
        const p=findPhoneContact(r.name);
        if(p && addRecoveredText(p,r.text))added++;
      });

      saveVault();
      try{if(typeof renderPhone==="function")renderPhone()}catch{}
      try{if(typeof updatePhoneUnreadUI==="function")updatePhoneUnreadUI()}catch{}
      try{if(typeof renderMemoryInspector==="function")renderMemoryInspector()}catch{}

      if(status)status.textContent=added
        ?`Added ${added} RP text${added===1?"":"s"} to Phone.`
        :"No new sent texts were found. If Henry sent them much earlier, temporarily continue the RP near those messages and scan again.";
    }catch(err){
      if(status)status.textContent=`Phone sync failed: ${err?.message||String(err)}`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Sync RP Texts"}
    }
  }

  function injectPhoneRecoveryControls(){
    const phoneView=document.querySelector('[data-view="phone"]');
    if(phoneView && !document.getElementById("rpPhoneSyncPanel")){
      const shell=phoneView.querySelector(".phone-shell") || phoneView.querySelector(".panel") || phoneView;
      const panel=document.createElement("div");
      panel.id="rpPhoneSyncPanel";
      panel.className="ambient-text-controls rp-phone-sync-panel";
      panel.innerHTML=`
        <div>
          <strong>RP → Phone Sync</strong>
          <div class="hint mini-hint">Pull texts that were actually sent inside the main RP into the matching contact thread.</div>
        </div>
        <button id="rpPhoneSyncBtn" class="ghost small" type="button">Sync RP Texts</button>
        <div id="rpPhoneSyncStatus" class="test-result"></div>`;
      shell.insertBefore(panel,shell.firstChild);
      document.getElementById("rpPhoneSyncBtn")?.addEventListener("click",recoverRpTexts);
    }

    /* Also expose it in Settings so it cannot disappear inside the Contacts drawer. */
    const settingsPanel=document.querySelector('[data-view="settings"] .panel');
    if(settingsPanel && !document.getElementById("rpPhoneSyncSettingsPanel")){
      const box=document.createElement("div");
      box.id="rpPhoneSyncSettingsPanel";
      box.className="memory-compact-card";
      box.innerHTML=`
        <h2 class="subhead">RP → Phone Sync</h2>
        <p class="hint">If a character sends texts inside the main RP and they do not appear in Phone, use this recovery scan.</p>
        <button id="rpPhoneSyncSettingsBtn" class="ghost small" type="button">Sync Recent RP Texts</button>`;
      settingsPanel.appendChild(box);
      document.getElementById("rpPhoneSyncSettingsBtn")?.addEventListener("click",()=>{
        selectTab("phone");
        setTimeout(()=>document.getElementById("rpPhoneSyncBtn")?.click(),80);
      });
    }
  }

  patchPersonaImport();
  injectPhoneRecoveryControls();

  /* Re-apply after Noctis dynamically rebuilds tabs/views. */
  const obs=new MutationObserver(()=>{
    patchPersonaImport();
    injectPhoneRecoveryControls();
  });
  obs.observe(document.body,{childList:true,subtree:true});

  const badge=document.getElementById("buildBadge");
  if(badge)badge.textContent="v"+BUILD;
  if(window.NOCTIS_CURRENT_BUILD!==undefined)window.NOCTIS_CURRENT_BUILD=BUILD;
})();