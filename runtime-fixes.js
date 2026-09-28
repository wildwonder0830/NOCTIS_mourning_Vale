/* Noctis Mourning Vale v0.13.1 — Persona Slot + Smart RP/Phone Recovery */
(() => {
  const BUILD="0.13.1";
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

  /* ---------- PHONE DATA ---------- */
  function ensurePhoneData(){
    const c=activeCharacter(),ch=activeChat();
    if(!Array.isArray(c.phoneContacts))c.phoneContacts=[];
    if(!ch.phoneThreads||typeof ch.phoneThreads!=="object"||Array.isArray(ch.phoneThreads))ch.phoneThreads={};
    if(!ch.phoneUnread||typeof ch.phoneUnread!=="object"||Array.isArray(ch.phoneUnread))ch.phoneUnread={};
    c.phoneContacts.forEach(p=>{
      if(!p.id)p.id=uid();
      if(!Array.isArray(ch.phoneThreads[p.id]))ch.phoneThreads[p.id]=[];
      if(!Number.isFinite(Number(ch.phoneUnread[p.id])))ch.phoneUnread[p.id]=0;
    });
  }

  function findPhoneContact(name){
    const wanted=key(name);
    if(!wanted)return null;
    return (activeCharacter().phoneContacts||[]).find(p=>{
      const names=[p.name,p.displayName].map(key).filter(Boolean);
      return names.includes(wanted) ||
        names.some(n=>wanted===n || wanted.startsWith(n+" ") || n.startsWith(wanted+" "));
    }) || null;
  }

  function makePhoneContact(name,relationship=""){
    ensurePhoneData();
    const c=activeCharacter(),ch=activeChat();
    const clean=String(name||"").trim();
    if(!clean)return null;

    const existing=findPhoneContact(clean);
    if(existing){
      if(relationship && !String(existing.relationship||"").trim())existing.relationship=relationship;
      return existing;
    }

    const p={
      id:uid(),
      name:clean,
      displayName:clean,
      avatar:"",
      status:"available",
      relationship:String(relationship||"").trim(),
      followsSocial:true,
      textingStyle:`Text naturally in ${clean}'s established voice. Keep phone messages concise, specific, and human. Do not write prose narration or control the user's protagonist.`,
      createdAt:now(),
      updatedAt:now()
    };

    c.phoneContacts.push(p);
    (c.chats||[]).forEach(chat=>{
      if(!chat.phoneThreads||typeof chat.phoneThreads!=="object"||Array.isArray(chat.phoneThreads))chat.phoneThreads={};
      if(!Array.isArray(chat.phoneThreads[p.id]))chat.phoneThreads[p.id]=[];
      if(!chat.phoneUnread||typeof chat.phoneUnread!=="object"||Array.isArray(chat.phoneUnread))chat.phoneUnread={};
      if(!Number.isFinite(Number(chat.phoneUnread[p.id])))chat.phoneUnread[p.id]=0;
    });
    if(!c.activePhoneContactId)c.activePhoneContactId=p.id;
    return p;
  }

  function samePhoneMessage(a,role,text){
    return a && a.role===role && key(a.text)===key(text);
  }

  function addRecoveredText(contact,direction,text,sourceIndex=null){
    ensurePhoneData();
    const ch=activeChat(),clean=String(text||"").trim();
    if(!contact||!clean)return false;

    const role=String(direction||"").toUpperCase()==="OUT" ? "user" : "assistant";
    const thread=ch.phoneThreads[contact.id]||(ch.phoneThreads[contact.id]=[]);

    if(thread.some(m=>samePhoneMessage(m,role,clean)))return false;

    thread.push({
      id:uid(),
      role,
      text:clean,
      createdAt:now(),
      fromMainRp:true,
      recovered:true,
      sourceIndex:Number.isFinite(Number(sourceIndex))?Number(sourceIndex):null
    });

    if(role==="assistant"){
      ch.phoneUnread[contact.id]=Number(ch.phoneUnread[contact.id]||0)+1;
    }
    ch.updatedAt=now();
    return true;
  }

  function parseRecovery(raw){
    const contacts=[];
    const texts=[];

    String(raw||"").split(/\r?\n/).forEach(line=>{
      const t=line.trim();
      if(!t || /^NONE$/i.test(t))return;

      if(/^CONTACT\|/i.test(t)){
        const parts=t.split("|").slice(1);
        const name=String(parts.shift()||"").trim();
        const relationship=parts.join("|").trim();
        if(name)contacts.push({name,relationship});
        return;
      }

      if(/^TEXT\|/i.test(t)){
        const parts=t.split("|").slice(1);
        const index=Number(parts.shift());
        const direction=String(parts.shift()||"").trim().toUpperCase();
        const name=String(parts.shift()||"").trim();
        const text=parts.join("|").trim();
        if((direction==="IN"||direction==="OUT") && name && text){
          texts.push({index:Number.isFinite(index)?index:999999,direction,name,text});
        }
      }
    });

    texts.sort((a,b)=>a.index-b.index);
    return {contacts,texts};
  }

  /* ---------- SMART RECOVERY: CONTACTS + INCOMING + OUTGOING ---------- */
  async function recoverRpPhoneHistory(){
    ensurePhoneData();
    const c=activeCharacter(),ch=activeChat();
    const status=document.getElementById("rpPhoneSyncStatus");

    const recent=(ch.messages||[])
      .filter(m=>(m.role==="assistant"||m.role==="user") && String(m.text||"").trim())
      .slice(-100);

    if(!recent.length){
      if(status)status.textContent="No RP messages are available to scan.";
      return;
    }

    const existing=(c.phoneContacts||[])
      .map(p=>`${p.name||p.displayName}${p.relationship?` — ${p.relationship}`:""}`)
      .join("\n") || "(none yet)";

    const transcript=recent.map((m,i)=>
      `[${i+1}] ${m.role==="user"?"PROTAGONIST":"CHARACTER/WORLD"}: ${m.text}`
    ).join("\n\n");

    const btn=document.getElementById("rpPhoneSyncBtn");
    if(btn){btn.disabled=true;btn.textContent="Scanning…"}
    if(status)status.textContent=`Scanning ${recent.length} RP posts for contacts and sent texts…`;

    const prompt=`MAIN-RP PHONE HISTORY RECOVERY

Existing phone contacts:
${existing}

Read BOTH protagonist posts and character/world posts.

Your job has TWO parts:

1. CONTACTS
Identify explicitly named people who clearly belong in the protagonist's phone because the RP establishes a real personal connection or phone exchange.
Examples: a date, friend, coworker, family member, romantic interest, or named person who actually texted/messaged the protagonist.
Do NOT invent people.
Do NOT add unnamed roles such as "waiter", "driver", "publicist", "actor", or "security."
Do NOT add places, organizations, objects, or titles as people.
If Derek is explicitly established in this transcript as the protagonist's premiere date or as someone who texted her, he should be a contact.

2. TEXT HISTORY
Extract EVERY text/SMS/phone-message exchange that actually occurred in the RP, in BOTH directions:
- IN = contact sent a text to the protagonist.
- OUT = protagonist sent a text to that contact.

Spoken dialogue is NOT a text.
Thoughts are NOT texts.
An unsent draft is NOT a text.
Simply holding/checking a phone is NOT a text.
Do not invent missing message content.
If the RP gives the exact or clearly paraphrased content of an actually sent message, preserve it as closely as possible.
If one person sends three separate texts, return three TEXT lines.
Use the transcript number where the event appears so chronology can be preserved.

Return ONLY lines in these exact formats:

CONTACT|Exact Name|short relationship/role
TEXT|transcript number|IN|Exact Name|message content
TEXT|transcript number|OUT|Exact Name|message content

If no contacts or texts qualify, return:
NONE

RP TRANSCRIPT:
${transcript}`;

    try{
      const raw=await openRouterRequest([
        {role:"system",content:"You are a strict fictional continuity extractor. Return only CONTACT|... and TEXT|... lines or NONE. Never invent names or message content."},
        {role:"user",content:prompt}
      ],1400,0.05);

      const packet=parseRecovery(raw);
      let contactsAdded=0,textsAdded=0;

      packet.contacts.forEach(row=>{
        const existed=!!findPhoneContact(row.name);
        const p=makePhoneContact(row.name,row.relationship);
        if(p && !existed)contactsAdded++;
      });

      packet.texts.forEach(row=>{
        let p=findPhoneContact(row.name);
        if(!p){
          p=makePhoneContact(row.name,"Story contact");
          if(p)contactsAdded++;
        }
        if(p && addRecoveredText(p,row.direction,row.text,row.index))textsAdded++;
      });

      /* Stable chronological ordering for recovered events. Existing native
         phone messages without a source index stay in their existing order. */
      (c.phoneContacts||[]).forEach(p=>{
        const thread=ch.phoneThreads?.[p.id];
        if(!Array.isArray(thread)||thread.length<2)return;
        const indexed=thread.filter(m=>Number.isFinite(Number(m.sourceIndex)));
        if(!indexed.length)return;
        const unindexed=thread.filter(m=>!Number.isFinite(Number(m.sourceIndex)));
        indexed.sort((a,b)=>Number(a.sourceIndex)-Number(b.sourceIndex));
        ch.phoneThreads[p.id]=[...unindexed,...indexed];
      });

      saveVault();
      renderAll();

      const bits=[];
      if(contactsAdded)bits.push(`${contactsAdded} new contact${contactsAdded===1?"":"s"}`);
      if(textsAdded)bits.push(`${textsAdded} text message${textsAdded===1?"":"s"}`);

      if(status){
        status.textContent=bits.length
          ?`Imported ${bits.join(" and ")} from the RP. Incoming AND outgoing texts are now supported.`
          :"The scan completed, but everything it found was already in Phone or no explicit sent texts were present.";
      }
    }catch(err){
      if(status)status.textContent=`Phone sync failed: ${err?.message||String(err)}`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Sync Contacts + RP Texts"}
    }
  }

  /* ---------- LOCAL FUTURE OUTGOING-TEXT BRIDGE ---------- */
  function quoteParts(text){
    const out=[];
    const re=/["“]([^"”]{1,1000})["”]/g;
    let m;
    while((m=re.exec(String(text||""))))out.push(m[1].trim());
    return out.filter(Boolean);
  }

  function obviousOutgoingTextEvent(raw){
    const text=String(raw||"");
    if(!/\b(text(?:ed|s|ing)?|messag(?:e|ed|es|ing)|dm(?:ed|s|ing)?|sent\s+(?:him|her|them|[A-Z][\w'-]+)\s+(?:a\s+)?(?:text|message))\b/i.test(text))return null;

    const contacts=(activeCharacter().phoneContacts||[]);
    const mentioned=contacts.filter(p=>{
      const n=String(p.name||p.displayName||"").trim();
      return n && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(text);
    });
    if(mentioned.length!==1)return null;

    const quotes=quoteParts(text);
    if(!quotes.length)return null;

    return {contact:mentioned[0],texts:quotes};
  }

  function patchFutureOutgoingTexts(){
    const form=document.getElementById("chatForm");
    if(!form || form.dataset.phoneOutBridge==="1")return;
    form.dataset.phoneOutBridge="1";

    form.addEventListener("submit",()=>{
      const input=document.getElementById("messageInput");
      const raw=input?.value||"";
      const event=obviousOutgoingTextEvent(raw);
      if(!event)return;

      event.texts.forEach(t=>addRecoveredText(event.contact,"OUT",t,null));
      saveVault();
    },true);
  }

  /* ---------- UI ---------- */
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
          <div class="hint mini-hint">Find story contacts and copy texts actually sent in the main RP into the correct phone thread — incoming and outgoing.</div>
        </div>
        <button id="rpPhoneSyncBtn" class="ghost small" type="button">Sync Contacts + RP Texts</button>
        <div id="rpPhoneSyncStatus" class="test-result"></div>`;
      shell.insertBefore(panel,shell.firstChild);
    }

    /* Replace the old listener/button if an earlier runtime patch created it. */
    const oldBtn=document.getElementById("rpPhoneSyncBtn");
    if(oldBtn && oldBtn.dataset.smartSync!=="1"){
      const fresh=oldBtn.cloneNode(true);
      fresh.dataset.smartSync="1";
      fresh.textContent="Sync Contacts + RP Texts";
      oldBtn.parentNode.replaceChild(fresh,oldBtn);
      fresh.addEventListener("click",recoverRpPhoneHistory);
    }

    const settingsPanel=document.querySelector('[data-view="settings"] .panel');
    if(settingsPanel && !document.getElementById("rpPhoneSyncSettingsPanel")){
      const box=document.createElement("div");
      box.id="rpPhoneSyncSettingsPanel";
      box.className="memory-compact-card";
      box.innerHTML=`
        <h2 class="subhead">RP → Phone Sync</h2>
        <p class="hint">Recover named story contacts plus incoming and outgoing text messages from the main RP.</p>
        <button id="rpPhoneSyncSettingsBtn" class="ghost small" type="button">Sync Contacts + RP Texts</button>`;
      settingsPanel.appendChild(box);
    }

    const settingsBtn=document.getElementById("rpPhoneSyncSettingsBtn");
    if(settingsBtn && settingsBtn.dataset.smartSync!=="1"){
      settingsBtn.dataset.smartSync="1";
      settingsBtn.textContent="Sync Contacts + RP Texts";
      settingsBtn.addEventListener("click",()=>{
        selectTab("phone");
        setTimeout(()=>document.getElementById("rpPhoneSyncBtn")?.click(),80);
      });
    }
  }

  patchPersonaImport();
  injectPhoneRecoveryControls();
  patchFutureOutgoingTexts();

  const obs=new MutationObserver(()=>{
    patchPersonaImport();
    injectPhoneRecoveryControls();
    patchFutureOutgoingTexts();
  });
  obs.observe(document.body,{childList:true,subtree:true});

  const badge=document.getElementById("buildBadge");
  if(badge)badge.textContent="v"+BUILD;
  if(window.NOCTIS_CURRENT_BUILD!==undefined)window.NOCTIS_CURRENT_BUILD=BUILD;
})();
