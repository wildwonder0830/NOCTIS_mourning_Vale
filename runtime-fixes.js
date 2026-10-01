/* Noctis Mourning Vale v0.13.2 — Deep RP/Phone Recovery */
(() => {
  const BUILD="0.13.2";
  const key=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");

  /* ---------- PERSONA IMPORT: RESPECT TARGET SLOT ---------- */
  function personaSource(parsed){
    if(parsed?.format==="noctis-persona" && parsed?.persona)return parsed.persona;
    if(parsed?.persona && typeof parsed.persona==="object")return parsed.persona;
    if(parsed?.name && (parsed?.appearance!==undefined || parsed?.personality!==undefined || parsed?.canon!==undefined))return parsed;
    return null;
  }

  function requestedSlot(parsed,src){
    const raw=parsed?.targetSlot ?? parsed?.slot ?? src?.targetSlot ?? src?.slot;
    const n=Number(raw);
    return Number.isInteger(n)&&n>=1&&n<=4?n:null;
  }

  function importPersonaIntoSlot(src,slotNumber=null){
    ensurePersonas(vault);
    let p=slotNumber
      ? (vault.personas.find(x=>Number(x.slot)===slotNumber)||vault.personas[slotNumber-1])
      : activePersona();

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
    if(!old||old.dataset.slotAware==="1")return;
    const fresh=old.cloneNode(true);
    fresh.dataset.slotAware="1";
    old.parentNode.replaceChild(fresh,old);

    fresh.addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const parsed=JSON.parse(await file.text());
        const src=personaSource(parsed);
        if(!src)throw new Error("That file is not a Noctis persona import.");
        const p=importPersonaIntoSlot(src,requestedSlot(parsed,src));
        alert(`Imported ${p.name||"persona"} into Persona Slot ${p.slot}.`);
      }catch(err){
        alert(`Could not import persona: ${err?.message||String(err)}`);
      }finally{e.target.value=""}
    });
  }

  /* ---------- PHONE HELPERS ---------- */
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
        names.some(n=>wanted.startsWith(n+" ")||n.startsWith(wanted+" "));
    })||null;
  }

  function makePhoneContact(name,relationship=""){
    ensurePhoneData();
    const c=activeCharacter();
    const clean=String(name||"").trim();
    if(!clean)return null;

    const existing=findPhoneContact(clean);
    if(existing){
      if(relationship&&!String(existing.relationship||"").trim())existing.relationship=relationship;
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

  function addRecoveredText(contact,direction,text,sourceIndex=null){
    ensurePhoneData();
    const ch=activeChat(),clean=String(text||"").trim();
    if(!contact||!clean)return false;

    const role=String(direction||"").toUpperCase()==="OUT"?"user":"assistant";
    const thread=ch.phoneThreads[contact.id]||(ch.phoneThreads[contact.id]=[]);

    if(thread.some(m=>m.role===role&&key(m.text)===key(clean)))return false;

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

  function cleanNameCandidate(name){
    let n=String(name||"").trim()
      .replace(/^[“"'*_\s]+|[“”"'*_,.!?:;\s]+$/g,"")
      .replace(/\s+/g," ");
    if(!n||n.length>60)return "";
    const bad=/^(he|she|they|his|her|their|someone|somebody|the man|the woman|phone|message|text|amanda|you|user|protagonist)$/i;
    if(bad.test(n))return "";
    return n;
  }

  /*
    LOCAL first pass:
    Pull obvious named senders/recipients from phrases such as:
    "Derek texted her", "Derek sent Amanda a message",
    "Amanda texted Derek", "she sent Derek a text".
    This creates the contact BEFORE model extraction so old messages are not
    skipped just because the contact didn't already exist.
  */
  function localContactCandidates(messages){
    const out=new Map();
    const remember=(name,relationship="Story contact")=>{
      const n=cleanNameCandidate(name);
      if(!n)return;
      const k=key(n);
      if(!out.has(k))out.set(k,{name:n,relationship});
    };

    const name="([A-Z][A-Za-z'’-]{1,30}(?:\\s+[A-Z][A-Za-z'’-]{1,30})?)";
    const patterns=[
      new RegExp("\\b"+name+"\\s+(?:texted|messaged|DM(?:'d|ed)?|sent\\s+(?:her|him|them|Amanda|the protagonist)\\s+(?:a\\s+)?(?:text|message))\\b","g"),
      new RegExp("\\b(?:Amanda|she|the protagonist)\\s+(?:texted|messaged|DM(?:'d|ed)?|sent)\\s+"+name+"\\b","g"),
      new RegExp("\\b(?:text|message)\\s+from\\s+"+name+"\\b","g"),
      new RegExp("\\b"+name+"['’]s\\s+(?:text|message)\\b","g")
    ];

    messages.forEach(m=>{
      const t=String(m?.text||"");
      patterns.forEach(re=>{
        re.lastIndex=0;
        let hit;
        while((hit=re.exec(t)))remember(hit[1]);
      });

      /* Premiere/date language is strong enough to create a contact if named. */
      const dateRe=new RegExp("\\b"+name+"\\b[^\\n.!?]{0,90}\\b(?:her date|his date|premiere date|took her to the premiere|asked her out|dinner date)\\b","gi");
      let dm;
      while((dm=dateRe.exec(t)))remember(dm[1],"Date / story contact");
    });

    return [...out.values()];
  }

  function parseContactPacket(raw){
    const rows=[];
    String(raw||"").split(/\r?\n/).forEach(line=>{
      const t=line.trim();
      if(!/^CONTACT\|/i.test(t))return;
      const parts=t.split("|").slice(1);
      const name=cleanNameCandidate(parts.shift());
      const relationship=parts.join("|").trim();
      if(name)rows.push({name,relationship});
    });
    return rows;
  }

  function parseTextPacket(raw){
    const rows=[];
    String(raw||"").split(/\r?\n/).forEach(line=>{
      const t=line.trim();
      if(!/^TEXT\|/i.test(t))return;
      const parts=t.split("|").slice(1);
      const index=Number(parts.shift());
      const direction=String(parts.shift()||"").trim().toUpperCase();
      const name=cleanNameCandidate(parts.shift());
      const text=parts.join("|").trim();
      if((direction==="IN"||direction==="OUT")&&name&&text){
        rows.push({index:Number.isFinite(index)?index:999999,direction,name,text});
      }
    });
    rows.sort((a,b)=>a.index-b.index);
    return rows;
  }

  function chunks(arr,size=36,overlap=4){
    const out=[];
    if(!arr.length)return out;
    let i=0;
    while(i<arr.length){
      out.push({start:i,items:arr.slice(i,i+size)});
      if(i+size>=arr.length)break;
      i+=Math.max(1,size-overlap);
    }
    return out;
  }

  function transcriptChunk(part){
    return part.items.map((m,j)=>
      `[${part.start+j+1}] ${m.role==="user"?"PROTAGONIST":"CHARACTER/WORLD"}: ${m.text}`
    ).join("\n\n");
  }

  async function modelFindContacts(allMessages,status){
    const origin=activeChat();
    const found=[];
    const parts=chunks(allMessages,40,4);

    for(let i=0;i<parts.length;i++){
      if(status)status.textContent=`Finding story contacts… ${i+1}/${parts.length}`;

      const prompt=`STORY CONTACT RECOVERY

Read this fictional RP excerpt and identify ONLY explicitly named people who clearly belong in the protagonist's phone.

Qualifying examples:
- a named date
- a named friend/family member/coworker
- a named person who actually sent or received a text/message
- a named recurring social contact

Important:
- If Derek is explicitly the protagonist's premiere date, asked her to dinner, or sent her a text, Derek qualifies.
- Do not invent surnames.
- Do not add unnamed roles ("the actor", "the waiter", "security").
- Do not add places, organizations, objects, or supernatural concepts.
- Do not add the protagonist herself.

Return ONLY:
CONTACT|Exact Name|short relationship/role

If none qualify:
NONE

EXCERPT:
${transcriptChunk(parts[i])}`;

      const raw=await openRouterRequest([
        {role:"system",content:"Strict fictional contact extractor. Return CONTACT lines or NONE only."},
        {role:"user",content:prompt}
      ],650,0.05);

      if(activeChat()!==origin)throw new Error("Timeline changed during phone sync. Please rerun in the original timeline.");
      found.push(...parseContactPacket(raw));
    }
    return found;
  }

  async function modelFindTexts(allMessages,status){
    const origin=activeChat();
    const rows=[];
    const c=activeCharacter();
    const parts=chunks(allMessages,32,4);

    for(let i=0;i<parts.length;i++){
      if(status)status.textContent=`Recovering text history… ${i+1}/${parts.length}`;

      const roster=(c.phoneContacts||[])
        .map(p=>`${p.name||p.displayName}${p.relationship?` — ${p.relationship}`:""}`)
        .join("\n") || "(none)";

      const prompt=`PHONE MESSAGE HISTORY RECOVERY

Known story contacts:
${roster}

Read BOTH protagonist posts and character/world posts.

Extract every phone/text/SMS/DM message that was ACTUALLY SENT in this excerpt, in BOTH directions.

Direction:
IN = named contact sent a message to the protagonist.
OUT = protagonist sent a message to the named contact.

Rules:
- Spoken dialogue is NOT a text.
- Thoughts are NOT texts.
- Unsent drafts are NOT texts.
- Simply checking/holding a phone is NOT a text.
- Preserve actual wording as closely as possible.
- If exact wording is absent but the RP explicitly states a sent message's content in a clear paraphrase, use that clear content; do not invent details.
- If a named sender/recipient is clearly present but missing from Known story contacts, you may still use their exact name.
- Keep separate texts as separate lines.
- Use the excerpt's bracketed transcript number.

Return ONLY:
TEXT|transcript number|IN|Exact Name|message content
TEXT|transcript number|OUT|Exact Name|message content

If none:
NONE

EXCERPT:
${transcriptChunk(parts[i])}`;

      const raw=await openRouterRequest([
        {role:"system",content:"Strict fictional phone-history extractor. Return TEXT lines or NONE only. Never invent a sender, recipient, or message."},
        {role:"user",content:prompt}
      ],900,0.05);

      if(activeChat()!==origin)throw new Error("Timeline changed during phone sync. Please rerun in the original timeline.");
      rows.push(...parseTextPacket(raw));
    }
    return rows;
  }

  async function recoverRpPhoneHistory(){
    ensurePhoneData();
    const c=activeCharacter(),ch=activeChat();
    const status=document.getElementById("rpPhoneSyncStatus");

    const all=(ch.messages||[])
      .filter(m=>(m.role==="assistant"||m.role==="user")&&String(m.text||"").trim());

    if(!all.length){
      if(status)status.textContent="No RP messages are available to scan.";
      return;
    }

    const btn=document.getElementById("rpPhoneSyncBtn");
    if(btn){btn.disabled=true;btn.textContent="Deep scanning…"}
    if(status)status.textContent=`Scanning the full ${all.length}-post timeline…`;

    try{
      let contactsAdded=0,textsAdded=0;

      /* PASS 1: deterministic local contact discovery */
      localContactCandidates(all).forEach(row=>{
        const existed=!!findPhoneContact(row.name);
        const p=makePhoneContact(row.name,row.relationship);
        if(p&&!existed)contactsAdded++;
      });
      saveVault();

      /* PASS 2: AI contact discovery across the ENTIRE chat, chunked */
      const discovered=await modelFindContacts(all,status);
      discovered.forEach(row=>{
        const existed=!!findPhoneContact(row.name);
        const p=makePhoneContact(row.name,row.relationship);
        if(p&&!existed)contactsAdded++;
      });
      saveVault();

      /* PASS 3: now that Derek/etc. exist in the roster, recover texts */
      const texts=await modelFindTexts(all,status);
      texts.forEach(row=>{
        let p=findPhoneContact(row.name);
        if(!p){
          p=makePhoneContact(row.name,"Story contact");
          if(p)contactsAdded++;
        }
        if(p&&addRecoveredText(p,row.direction,row.text,row.index))textsAdded++;
      });

      /* De-dupe contact names accidentally found in overlapping chunks. */
      const seen=new Map(),duplicates=[];
      (c.phoneContacts||[]).forEach(p=>{
        const k=key(p.name||p.displayName);
        if(!k)return;
        if(!seen.has(k)){seen.set(k,p);return}
        const keep=seen.get(k),drop=p;
        for(const chat of c.chats||[]){
          chat.phoneThreads=chat.phoneThreads||{};chat.phoneUnread=chat.phoneUnread||{};
          const keepThread=chat.phoneThreads[keep.id]||(chat.phoneThreads[keep.id]=[]);
          for(const m of chat.phoneThreads[drop.id]||[]){
            if(!keepThread.some(x=>x.id===m.id))keepThread.push(m);
          }
          chat.phoneUnread[keep.id]=Number(chat.phoneUnread[keep.id]||0)+Number(chat.phoneUnread[drop.id]||0);
          delete chat.phoneThreads[drop.id];delete chat.phoneUnread[drop.id];
          for(const group of chat.phoneGroups||[])group.memberIds=[...new Set((group.memberIds||[]).map(id=>id===drop.id?keep.id:id))];
        }
        if(c.activePhoneContactId===drop.id)c.activePhoneContactId=keep.id;
        duplicates.push(drop.id);
      });
      if(duplicates.length){
        const ids=new Set(duplicates);
        c.phoneContacts=c.phoneContacts.filter(p=>!ids.has(p.id));
        duplicates.forEach(id=>{
          if(ch.phoneThreads)delete ch.phoneThreads[id];
          if(ch.phoneUnread)delete ch.phoneUnread[id];
        });
      }

      saveVault();
      renderAll();

      const bits=[];
      if(contactsAdded)bits.push(`${contactsAdded} new contact${contactsAdded===1?"":"s"}`);
      if(textsAdded)bits.push(`${textsAdded} text message${textsAdded===1?"":"s"}`);

      if(status){
        status.textContent=bits.length
          ?`Deep sync imported ${bits.join(" and ")} from the full timeline.`
          :"Deep sync finished. Everything found was already imported, or no explicit sent texts were present.";
      }
    }catch(err){
      if(status)status.textContent=`Phone sync failed: ${err?.message||String(err)}`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Deep Sync Contacts + RP Texts"}
    }
  }

  /* ---------- FUTURE OUTGOING TEXT BRIDGE ---------- */
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
    if(!form||form.dataset.phoneOutBridge==="1")return;
    form.dataset.phoneOutBridge="1";

    form.addEventListener("submit",()=>{
      if(mainGenerationBusy)return;
      const input=document.getElementById("messageInput");
      const event=obviousOutgoingTextEvent(input?.value||"");
      if(!event)return;
      event.texts.forEach(t=>addRecoveredText(event.contact,"OUT",t,null));
      saveVault();
    },true);
  }

  /* ---------- UI ---------- */
  function injectPhoneRecoveryControls(){
    const phoneView=document.querySelector('[data-view="phone"]');

    if(phoneView&&!document.getElementById("rpPhoneSyncPanel")){
      const shell=phoneView.querySelector(".phone-shell")||phoneView.querySelector(".panel")||phoneView;
      const panel=document.createElement("div");
      panel.id="rpPhoneSyncPanel";
      panel.className="ambient-text-controls rp-phone-sync-panel";
      panel.innerHTML=`
        <div>
          <strong>RP → Phone Deep Sync</strong>
          <div class="hint mini-hint">Scans the full active timeline, creates missing named story contacts, then imports incoming and outgoing texts.</div>
        </div>
        <button id="rpPhoneSyncBtn" class="ghost small" type="button">Deep Sync Contacts + RP Texts</button>
        <div id="rpPhoneSyncStatus" class="test-result"></div>`;
      shell.insertBefore(panel,shell.firstChild);
    }

    const oldBtn=document.getElementById("rpPhoneSyncBtn");
    if(oldBtn&&oldBtn.dataset.deepSync!=="1"){
      const fresh=oldBtn.cloneNode(true);
      fresh.dataset.deepSync="1";
      fresh.textContent="Deep Sync Contacts + RP Texts";
      oldBtn.parentNode.replaceChild(fresh,oldBtn);
      fresh.addEventListener("click",recoverRpPhoneHistory);
    }

    const settingsPanel=document.querySelector('[data-view="settings"] .panel');
    if(settingsPanel&&!document.getElementById("rpPhoneSyncSettingsPanel")){
      const box=document.createElement("div");
      box.id="rpPhoneSyncSettingsPanel";
      box.className="memory-compact-card";
      box.innerHTML=`
        <h2 class="subhead">RP → Phone Deep Sync</h2>
        <p class="hint">Scan the full active RP for missing contacts and phone history.</p>
        <button id="rpPhoneSyncSettingsBtn" class="ghost small" type="button">Deep Sync Contacts + RP Texts</button>`;
      settingsPanel.appendChild(box);
    }

    const settingsBtn=document.getElementById("rpPhoneSyncSettingsBtn");
    if(settingsBtn&&settingsBtn.dataset.deepSync!=="1"){
      settingsBtn.dataset.deepSync="1";
      settingsBtn.textContent="Deep Sync Contacts + RP Texts";
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
