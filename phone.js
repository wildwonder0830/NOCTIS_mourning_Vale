/* Noctis Mourning Vale v0.8.0 — Living Worlds / Phone */
(() => {
  const LIVING_BUILD = "0.12.0";
  const USAGE_KEY = "noctis-usage-v0.8";
  const RATE_TABLE = {
    "nvidia/nemotron-3-ultra-550b-a55b": { input: 0.50, output: 2.20 }
  };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  const fmtTime = iso => {
    try { return new Date(iso || Date.now()).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}); }
    catch { return ""; }
  };

  function injectUI(){
    const tabs=document.querySelector('.tabs');
    if(tabs && !tabs.querySelector('[data-tab="phone"]')){
      const memoryTab=tabs.querySelector('[data-tab="memory"]');
      const b=document.createElement('button');b.dataset.tab='phone';b.className='tab phone-tab-button';b.innerHTML='Phone <span id="phoneTabUnreadDot" class="phone-tab-unread-dot hidden"></span>';
      tabs.insertBefore(b,memoryTab);
      b.addEventListener('click',()=>selectTab('phone'));
    }

    const main=document.querySelector('main.app');
    if(main && !document.querySelector('[data-view="phone"]')){
      const memoryView=document.querySelector('[data-view="memory"]');
      const section=document.createElement('section');section.className='view';section.dataset.view='phone';
      section.innerHTML=`
        <div class="phone-shell">
          <div class="phone-frame">
            <div class="phone-top">
              <div id="phoneContactRail" class="phone-contact-rail"></div>
              <div class="phone-header">
                <div id="phoneHeaderAvatar" class="phone-header-avatar"></div>
                <div id="phoneHeaderName" class="phone-header-name">Contact</div>
                <div id="phoneHeaderStatus" class="phone-header-status">available</div>
                <button id="phoneDirectoryBtn" class="ghost small phone-directory-btn" type="button">Contacts</button>
                <button id="phoneGroupsBtn" class="ghost small phone-directory-btn" type="button">Groups</button>
              </div>
            </div>
            <div id="phoneDirectory" class="phone-directory hidden">
              <div class="section-title-row">
                <div><strong>Story Contacts</strong><div class="hint mini-hint">Anyone who matters in this timeline can have their own phone thread.</div></div>
                <button id="closePhoneDirectoryBtn" class="ghost small" type="button">Close</button>
              </div>
              <div class="phone-directory-actions">
                <button id="addStoryContactBtn" class="small" type="button">+ Contact</button>
                <button id="syncStoryContactsBtn" class="ghost small" type="button">Sync From Story</button>
                <button id="createBestieTrioBtn" class="ghost small" type="button">Create Bestie Trio</button>
                <button id="newGroupChatBtn" class="ghost small" type="button">+ Group Chat</button>
              </div>
              <div id="phoneGroupList" class="phone-group-list"></div>
              <div class="ambient-text-controls">
                <label class="toggle-row"><input id="ambientTextsEnabled" type="checkbox" /><span>Ambient incoming texts <small>(uses the selected model)</small></span></label>
                <label>Frequency
                  <select id="ambientTextFrequency">
                    <option value="rare">Rare · about every 1–3 hours</option>
                    <option value="normal">Normal · about every 30–90 min</option>
                    <option value="frequent">Frequent · about every 15–45 min</option>
                  </select>
                </label>
              </div>
              <div id="phoneDirectoryList"></div>
              <div id="phoneDirectoryStatus" class="test-result"></div>
            </div>
            <div class="phone-away-wrap">
              <label>Away / scene note
                <input id="phoneAwayNote" placeholder="At work, across town, on set, hunting, etc." />
              </label>
            </div>
            <div id="phoneMessages" class="phone-messages"></div>
            <div id="phoneTyping" class="phone-typing"></div>
            <div class="phone-thread-actions"><button id="clearPhoneThreadBtn" class="ghost danger small" type="button">Clear Thread</button></div>
            <form id="phoneForm" class="phone-composer">
              <textarea id="phoneInput" rows="2" placeholder="Message…"></textarea>
              <button id="phoneSendBtn" class="send" type="submit">Send</button>
            </form>
          </div>
        </div>`;
      main.insertBefore(section,memoryView);
    }

    const charView=document.querySelector('[data-view="character"] .panel');
    if(charView && !$('phoneContactEditor')){
      const box=document.createElement('div');box.className='living-world-block';
      box.innerHTML=`
        <div class="section-title-row living-title">
          <div><h2 class="subhead">Phone Contacts</h2><p class="hint">Each world can have one or many contacts. Pictures are compressed locally before saving.</p></div>
          <button id="addPhoneContactBtn" class="small" type="button">+ Contact</button>
        </div>
        <div id="phoneContactEditor"></div>`;
      charView.appendChild(box);
    }

    const memoryPanel=document.querySelector('[data-view="memory"] .panel');
    if(memoryPanel && !$('memoryInspector')){
      const box=document.createElement('div');box.className='memory-compact-card';
      box.innerHTML=`<div class="section-title-row"><div><h2 class="subhead">Memory Inspector</h2><p class="hint">See what Noctis is carrying into this timeline without dumping the whole archive into every request.</p></div></div><div id="memoryInspector"></div>`;
      memoryPanel.prepend(box);
    }

    const settingsPanel=document.querySelector('[data-view="settings"] .panel');
    if(settingsPanel && !$('usagePanel')){
      const box=document.createElement('div');box.className='usage-card';
      box.innerHTML=`
        <h2 class="subhead">Usage & Cost Guard</h2>
        <div id="usagePanel"></div>
        <div class="field-grid">
          <label>Monthly app budget (USD)<input id="monthlyBudgetUsd" type="number" min="0" step="1" placeholder="Optional" /></label>
          <label>Paid Nemotron engine
            <select id="paidNemotronShortcut">
              <option value="">Do not change model</option>
              <option value="nvidia/nemotron-3-ultra-550b-a55b">Nemotron 3 Ultra — paid</option>
              <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 3 Ultra — free</option>
            </select>
          </label>
        </div>
        <div class="button-row"><button id="resetUsageBtn" class="ghost small" type="button">Reset Local Counter</button></div>`;
      const backupHeading=[...settingsPanel.querySelectorAll('h2')].find(h=>h.textContent.includes('Backup Safety'));
      settingsPanel.insertBefore(box,backupHeading||null);
    }

    if(!$('livingWorldStyles')){
      const link=document.createElement('link');link.id='livingWorldStyles';link.rel='stylesheet';link.href='phone.css?v=0.8.0';document.head.appendChild(link);
    }
  }

  function defaultContact(c, i=0){
    return {
      id: uid(),
      name: i ? `Contact ${i+1}` : (c.name || "Character"),
      displayName: i ? `Contact ${i+1}` : (c.name || "Character"),
      avatar: "",
      status: "available",
      relationship: "",
      textingStyle: "Text naturally in the character's established voice. Keep phone messages concise, specific, and human. Do not write prose narration or control the user's protagonist.",
      createdAt: now(), updatedAt: now()
    };
  }

  function ensureLivingWorldData(){
    ensurePersonas(vault);
    (vault.characters || []).forEach(c => {
      if(!Array.isArray(c.phoneContacts)) c.phoneContacts = [];
      if(!c.phoneContacts.length) c.phoneContacts.push(defaultContact(c));
      c.phoneContacts.forEach((p,i) => {
        p.id = p.id || uid();
        p.name = typeof p.name === "string" ? p.name : (i ? `Contact ${i+1}` : (c.name || "Character"));
        p.displayName = typeof p.displayName === "string" && p.displayName ? p.displayName : p.name;
        p.avatar = typeof p.avatar === "string" ? p.avatar : "";
        p.status = typeof p.status === "string" ? p.status : "available";
        p.relationship = typeof p.relationship === "string" ? p.relationship : "";
        p.followsSocial = p.followsSocial !== false;
        p.textingStyle = typeof p.textingStyle === "string" ? p.textingStyle : "";
        p.updatedAt = p.updatedAt || now();
      });
      if(!c.activePhoneContactId || !c.phoneContacts.some(p => p.id === c.activePhoneContactId)) c.activePhoneContactId = c.phoneContacts[0]?.id || null;
      (c.chats || []).forEach(ch => {
        if(!ch.phoneThreads || typeof ch.phoneThreads !== "object" || Array.isArray(ch.phoneThreads)) ch.phoneThreads = {};
        c.phoneContacts.forEach(p => { if(!Array.isArray(ch.phoneThreads[p.id])) ch.phoneThreads[p.id] = []; });
        if(typeof ch.phoneAwayNote !== "string") ch.phoneAwayNote = "";
        if(!Array.isArray(ch.phoneGroups)) ch.phoneGroups=[];
        if(!ch.groupThreads || typeof ch.groupThreads!=="object" || Array.isArray(ch.groupThreads)) ch.groupThreads={};
        ch.phoneGroups.forEach(g=>{
          g.id=g.id||uid();
          g.name=typeof g.name==="string"&&g.name?g.name:"Group Chat";
          if(!Array.isArray(g.memberIds))g.memberIds=[];
          if(!Array.isArray(ch.groupThreads[g.id]))ch.groupThreads[g.id]=[];
        });
        if(!ch.phoneUnread || typeof ch.phoneUnread!=="object" || Array.isArray(ch.phoneUnread)) ch.phoneUnread={};
        c.phoneContacts.forEach(p=>{if(!Number.isFinite(Number(ch.phoneUnread[p.id])))ch.phoneUnread[p.id]=0});
        if(!Number.isFinite(Number(ch.nextAmbientTextAt))) ch.nextAmbientTextAt=0;
        if(!Number.isFinite(Number(ch.ambientTextsToday))) ch.ambientTextsToday=0;
        if(typeof ch.ambientTextsDate!=="string") ch.ambientTextsDate="";
      });
    });
    vault.version = "0.8";
  }

  function contact(){
    const c = activeCharacter(); ensureLivingWorldData();
    return c.phoneContacts.find(x => x.id === c.activePhoneContactId) || c.phoneContacts[0];
  }
  function phoneThread(ch=activeChat(), p=contact()){
    ensureLivingWorldData(); if(!p) return [];
    if(!Array.isArray(ch.phoneThreads[p.id])) ch.phoneThreads[p.id] = [];
    return ch.phoneThreads[p.id];
  }
  function avatarMarkup(p, cls="phone-avatar"){
    if(p?.avatar) return `<img class="${cls}" src="${esc(p.avatar)}" alt="">`;
    const letter=(p?.displayName||p?.name||"?").trim().slice(0,1).toUpperCase()||"?";
    return `<div class="${cls} avatar-fallback">${esc(letter)}</div>`;
  }

  async function compressImage(file){
    if(!file)return "";
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data});
    const max=420,scale=Math.min(1,max/Math.max(img.width,img.height));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/jpeg",0.82);
  }


  function contactNameKey(name){return String(name||"").trim().toLowerCase().replace(/\s+/g," ")}

  function addContactRecord(name="",relationship="",species=""){
    const c=activeCharacter();ensureLivingWorldData();
    const clean=String(name||"").trim();if(!clean)return null;
    const key=contactNameKey(clean);
    const existing=c.phoneContacts.find(p=>contactNameKey(p.name)===key||contactNameKey(p.displayName)===key);
    if(existing){if(!existing.relationship&&relationship)existing.relationship=relationship;return existing}
    const p=defaultContact(c,c.phoneContacts.length);
    p.name=clean;p.displayName=clean;p.relationship=relationship||"";
    if(species)p.textingStyle=`Text naturally in ${clean}'s established voice. Known species/nature: ${species}. Keep phone messages concise, specific, and human. Do not write prose narration or control the user's protagonist.`;
    c.phoneContacts.push(p);
    (c.chats||[]).forEach(ch=>{ch.phoneThreads=ch.phoneThreads||{};if(!Array.isArray(ch.phoneThreads[p.id]))ch.phoneThreads[p.id]=[]});
    saveVault();return p;
  }


  function groupThread(ch=activeChat(),g=null){
    if(!g)return [];
    ch.groupThreads=ch.groupThreads||{};
    if(!Array.isArray(ch.groupThreads[g.id]))ch.groupThreads[g.id]=[];
    return ch.groupThreads[g.id];
  }

  function renderPhoneGroups(){
    const host=$("phoneGroupList");if(!host)return;
    const c=activeCharacter(),ch=activeChat();host.innerHTML="";
    if(!ch.phoneGroups.length){
      host.innerHTML='<div class="hint mini-hint">No group chats yet.</div>';
      return;
    }
    ch.phoneGroups.forEach(g=>{
      const names=(g.memberIds||[]).map(id=>c.phoneContacts.find(p=>p.id===id)?.displayName||c.phoneContacts.find(p=>p.id===id)?.name).filter(Boolean);
      const row=document.createElement("div");row.className="phone-group-row";
      row.innerHTML=`<button type="button" class="phone-group-open"><strong>${esc(g.name)}</strong><span>${esc(names.join(", "))}</span></button><button type="button" class="ghost small phone-group-edit">Edit</button>`;
      row.querySelector(".phone-group-open").addEventListener("click",()=>openGroupChat(g.id));
      row.querySelector(".phone-group-edit").addEventListener("click",()=>editGroupChat(g.id));
      host.appendChild(row);
    });
  }

  function createGroupChat(){
    const c=activeCharacter(),ch=activeChat();
    const name=prompt("Group chat name:","The Coven");
    if(name===null||!name.trim())return;
    const available=c.phoneContacts||[];
    if(!available.length){alert("Add contacts first.");return}
    const choices=available.map((p,i)=>`${i+1}. ${p.displayName||p.name}${p.relationship?` — ${p.relationship}`:""}`).join("\n");
    const raw=prompt(`Enter the numbers of the contacts to add, separated by commas:\n\n${choices}`,"1,2,3");
    if(raw===null)return;
    const ids=[...new Set(raw.split(",").map(x=>Number(x.trim())-1).filter(i=>i>=0&&i<available.length).map(i=>available[i].id))];
    if(ids.length<2){alert("A group chat needs at least two contacts.");return}
    const g={id:uid(),name:name.trim(),memberIds:ids,createdAt:now(),updatedAt:now()};
    ch.phoneGroups.push(g);ch.groupThreads[g.id]=[];saveVault();renderPhoneGroups();
  }

  function editGroupChat(groupId){
    const c=activeCharacter(),ch=activeChat(),g=ch.phoneGroups.find(x=>x.id===groupId);if(!g)return;
    const name=prompt("Group chat name:",g.name);if(name!==null&&name.trim())g.name=name.trim();
    const available=c.phoneContacts||[];
    const choices=available.map((p,i)=>`${i+1}. ${p.displayName||p.name}`).join("\n");
    const current=available.map((p,i)=>g.memberIds.includes(p.id)?i+1:null).filter(Boolean).join(",");
    const raw=prompt(`Members (comma-separated numbers):\n\n${choices}`,current);
    if(raw!==null){
      const ids=[...new Set(raw.split(",").map(x=>Number(x.trim())-1).filter(i=>i>=0&&i<available.length).map(i=>available[i].id))];
      if(ids.length>=2)g.memberIds=ids;
    }
    g.updatedAt=now();saveVault();renderPhoneGroups();
  }

  function createBestieTrio(){
    const c=activeCharacter(),ch=activeChat();
    const presets=[
      {name:"Mara",relationship:"Best friend · blunt ride-or-die",style:"Texts fast, direct, protective, perceptive, and calls out nonsense immediately. Uses dry humor and occasional swearing. She knows the protagonist deeply and does not automatically side with anyone."},
      {name:"Vivian",relationship:"Best friend · chaotic instigator",style:"Playful, funny, meme-heavy, dramatic in a fun way, loves gossip, thirst commentary, and ridiculous encouragement. Still loyal when things get serious."},
      {name:"Elena",relationship:"Best friend · calm observer",style:"Warm, grounded, emotionally perceptive, asks the uncomfortable useful question. Less chaotic, more thoughtful, but not boring."}
    ];
    const ids=[];
    presets.forEach(p=>{
      let existing=c.phoneContacts.find(x=>contactNameKey(x.name)===contactNameKey(p.name));
      if(!existing){
        existing=addContactRecord(p.name,p.relationship);
        existing.textingStyle=p.style;
        existing.followsSocial=true;
      }else{
        if(!existing.relationship)existing.relationship=p.relationship;
        if(!existing.textingStyle)existing.textingStyle=p.style;
        existing.followsSocial=true;
      }
      ids.push(existing.id);
    });
    let g=ch.phoneGroups.find(x=>x.name==="The Coven");
    if(!g){
      g={id:uid(),name:"The Coven",memberIds:ids,createdAt:now(),updatedAt:now()};
      ch.phoneGroups.push(g);ch.groupThreads[g.id]=[];
    }else g.memberIds=ids;
    saveVault();renderPhoneContacts();renderPhoneDirectory();renderPhoneGroups();renderPhone();
    const status=$("phoneDirectoryStatus");if(status)status.textContent="Bestie trio created: Mara, Vivian, Elena + group chat “The Coven”. Everything is editable.";
  }

  function openGroupChat(groupId){
    const c=activeCharacter(),ch=activeChat(),g=ch.phoneGroups.find(x=>x.id===groupId);if(!g)return;
    const names=(g.memberIds||[]).map(id=>c.phoneContacts.find(p=>p.id===id)?.displayName||c.phoneContacts.find(p=>p.id===id)?.name).filter(Boolean);
    const thread=groupThread(ch,g);
    const host=$("phoneMessages"),name=$("phoneHeaderName"),status=$("phoneHeaderStatus"),avatar=$("phoneHeaderAvatar");
    if(name)name.textContent=g.name;if(status)status.textContent=names.join(" · ");if(avatar)avatar.innerHTML='<div class="phone-header-avatar-img avatar-fallback">G</div>';
    if(host){
      host.innerHTML="";
      if(!thread.length)host.innerHTML=`<div class="phone-empty">No messages in ${esc(g.name)} yet.</div>`;
      thread.forEach(msg=>{
        const row=document.createElement("div");row.className=`phone-message-row ${msg.role==="user"?"mine":"theirs"}`;
        const bubble=document.createElement("div");bubble.className="phone-bubble";
        bubble.textContent=(msg.role==="assistant"&&msg.author?`${msg.author}: `:"")+msg.text;
        row.appendChild(bubble);host.appendChild(row);
      });
      host.scrollTop=host.scrollHeight;
    }
    const form=$("phoneForm");if(form){
      form.dataset.groupId=g.id;
      const input=$("phoneInput");if(input)input.placeholder=`Message ${g.name}…`;
    }
    $("phoneDirectory")?.classList.add("hidden");
  }

  async function sendGroupMessage(groupId,text){
    const c=activeCharacter(),ch=activeChat(),g=ch.phoneGroups.find(x=>x.id===groupId);if(!g)return;
    const clean=String(text||"").trim();if(!clean)return;
    const thread=groupThread(ch,g);
    thread.push({id:uid(),role:"user",text:clean,createdAt:now()});saveVault();openGroupChat(g.id);
    const members=(g.memberIds||[]).map(id=>c.phoneContacts.find(p=>p.id===id)).filter(Boolean);
    const roster=members.map(p=>`${p.name} | ${p.relationship||"friend"} | ${p.textingStyle||"established voice"}`).join("\n");
    const recent=thread.slice(-12).map(m=>`${m.role==="user"?"PROTAGONIST":(m.author||"FRIEND")}: ${m.text}`).join("\n");
    const mainRecent=getConversationMessages(ch).slice(-6).map(m=>`${m.role==="user"?"PROTAGONIST":"CHARACTER"}: ${m.text}`).join("\n");
    try{
      const raw=await openRouterRequest([{role:"system",content:compileSystemPrompt()+`\n\nGROUP CHAT MODE
Group: ${g.name}
Members:
${roster}

Write 1-3 natural replies from the listed members. Not everyone must answer.
Return ONLY lines in this format:
Exact Name|message text

No narration. No labels beyond the exact name before |. Keep voices distinct. Do not control the protagonist.

RECENT GROUP CHAT:
${recent||"(none)"}

RECENT MAIN STORY:
${mainRecent||"(none)"}`}],420,0.85);
      String(raw||"").split(/\r?\n/).forEach(line=>{
        const parts=line.split("|");if(parts.length<2)return;
        const author=parts.shift().trim(),msg=parts.join("|").trim();
        if(members.some(p=>p.name===author)&&msg)thread.push({id:uid(),role:"assistant",author,text:msg,createdAt:now()});
      });
      ch.updatedAt=now();saveVault();if(activeChat()===ch && $("phoneForm")?.dataset.groupId===g.id)openGroupChat(g.id);
    }catch(err){alert(`Group reply failed: ${err?.message||String(err)}`)}
  }

  function renderPhoneDirectory(){
    const host=$("phoneDirectoryList");if(!host)return;renderPhoneGroups();
    ensureLivingWorldData();const c=activeCharacter();host.innerHTML="";
    c.phoneContacts.forEach(p=>{
      const row=document.createElement("div");row.className="phone-directory-row";
      row.innerHTML=`${avatarMarkup(p,"phone-directory-avatar")}<button type="button" class="phone-directory-open"><strong>${esc(p.displayName||p.name||"Contact")}</strong><span>${esc(p.relationship||p.status||"contact")}</span></button><button type="button" class="ghost small phone-directory-edit">Edit</button>`;
      row.querySelector(".phone-directory-open").addEventListener("click",()=>{c.activePhoneContactId=p.id;saveVault();renderPhone();$("phoneDirectory")?.classList.add("hidden")});
      row.querySelector(".phone-directory-edit").addEventListener("click",()=>{c.activePhoneContactId=p.id;saveVault();renderPhone();selectTab("character");setTimeout(()=>$("phoneContactEditor")?.scrollIntoView({behavior:"smooth",block:"start"}),60)});
      host.appendChild(row);
    });
  }

  function addStoryContact(){
    const name=prompt("Contact name:","");if(name===null||!name.trim())return;
    const relationship=prompt("Relationship / role (optional):","")??"";
    const p=addContactRecord(name,relationship);
    if(p){activeCharacter().activePhoneContactId=p.id;saveVault();renderPhoneContacts();renderPhoneDirectory();renderPhone()}
  }

  function storyContactCandidates(){
    const c=activeCharacter(),ch=activeChat(),out=[];
    const add=(name,relationship="",species="")=>{
      const n=String(name||"").trim();if(!n)return;
      if(contactNameKey(n)===contactNameKey(activePersona()?.name))return;
      if(!out.some(x=>contactNameKey(x.name)===contactNameKey(n)))out.push({name:n,relationship,species});
    };
    (ch.sceneCast||[]).forEach(p=>add(p.name,p.notes||"",p.species||""));
    if(c?.name)add(c.name,c.role||"","");
    (c.lore||[]).forEach(entry=>{
      const title=String(entry.title||"").trim(),body=String(entry.body||"");
      if(!title)return;

      /* Only auto-create contacts from lore when the TITLE itself looks like
         a person, relationship, or named NPC. Do not promote places/objects
         merely because their lore body mentions a brother, ex, friend, etc. */
      const relationshipTitle=/\b(brother|sister|mother|father|mom|dad|ex|friend|best friend|coworker|boss|partner|mate|husband|wife|boyfriend|girlfriend|doctor|officer|detective|roommate|cousin|uncle|aunt)\b/i.test(title);
      const looksLikePlaceOrObject=/\b(house|home|apartment|estate|mansion|castle|room|bedroom|kitchen|bathroom|office|school|college|bar|club|hospital|station|woods|forest|packhouse|compound|car|truck|phone|ring|necklace|weapon|book|grimoire|journal|building|street|town|city)\b/i.test(title);

      if(relationshipTitle && !looksLikePlaceOrObject){
        add(title,body.slice(0,120),"");
      }
    });
    return out;
  }


  function cleanInvalidAutoContacts(){
    const c=activeCharacter();
    const badTitle=/\b(house|home|apartment|estate|mansion|castle|room|bedroom|kitchen|bathroom|office|school|college|bar|club|hospital|station|woods|forest|packhouse|compound|car|truck|phone|ring|necklace|weapon|book|grimoire|journal|building|street|town|city)\b/i;
    const bad=c.phoneContacts.filter(p=>{
      if(!badTitle.test(String(p.name||p.displayName||"")))return false;
      const used=(c.chats||[]).some(ch=>Array.isArray(ch.phoneThreads?.[p.id]) && ch.phoneThreads[p.id].length>0);
      return !used;
    });
    if(!bad.length)return 0;
    const ids=new Set(bad.map(p=>p.id));
    c.phoneContacts=c.phoneContacts.filter(p=>!ids.has(p.id));
    (c.chats||[]).forEach(ch=>{if(ch.phoneThreads)ids.forEach(id=>delete ch.phoneThreads[id])});
    if(ids.has(c.activePhoneContactId))c.activePhoneContactId=c.phoneContacts[0]?.id||null;
    saveVault();
    return bad.length;
  }

  function syncStoryContacts(){
    const status=$("phoneDirectoryStatus"),candidates=storyContactCandidates();let added=0;
    candidates.forEach(x=>{
      const c=activeCharacter(),exists=c.phoneContacts.some(p=>contactNameKey(p.name)===contactNameKey(x.name)||contactNameKey(p.displayName)===contactNameKey(x.name));
      addContactRecord(x.name,x.relationship,x.species);if(!exists)added++;
    });
    renderPhoneContacts();renderPhoneDirectory();renderPhone();
    if(status)status.textContent=added?`Added ${added} story contact${added===1?"":"s"}.`:"No new story contacts found in the current cast/lore yet.";
  }

  function renderPhoneContacts(){
    const host=$("phoneContactEditor");if(!host)return;ensureLivingWorldData();const c=activeCharacter();host.innerHTML="";
    c.phoneContacts.forEach(p=>{
      const card=document.createElement("div");card.className="phone-contact-editor";
      card.innerHTML=`<div class="contact-editor-head">${avatarMarkup(p,"contact-editor-avatar")}<div class="contact-editor-title"><strong>${esc(p.displayName||p.name||"Contact")}</strong><span>${esc(p.status||"available")}</span></div><button type="button" class="ghost danger small remove-contact">Remove</button></div><div class="field-grid"><label>Character name<input class="pc-name" value="${esc(p.name)}" /></label><label>Phone display name<input class="pc-display" value="${esc(p.displayName)}" /></label><label>Relationship / role<input class="pc-relationship" value="${esc(p.relationship||"")}" placeholder="Brother, ex, best friend, coworker…" /></label><label>Status<select class="pc-status">${["available","away","at work","sleeping","driving","do not disturb"].map(s=>`<option value="${s}" ${p.status===s?"selected":""}>${s}</option>`).join("")}</select></label><label>Contact photo<input class="pc-avatar" type="file" accept="image/*" /></label></div><label class="toggle-row"><input class="pc-social-follow" type="checkbox" ${p.followsSocial!==false?"checked":""} /><span>Follows protagonist on Social</span></label><label>Texting style<textarea class="pc-style" rows="4">${esc(p.textingStyle)}</textarea></label>`;
      const saveField=(sel,key)=>card.querySelector(sel).addEventListener("input",e=>{p[key]=e.target.value;p.updatedAt=now();saveVault();renderPhoneContactRail();renderPhoneHeader()});
      saveField(".pc-name","name");saveField(".pc-display","displayName");saveField(".pc-relationship","relationship");saveField(".pc-style","textingStyle");
      card.querySelector(".pc-social-follow").addEventListener("change",e=>{p.followsSocial=!!e.target.checked;p.updatedAt=now();saveVault()});
      card.querySelector(".pc-status").addEventListener("change",e=>{p.status=e.target.value;p.updatedAt=now();saveVault();renderPhone()});
      card.querySelector(".pc-avatar").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{p.avatar=await compressImage(file);p.updatedAt=now();saveVault();renderPhoneContacts();renderPhone()}catch{alert("Could not use that image.")}});
      card.querySelector(".remove-contact").addEventListener("click",()=>{if(c.phoneContacts.length<=1){alert("Keep at least one phone contact in this world.");return}if(!confirm(`Remove ${p.displayName||p.name} from this world's phone?`))return;c.phoneContacts=c.phoneContacts.filter(x=>x.id!==p.id);c.chats.forEach(ch=>{if(ch.phoneThreads)delete ch.phoneThreads[p.id]});c.activePhoneContactId=c.phoneContacts[0]?.id||null;saveVault();renderPhoneContacts();renderPhone()});
      host.appendChild(card);
    });
  }


  function markPhoneRead(contactId){
    const ch=activeChat();ensureLivingWorldData();
    if(ch.phoneUnread && contactId && Number(ch.phoneUnread[contactId]||0)>0){
      ch.phoneUnread[contactId]=0;saveVault();
    }
    updatePhoneUnreadUI();
  }

  function totalPhoneUnread(){
    const ch=activeChat();ensureLivingWorldData();
    return Object.values(ch.phoneUnread||{}).reduce((n,v)=>n+(Number(v)||0),0);
  }

  function updatePhoneUnreadUI(){
    const ch=activeChat();ensureLivingWorldData();
    const dot=$("phoneTabUnreadDot");
    const total=totalPhoneUnread();
    if(dot){
      dot.classList.toggle("hidden",total<=0);
      dot.textContent=total>9?"9+":(total?String(total):"");
      dot.title=total?`${total} unread message${total===1?"":"s"}`:"";
    }
    document.querySelectorAll(".phone-contact-pill").forEach(btn=>{
      const id=btn.dataset.contactId;
      const count=Number(ch.phoneUnread?.[id]||0);
      let badge=btn.querySelector(".phone-unread-badge");
      if(count>0){
        if(!badge){badge=document.createElement("span");badge.className="phone-unread-badge";btn.appendChild(badge)}
        badge.textContent=count>9?"9+":String(count);
      }else badge?.remove();
    });
  }

  function ambientDelayMs(mode){
    const ranges={rare:[60,180],normal:[30,90],frequent:[15,45]};
    const [min,max]=ranges[mode]||ranges.normal;
    const mins=min+Math.random()*(max-min);
    return Math.round(mins*60*1000);
  }

  function todayKey(){
    const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }

  function recentSocialContext(ch=activeChat()){
    const posts=Array.isArray(ch.socialPosts)?ch.socialPosts.slice(-3):[];
    if(!posts.length)return "";
    return posts.map(p=>`${p.author||"PROTAGONIST"}: ${p.text||""}`).join("\n");
  }

  async function maybeSendAmbientText(){
    try{
      ensureLivingWorldData();
      if(!settings.ambientTextsEnabled)return;
      const c=activeCharacter(),ch=activeChat();
      const today=todayKey();
      if(ch.ambientTextsDate!==today){ch.ambientTextsDate=today;ch.ambientTextsToday=0;saveVault()}
      if(Number(ch.ambientTextsToday||0)>=8)return;
      const nowMs=Date.now();
      if(!ch.nextAmbientTextAt){
        ch.nextAmbientTextAt=nowMs+ambientDelayMs(settings.ambientTextFrequency||"normal");
        saveVault();return;
      }
      if(nowMs<Number(ch.nextAmbientTextAt))return;

      const eligible=(c.phoneContacts||[]).filter(p=>p && p.id && !["sleeping","do not disturb","driving"].includes(String(p.status||"").toLowerCase()));
      if(!eligible.length){
        ch.nextAmbientTextAt=nowMs+ambientDelayMs(settings.ambientTextFrequency||"normal");saveVault();return;
      }

      ch.nextAmbientTextAt=nowMs+ambientDelayMs(settings.ambientTextFrequency||"normal");saveVault();
      const p=eligible[Math.floor(Math.random()*eligible.length)];
      const thread=phoneThread(ch,p);
      const recent=thread.slice(-10).map(m=>`${m.role==="user"?"PROTAGONIST":(p.displayName||p.name)}: ${m.text}`).join("\n");
      const mainRecent=getConversationMessages(ch).slice(-6).map(m=>`${m.role==="user"?"PROTAGONIST":"CHARACTER"}: ${m.text}`).join("\n");
      const social=recentSocialContext(ch);

      const prompt=`AMBIENT PHONE TEXT
Write ONE unsolicited text message from ${p.name||p.displayName} to the protagonist.
Relationship/role: ${p.relationship||"(unspecified)"}
Current status: ${p.status||"available"}
Texting style: ${p.textingStyle||"Use established voice."}

Rules:
- Output ONLY the text message itself.
- No narration, labels, quotation marks, or stage directions.
- It should feel like something this person chose to text on their own.
- It may react to recent events/social posts if natural, but do not force a reference.
- Do not control the protagonist.
- Keep it concise unless this contact has a reason to send something longer.
- Respect all canon and hard limits.

RECENT PHONE THREAD:
${recent||"(none)"}

RECENT MAIN STORY:
${mainRecent||"(none)"}

RECENT SOCIAL POSTS:
${social||"(none)"}`;

      const reply=await openRouterRequest([
        {role:"system",content:compileSystemPrompt()+"\n\n"+prompt}
      ],Math.min(Number(settings.maxTokens||900),260),Math.min(Number(settings.temperature??0.85),1.0));

      const clean=String(reply||"").trim();
      if(clean){
        thread.push({id:uid(),role:"assistant",text:clean,createdAt:now(),ambient:true});
        ch.phoneUnread[p.id]=Number(ch.phoneUnread[p.id]||0)+1;
        ch.ambientTextsToday=Number(ch.ambientTextsToday||0)+1;
        ch.updatedAt=now();
      }
      ch.nextAmbientTextAt=nowMs+ambientDelayMs(settings.ambientTextFrequency||"normal");
      saveVault();renderPhoneMessages();updatePhoneUnreadUI();renderMemoryInspector();
    }catch(err){
      try{
        const ch=activeChat();ch.nextAmbientTextAt=Date.now()+30*60*1000;saveVault();
      }catch{}
    }
  }

  function renderPhoneContactRail(){
    const rail=$("phoneContactRail");if(!rail)return;ensureLivingWorldData();const c=activeCharacter();rail.innerHTML="";
    c.phoneContacts.forEach(p=>{
      const b=document.createElement("button");
      b.type="button";b.dataset.contactId=p.id;
      b.className=`phone-contact-pill${p.id===c.activePhoneContactId?" active":""}`;
      b.innerHTML=`${avatarMarkup(p,"phone-rail-avatar")}<span>${esc(p.displayName||p.name)}</span>`;
      b.addEventListener("click",()=>{c.activePhoneContactId=p.id;const f=$("phoneForm");if(f)delete f.dataset.groupId;const input=$("phoneInput");if(input)input.placeholder="Message…";markPhoneRead(p.id);saveVault();renderPhone()});
      rail.appendChild(b);
    });
    updatePhoneUnreadUI();
  }
  function renderPhoneHeader(){const p=contact();const photo=$("phoneHeaderAvatar"),name=$("phoneHeaderName"),status=$("phoneHeaderStatus");if(!photo||!name||!status||!p)return;photo.innerHTML=avatarMarkup(p,"phone-header-avatar-img");name.textContent=p.displayName||p.name;status.textContent=p.status||"available"}

  function renderPhoneMessages(){
    const host=$("phoneMessages");if(!host)return;const p=contact(),ch=activeChat(),msgs=phoneThread(ch,p);host.innerHTML="";
    if(!msgs.length){const empty=document.createElement("div");empty.className="phone-empty";empty.textContent=`No messages with ${p?.displayName||p?.name||"this contact"} yet.`;host.appendChild(empty)}
    msgs.forEach(msg=>{const row=document.createElement("div");row.className=`phone-message-row ${msg.role==="user"?"mine":"theirs"}`;const bubble=document.createElement("div");bubble.className="phone-bubble";bubble.textContent=msg.text;const meta=document.createElement("div");meta.className="phone-msg-meta";meta.textContent=fmtTime(msg.createdAt)+(msg.edited?" • edited":"");const tools=document.createElement("div");tools.className="phone-msg-tools";
      if(msg.role==="user"){const edit=document.createElement("button");edit.type="button";edit.className="phone-mini";edit.textContent="Edit";edit.addEventListener("click",()=>{const next=prompt("Edit message:",msg.text);if(next===null)return;const clean=next.trim();if(!clean)return;msg.text=clean;msg.edited=true;msg.editedAt=now();saveVault();renderPhoneMessages();renderMemoryInspector()});tools.appendChild(edit)}
      const del=document.createElement("button");del.type="button";del.className="phone-mini danger";del.textContent="Delete";del.addEventListener("click",()=>{if(!confirm("Delete this message from this phone thread?"))return;ch.phoneThreads[p.id]=msgs.filter(x=>x.id!==msg.id);saveVault();renderPhoneMessages();renderMemoryInspector()});tools.appendChild(del);row.append(bubble,meta,tools);host.appendChild(row)});
    host.scrollTop=host.scrollHeight;
  }
  function renderPhone(){const form=$("phoneForm");if(form)delete form.dataset.groupId;const input=$("phoneInput");if(input)input.placeholder="Message…";ensureLivingWorldData();renderPhoneContactRail();renderPhoneHeader();renderPhoneMessages();renderPhoneDirectory();updatePhoneUnreadUI();const away=$("phoneAwayNote");if(away)away.value=activeChat().phoneAwayNote||""}

  function recentPhoneContext(ch=activeChat(),limit=6){const c=activeCharacter(),chunks=[];(c.phoneContacts||[]).forEach(p=>{const arr=(ch.phoneThreads?.[p.id]||[]).slice(-limit);if(!arr.length)return;chunks.push(`TEXT THREAD — ${p.displayName||p.name}\n${arr.map(m=>`${m.role==="user"?"PROTAGONIST":(p.displayName||p.name)}: ${m.text}`).join("\n")}`)});return chunks.join("\n\n")}
  function phoneApiMessages(p){const ch=activeChat();const mainRecent=getConversationMessages(ch).slice(-8).map(m=>`${m.role==="user"?"PROTAGONIST":"CHARACTER"}: ${m.text}`).join("\n\n");const phone=phoneThread(ch,p).slice(-24).map(m=>({role:m.role,content:m.text}));const specific=`PHONE / TEXT MESSAGE MODE\nYou are texting as ${p.name||activeCharacter().name}.\nDisplay name: ${p.displayName||p.name}\nRelationship / role: ${p.relationship||"(not specified)"}\nCurrent phone status: ${p.status||"available"}\nAway/context note: ${ch.phoneAwayNote||"(none)"}\nTexting style: ${p.textingStyle||"(use established character voice)"}\n\nRules for this mode:\n- Reply as this contact only.\n- Write only the text they would actually send. No prose narration, stage directions, labels, quotation marks, or assistant commentary.\n- Do not narrate or decide the protagonist's actions, feelings, thoughts, reactions, or replies.\n- Keep established relationship, canon, secrets, promises, and scene continuity.\n- Phone messages are canon to this timeline and may be referenced later in the main RP.\n- Sound like a real person texting, not a formal roleplay narrator.\n- Usually send one concise message. A longer message is fine when emotionally justified.\n\nIMMEDIATE MAIN-RP CONTEXT\n${mainRecent||"(none)"}`;return [{role:"system",content:compileSystemPrompt()+"\n\n"+specific},...phone]}

  async function sendPhoneMessage(text){const p=contact(),ch=activeChat();if(!p)return;const clean=text.trim();if(!clean)return;const thread=phoneThread(ch,p);thread.push({id:uid(),role:"user",text:clean,createdAt:now()});ch.updatedAt=now();saveVault();renderPhoneMessages();renderMemoryInspector();const send=$("phoneSendBtn");if(send){send.disabled=true;send.textContent="…"}const typing=$("phoneTyping");if(typing)typing.textContent=`${p.displayName||p.name} is typing…`;try{const reply=await openRouterRequest(phoneApiMessages(p),Math.min(Number(settings.maxTokens||900),500),Math.min(Number(settings.temperature??0.85),1.05));thread.push({id:uid(),role:"assistant",text:String(reply||"").trim(),createdAt:now()});ch.updatedAt=now();saveVault();renderPhoneMessages();renderMemoryInspector();const combined=(clean+" "+reply).toLowerCase();if(/love you|marry me|engaged|break up|we're done|pregnan|mate bond|bonded|confess|betray|secret|promise/.test(combined)){ch.pendingMilestone=true;ch.pendingMilestoneAt=now();saveVault();updateMemoryStatus("Likely major milestone detected in Phone • tap Save Milestone Now if it should become long-term memory.")}}catch(err){alert(`Phone reply failed: ${err?.message||String(err)}`)}finally{if(send){send.disabled=false;send.textContent="Send"}if(typing)typing.textContent=""}}

  function renderMemoryInspector(){const host=$("memoryInspector");if(!host)return;ensureLivingWorldData();const c=activeCharacter(),ch=activeChat();const live=unconsolidatedMessages(ch).slice(-40);const phoneCount=Object.values(ch.phoneThreads||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);const sys=compileSystemPrompt();const approx=Math.ceil(sys.length/4);host.innerHTML=`<div class="memory-meter-grid"><div><strong>${approx.toLocaleString()}</strong><span>approx system tokens</span></div><div><strong>${live.length}</strong><span>live RP messages</span></div><div><strong>${phoneCount}</strong><span>phone messages</span></div><div><strong>${c.lore?.length||0}</strong><span>lore entries</span></div></div><div class="memory-layer-list"><div><b>Character canon</b><span>${(c.permanentMemory||"").length?"loaded":"empty"}</span></div><div><b>Relationship memory</b><span>${(ch.relationshipMemory||"").length?"loaded":"empty"}</span></div><div><b>Consolidated history</b><span>${(ch.consolidatedMemory||"").length?"loaded":"empty"}</span></div><div><b>Scene state</b><span>${[ch.scene?.location,ch.scene?.time,ch.scene?.state,ch.scene?.emotion].some(Boolean)?"loaded":"empty"}</span></div><div><b>Phone continuity</b><span>${phoneCount?"recent messages shared with main RP":"empty"}</span></div></div><p class="hint">Noctis keeps full transcripts in the vault, but only recent live turns + compact memory are sent during normal RP. Phone uses its own recent thread plus a small slice of main-RP context.</p>`}

  function monthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
  function loadUsage(){try{return JSON.parse(localStorage.getItem(USAGE_KEY)||"{}")}catch{return {}}}
  function saveUsage(u){localStorage.setItem(USAGE_KEY,JSON.stringify(u))}
  function modelRate(model){if(String(model||"").endsWith(":free")||model==="openrouter/free")return {input:0,output:0};return RATE_TABLE[model]||null}
  function recordUsage(data,model){const u=data?.usage;if(!u)return;const input=Number(u.prompt_tokens??u.input_tokens??0),output=Number(u.completion_tokens??u.output_tokens??0);if(!input&&!output)return;const db=loadUsage(),key=monthKey();db[key]=db[key]||{input:0,output:0,cost:0,requests:0,byModel:{}};const row=db[key],rate=modelRate(model),cost=rate?((input/1e6)*rate.input+(output/1e6)*rate.output):0;row.input+=input;row.output+=output;row.cost+=cost;row.requests+=1;row.byModel[model]=row.byModel[model]||{input:0,output:0,cost:0,requests:0};row.byModel[model].input+=input;row.byModel[model].output+=output;row.byModel[model].cost+=cost;row.byModel[model].requests+=1;saveUsage(db);renderUsagePanel()}
  function renderUsagePanel(){const host=$("usagePanel");if(!host)return;const db=loadUsage(),row=db[monthKey()]||{input:0,output:0,cost:0,requests:0};const budget=Number(settings.monthlyBudgetUsd||0),remaining=budget>0?Math.max(0,budget-row.cost):null;host.innerHTML=`<div class="usage-grid"><div><strong>${row.requests||0}</strong><span>model requests</span></div><div><strong>${Math.round(row.input||0).toLocaleString()}</strong><span>input tokens</span></div><div><strong>${Math.round(row.output||0).toLocaleString()}</strong><span>output tokens</span></div><div><strong>$${Number(row.cost||0).toFixed(2)}</strong><span>tracked paid cost</span></div></div><p class="hint">${budget>0?`App budget: $${budget.toFixed(2)} • approximately $${remaining.toFixed(2)} remaining.`:"Set a monthly app budget below if you want Noctis to block paid generations after the tracked total reaches it."}</p><p class="hint tiny">Free models record tokens at $0. Paid cost tracking currently knows the Nemotron 3 Ultra paid rate discussed for Noctis; provider billing remains authoritative.</p>`;const budgetInput=$("monthlyBudgetUsd");if(budgetInput&&document.activeElement!==budgetInput)budgetInput.value=settings.monthlyBudgetUsd||"";window.NoctisDailyUsage?.render()}

  const baseCompileSystemPrompt=compileSystemPrompt;
  compileSystemPrompt=function(){const base=baseCompileSystemPrompt();const recent=recentPhoneContext(activeChat(),6);return recent?`${base}\n\nRECENT CANONICAL PHONE / TEXT CONTEXT\n${recent}`:base};

  const baseOpenRouterRequest=openRouterRequest;
  openRouterRequest=async function(messages,maxTokens=settings.maxTokens,temperature=settings.temperature){const rate=modelRate(settings.model),budget=Number(settings.monthlyBudgetUsd||0);if(rate&&budget>0){const row=loadUsage()[monthKey()]||{cost:0};if(Number(row.cost||0)>=budget)throw new Error(`Monthly Noctis paid-model budget of $${budget.toFixed(2)} has been reached. Switch to a free model or raise the budget in Settings.`)}return baseOpenRouterRequest(messages,maxTokens,temperature)};

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(...args){
    const startedAt=Date.now();
    const url=String(args[0]?.url||args[0]||"");
    const isCompletion=url==="https://openrouter.ai/api/v1/chat/completions";
    let modelAtCall=settings?.model||"";
    try{modelAtCall=JSON.parse(args[1]?.body||"{}").model||modelAtCall;}catch{}
    try{
      const res=await nativeFetch(...args);
      if(isCompletion){
        res.clone().json().then(data=>{
          const ok=res.ok&&!data?.error;
          try{if(ok)recordUsage(data,modelAtCall);}catch{}
          window.NoctisDailyUsage?.record(data,modelAtCall,ok,startedAt);
        }).catch(()=>window.NoctisDailyUsage?.record(null,modelAtCall,res.ok,startedAt));
      }
      return res;
    }catch(err){
      if(isCompletion)window.NoctisDailyUsage?.record(null,modelAtCall,false,startedAt);
      throw err;
    }
  };

  const baseRenderMessages=renderMessages;
  renderMessages=function(){baseRenderMessages();try{const ch=activeChat(),userMsgs=ch.messages.filter(m=>m.role==="user"&&!m.error);document.querySelectorAll("#messages .message.user").forEach((node,i)=>{const msg=userMsgs[i],tools=node.querySelector(".message-tools");if(!msg||!tools||tools.querySelector(".delete-everywhere"))return;const b=document.createElement("button");b.type="button";b.className="ghost danger delete-everywhere";b.textContent="Delete";b.addEventListener("click",()=>{if(!confirm("Delete this post from the transcript? If it was already inside compact memory, Noctis will invalidate that compact summary so it cannot keep stale history."))return;const conv=getConversationMessages(ch),cutoffIndex=ch.consolidatedThroughMessageId?conv.findIndex(x=>x.id===ch.consolidatedThroughMessageId):-1,msgIndex=conv.findIndex(x=>x.id===msg.id);ch.messages=ch.messages.filter(x=>x.id!==msg.id);if(cutoffIndex>=0&&msgIndex>=0&&msgIndex<=cutoffIndex){ch.consolidatedMemory="";ch.consolidatedThroughMessageId=null}ch.pendingMilestone=false;ch.updatedAt=now();saveVault();renderMessages();renderConsolidatedMemory();renderMemoryInspector()});tools.appendChild(b)})}catch{}renderMemoryInspector()};

  const baseRenderAll=renderAll;
  renderAll=function(){ensureLivingWorldData();baseRenderAll();renderPhoneContacts();renderPhone();renderMemoryInspector();renderUsagePanel()};

  function bindLivingWorldUI(){
    $("phoneDirectoryBtn")?.addEventListener("click",()=>{$("phoneDirectory")?.classList.toggle("hidden");renderPhoneDirectory()});
    $("closePhoneDirectoryBtn")?.addEventListener("click",()=>{$("phoneDirectory")?.classList.add("hidden")});
    $("addStoryContactBtn")?.addEventListener("click",addStoryContact);
    $("syncStoryContactsBtn")?.addEventListener("click",syncStoryContacts);
    $("createBestieTrioBtn")?.addEventListener("click",createBestieTrio);
    $("newGroupChatBtn")?.addEventListener("click",createGroupChat);
    $("phoneGroupsBtn")?.addEventListener("click",()=>{$("phoneDirectory")?.classList.remove("hidden");renderPhoneGroups()});
    const ambientToggle=$("ambientTextsEnabled");
    if(ambientToggle){
      ambientToggle.checked=!!settings.ambientTextsEnabled;
      ambientToggle.addEventListener("change",e=>{settings.ambientTextsEnabled=!!e.target.checked;const ch=activeChat();ch.nextAmbientTextAt=settings.ambientTextsEnabled?Date.now()+ambientDelayMs(settings.ambientTextFrequency||"normal"):0;saveSettings();saveVault()});
    }
    const ambientFreq=$("ambientTextFrequency");
    if(ambientFreq){
      ambientFreq.value=settings.ambientTextFrequency||"normal";
      ambientFreq.addEventListener("change",e=>{settings.ambientTextFrequency=e.target.value||"normal";const ch=activeChat();ch.nextAmbientTextAt=Date.now()+ambientDelayMs(settings.ambientTextFrequency);saveSettings();saveVault()});
    }
    const add=$("addPhoneContactBtn");if(add)add.addEventListener("click",()=>{const c=activeCharacter(),p=defaultContact(c,c.phoneContacts.length);c.phoneContacts.push(p);c.activePhoneContactId=p.id;c.chats.forEach(ch=>{ch.phoneThreads=ch.phoneThreads||{};ch.phoneThreads[p.id]=[]});saveVault();renderPhoneContacts();renderPhone()});
    const form=$("phoneForm");let phoneBusy=false;
    if(form)form.addEventListener("submit",async e=>{
      e.preventDefault();if(phoneBusy)return;
      const input=$("phoneInput"),text=input.value.trim();if(!text)return;
      const gid=form.dataset.groupId||"";input.value="";phoneBusy=true;$("phoneSendBtn").disabled=true;
      try{if(gid)await sendGroupMessage(gid,text);else await sendPhoneMessage(text);}
      finally{phoneBusy=false;$("phoneSendBtn").disabled=false;}
    });
    const away=$("phoneAwayNote");if(away)away.addEventListener("input",e=>{activeChat().phoneAwayNote=e.target.value;activeChat().updatedAt=now();saveVault()});
    const clear=$("clearPhoneThreadBtn");if(clear)clear.addEventListener("click",()=>{
      const ch=activeChat(),gid=$("phoneForm")?.dataset.groupId;
      if(gid){const g=ch.phoneGroups.find(x=>x.id===gid);if(!g||!confirm(`Clear the group thread with ${g.name}?`))return;ch.groupThreads[gid]=[];ch.updatedAt=now();saveVault();openGroupChat(gid);return;}
      const p=contact();if(!p)return;if(!confirm(`Clear the phone thread with ${p.displayName||p.name}?`))return;activeChat().phoneThreads[p.id]=[];saveVault();renderPhoneMessages();renderMemoryInspector()});
    const budget=$("monthlyBudgetUsd");if(budget)budget.addEventListener("input",e=>{const v=e.target.value.trim();settings.monthlyBudgetUsd=v===""?"":Math.max(0,Number(v)||0);saveSettings();renderUsagePanel()});
    const model=$("paidNemotronShortcut");if(model)model.addEventListener("change",e=>{if(!e.target.value)return;settings.model=e.target.value;saveSettings();const sel=$("modelName");if(sel&&!Array.from(sel.options).some(o=>o.value===settings.model)){const o=document.createElement("option");o.value=settings.model;o.textContent=settings.model.includes(":free")?"Nemotron 3 Ultra — free":"Nemotron 3 Ultra — paid";sel.appendChild(o)}if(sel)sel.value=settings.model;updateConnectionStatus();e.target.value=""});
    const reset=$("resetUsageBtn");if(reset)reset.addEventListener("click",()=>{if(!confirm("Reset Noctis's local usage counter for this month? This does not change OpenRouter billing."))return;const db=loadUsage();delete db[monthKey()];saveUsage(db);renderUsagePanel()});
  }

  injectUI();ensureLivingWorldData();cleanInvalidAutoContacts();if(settings.monthlyBudgetUsd===undefined)settings.monthlyBudgetUsd="";if(settings.ambientTextsEnabled===undefined)settings.ambientTextsEnabled=false;if(!settings.ambientTextFrequency)settings.ambientTextFrequency="normal";saveVault();saveSettings();bindLivingWorldUI();renderPhoneContacts();renderPhone();updatePhoneUnreadUI();renderMemoryInspector();renderUsagePanel();setInterval(maybeSendAmbientText,60000);setTimeout(maybeSendAmbientText,5000);const badge=$("buildBadge");if(badge)badge.textContent="v"+LIVING_BUILD;
})();
