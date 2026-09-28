/* Noctis Mourning Vale v0.12.2 — Main RP → Phone Sync */
(() => {
  const BUILD="0.12.2";
  const key=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");

  function ensureBridgeData(){
    const c=activeCharacter(),ch=activeChat();
    if(!ch.phoneThreads||typeof ch.phoneThreads!=="object"||Array.isArray(ch.phoneThreads))ch.phoneThreads={};
    if(!ch.phoneUnread||typeof ch.phoneUnread!=="object"||Array.isArray(ch.phoneUnread))ch.phoneUnread={};
    if(!ch.rpPhoneImportedIds||typeof ch.rpPhoneImportedIds!=="object"||Array.isArray(ch.rpPhoneImportedIds))ch.rpPhoneImportedIds={};
    (c.phoneContacts||[]).forEach(p=>{
      if(!Array.isArray(ch.phoneThreads[p.id]))ch.phoneThreads[p.id]=[];
      if(!Number.isFinite(Number(ch.phoneUnread[p.id])))ch.phoneUnread[p.id]=0;
    });
  }

  function findContact(name){
    const c=activeCharacter(),wanted=key(name);
    if(!wanted)return null;
    return (c.phoneContacts||[]).find(p=>{
      const names=[p.name,p.displayName].map(key).filter(Boolean);
      return names.includes(wanted) || names.some(n=>n.startsWith(wanted+" ")||wanted.startsWith(n+" "));
    }) || null;
  }

  function addIncomingText(contact,text,sourceMessageId=null){
    ensureBridgeData();
    const ch=activeChat(),clean=String(text||"").trim();
    if(!contact||!clean)return false;
    const thread=ch.phoneThreads[contact.id]||(ch.phoneThreads[contact.id]=[]);
    if(thread.some(m=>m.role==="assistant" && key(m.text)===key(clean)))return false;

    thread.push({id:uid(),role:"assistant",text:clean,createdAt:now(),fromMainRp:true,sourceMessageId:sourceMessageId||null});
    ch.phoneUnread[contact.id]=Number(ch.phoneUnread[contact.id]||0)+1;
    ch.updatedAt=now();
    return true;
  }

  function extractMarkedPhoneEvents(msg){
    const text=String(msg?.text||"");
    if(!text.includes("[[PHONE:"))return 0;
    let added=0;
    const cleaned=text.replace(/\[\[PHONE:([^\]]+)\]\]([\s\S]*?)\[\[\/PHONE\]\]/gi,(whole,name,body)=>{
      const p=findContact(name);
      if(p && addIncomingText(p,body,msg.id))added++;
      return "";
    }).replace(/\n{3,}/g,"\n\n").trim();

    if(added){
      msg.text=cleaned;
      msg.phoneEventsSynced=true;
      activeChat().rpPhoneImportedIds[msg.id]=true;
    }
    return added;
  }

  function processMarkedEvents(){
    ensureBridgeData();
    const ch=activeChat();
    let changed=false;
    (ch.messages||[]).forEach(msg=>{
      if(msg?.role!=="assistant" || ch.rpPhoneImportedIds[msg.id])return;
      if(extractMarkedPhoneEvents(msg)>0)changed=true;
    });
    if(changed)saveVault();
  }

  if(typeof compileSystemPrompt==="function" && !window.__noctisRpPhoneMarkerPrompt){
    const baseCompile=compileSystemPrompt;
    compileSystemPrompt=function(){
      return baseCompile()+`

MAIN-RP PHONE EVENT PROTOCOL — INTERNAL
When a character actually SENDS a text message during the MAIN RP, also record the exact sent text as:
[[PHONE:Exact Contact Name]]actual text message[[/PHONE]]

Rules:
- Use this ONLY for a text/phone message that is actually sent in the story.
- Use the established contact/character name.
- Put only the actual text message inside the marker.
- If the character sends three separate texts, emit THREE separate PHONE blocks.
- Never use this for spoken dialogue, thoughts, unsent drafts, social posts, or narration.
- Continue the surrounding RP normally.
- This metadata is removed from visible RP and copied into the Phone thread automatically.`;
    };
    window.__noctisRpPhoneMarkerPrompt=true;
  }

  if(typeof renderMessages==="function" && !window.__noctisRpPhoneRenderPatched){
    const baseRender=renderMessages;
    renderMessages=function(){
      processMarkedEvents();
      baseRender();
      try{if(typeof updatePhoneUnreadUI==="function")updatePhoneUnreadUI()}catch{}
    };
    window.__noctisRpPhoneRenderPatched=true;
  }

  function parseRecoveryPacket(raw){
    const rows=[];
    String(raw||"").split(/\r?\n/).forEach(line=>{
      const t=line.trim();
      if(!/^PHONE\|/i.test(t))return;
      const parts=t.split("|").slice(1);
      const name=String(parts.shift()||"").trim(),text=parts.join("|").trim();
      if(name&&text)rows.push({name,text});
    });
    return rows;
  }

  async function recoverRecentRpTexts(){
    ensureBridgeData();
    const c=activeCharacter(),ch=activeChat(),contacts=(c.phoneContacts||[]);
    if(!contacts.length){alert("Add the character to Phone Contacts first, then run Recover RP Texts.");return}

    const assistant=(ch.messages||[]).filter(m=>m.role==="assistant"&&m.text).slice(-40);
    if(!assistant.length){alert("There are no recent character RP messages to scan.");return}

    const roster=contacts.map(p=>`${p.name}${p.displayName&&p.displayName!==p.name?` / ${p.displayName}`:""}${p.relationship?` — ${p.relationship}`:""}`).join("\n");
    const transcript=assistant.map((m,i)=>`[${i+1}] ${m.text}`).join("\n\n");

    const btn=document.getElementById("recoverRpTextsBtn"),status=document.getElementById("recoverRpTextsStatus");
    if(btn){btn.disabled=true;btn.textContent="Scanning…"}
    if(status)status.textContent=`Scanning the last ${assistant.length} character posts for texts that were actually sent…`;

    const prompt=`RECOVER PHONE MESSAGES FROM MAIN RP

Known phone contacts:
${roster}

Extract ONLY phone/text messages that a known contact ACTUALLY SENT to the protagonist.
Do not extract spoken dialogue, thoughts, drafts, imagined texts, social posts, or messages merely discussed.
If one character sends multiple separate texts, return each separately.

Return ONLY:
PHONE|Exact Contact Name|exact message content

If there are none, return:
NONE

RECENT ASSISTANT RP:
${transcript}`;

    try{
      const raw=await openRouterRequest([
        {role:"system",content:"You are a strict continuity extractor. Return only PHONE|name|message lines or NONE. No prose, JSON, or markdown."},
        {role:"user",content:prompt}
      ],700,0.05);

      const rows=parseRecoveryPacket(raw);
      let added=0;
      rows.forEach(row=>{
        const p=findContact(row.name);
        if(p && addIncomingText(p,row.text,null))added++;
      });
      saveVault();
      try{if(typeof renderPhone==="function")renderPhone()}catch{}
      try{if(typeof updatePhoneUnreadUI==="function")updatePhoneUnreadUI()}catch{}
      try{if(typeof renderMemoryInspector==="function")renderMemoryInspector()}catch{}

      if(status)status.textContent=added
        ?`Recovered ${added} text message${added===1?"":"s"} into Phone.`
        :"No new recoverable phone messages were found. Make sure Henry exists as a Phone Contact, then try again.";
    }catch(err){
      if(status)status.textContent=`Could not recover RP texts: ${err?.message||String(err)}`;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Recover RP Texts"}
    }
  }

  function injectRecoveryUI(){
    const directory=document.getElementById("phoneDirectory");
    if(!directory || document.getElementById("recoverRpTextsBtn"))return;
    const box=document.createElement("div");
    box.className="ambient-text-controls";
    box.innerHTML=`
      <div><strong>RP → Phone continuity</strong>
      <div class="hint mini-hint">Future texts sent inside main RP are copied into Phone automatically. Use this once to recover recent texts that happened before this bridge existed.</div></div>
      <button id="recoverRpTextsBtn" class="ghost small" type="button">Recover RP Texts</button>
      <div id="recoverRpTextsStatus" class="test-result"></div>`;
    directory.appendChild(box);
    document.getElementById("recoverRpTextsBtn")?.addEventListener("click",recoverRecentRpTexts);
  }

  injectRecoveryUI();
  processMarkedEvents();
  const observer=new MutationObserver(()=>injectRecoveryUI());
  observer.observe(document.body,{childList:true,subtree:true});

  const badge=document.getElementById("buildBadge");
  if(badge)badge.textContent="v"+BUILD;
})();