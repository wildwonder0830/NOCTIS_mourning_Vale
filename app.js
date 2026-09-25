const STORAGE_KEY="noctis-mourning-vale-v0.3";
const LEGACY_KEY="noctis-mourning-vale-v0.2";
const SETTINGS_KEY="noctis-private-settings-v0.4";
const LEGACY_SETTINGS_KEYS=[
  "noctis-private-settings-v0.2.1",
  "noctis-private-settings-v0.2"
];

const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const now=()=>new Date().toISOString();

function newChat(title="Main Story"){
  return {id:uid(),title,messages:[],relationshipMemory:"",scene:{location:"",time:"",state:"",emotion:""},threads:[],createdAt:now(),updatedAt:now()};
}
function newCharacter(name="New Character"){
  const chat=newChat();
  return {
    id:uid(),name,role:"",personality:"",backstory:"",voice:"",
    migrationNotes:"",
    directives:[
      "Never narrate the user's thoughts, dialogue, decisions, emotions, bodily reactions, or voluntary actions.",
      "Preserve established canon, scene geography, physical positions, clothing, injuries, objects, and elapsed time.",
      "Take initiative as the character instead of waiting passively.",
      "Do not invent prior events or personal history and present them as established facts.",
      "Treat shared memory, active-chat memory, lore, and chat history as authoritative.",
      "Do not break character unless the user explicitly asks for out-of-character discussion."
    ].join("\n"),
    permanentMemory:"",
    lore:[{title:"Engine Rule",body:"The model is the actor. Noctis owns canon, memory, scene state, and continuity. The user's protagonist remains under the user's control."}],
    chats:[chat],activeChatId:chat.id,createdAt:now(),updatedAt:now()
  };
}
function defaultVault(){
  const c=newCharacter("Noctis");
  c.role="Test Character";
  c.personality="Observant, emotionally intelligent, proactive, consistent, and capable of independent action.";
  c.backstory="A temporary test character used to validate the Noctis Mourning Vale engine.";
  c.voice="Natural, immersive prose. Speaks with confidence and specificity.";
  c.chats[0].messages=[{role:"assistant",text:"Noctis Mourning Vale v0.3 initialized. Your character library and separate timelines are ready."}];
  return {version:"0.4",characters:[c],activeCharacterId:c.id,updatedAt:now()};
}
const defaultSettings={apiKey:"",model:"nvidia/nemotron-3-ultra-550b-a55b:free",temperature:0.85,maxTokens:900};

function migrateLegacy(legacy){
  const c=newCharacter(legacy?.character?.name||"Imported Character");
  c.role=legacy?.character?.role||"";
  c.personality=legacy?.character?.personality||"";
  c.backstory=legacy?.character?.backstory||"";
  c.voice=legacy?.character?.voice||"";
  c.directives=legacy?.character?.directives||c.directives;
  c.permanentMemory=legacy?.memory?.permanent||"";
  c.migrationNotes=legacy?.migrationNotes||"";
  c.lore=Array.isArray(legacy?.lore)?legacy.lore:[];
  const chat=c.chats[0];
  chat.messages=Array.isArray(legacy?.messages)?legacy.messages:[];
  chat.relationshipMemory=legacy?.memory?.relationship||"";
  chat.scene={...chat.scene,...(legacy?.scene||{})};
  chat.threads=Array.isArray(legacy?.threads)?legacy.threads:[];
  chat.title="Main Story";
  return {version:"0.4",characters:[c],activeCharacterId:c.id,updatedAt:now()};
}
function loadVault(){
  try{
    const v=localStorage.getItem(STORAGE_KEY);
    if(v)return JSON.parse(v);
    const legacy=localStorage.getItem(LEGACY_KEY);
    if(legacy){
      const migrated=migrateLegacy(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
      return migrated;
    }
  }catch{}
  return defaultVault();
}
function loadSettings(){
  const mergeCandidate=(raw)=>{
    try{
      const obj=JSON.parse(raw);
      if(!obj || typeof obj!=="object")return null;

      const candidate={
        ...clone(defaultSettings),
        ...obj
      };

      // Be forgiving about older/alternate property names.
      candidate.apiKey =
        obj.apiKey ||
        obj.openRouterApiKey ||
        obj.openrouterApiKey ||
        obj.openrouterKey ||
        obj.key ||
        "";

      return candidate;
    }catch{return null}
  };

  try{
    // 1) Current storage key.
    const current=localStorage.getItem(SETTINGS_KEY);
    if(current){
      const parsed=mergeCandidate(current);
      if(parsed && parsed.apiKey)return parsed;
    }

    // 2) Known older Noctis keys.
    for(const key of LEGACY_SETTINGS_KEYS){
      const legacy=localStorage.getItem(key);
      if(!legacy)continue;
      const parsed=mergeCandidate(legacy);
      if(parsed && parsed.apiKey){
        localStorage.setItem(SETTINGS_KEY,JSON.stringify(parsed));
        return parsed;
      }
    }

    // 3) Last-resort recovery: inspect Noctis/local settings records in this
    // origin for an OpenRouter-looking key. This never sends the value anywhere.
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key)continue;

      const raw=localStorage.getItem(key);
      if(!raw)continue;

      const parsed=mergeCandidate(raw);
      if(parsed && typeof parsed.apiKey==="string" && parsed.apiKey.startsWith("sk-or-")){
        localStorage.setItem(SETTINGS_KEY,JSON.stringify(parsed));
        return parsed;
      }
    }
  }catch{}

  return clone(defaultSettings);
}
let vault=loadVault();
let settings=loadSettings();
function saveVault(){vault.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(vault))}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
const $=id=>document.getElementById(id);
function activeCharacter(){return vault.characters.find(c=>c.id===vault.activeCharacterId)||vault.characters[0]}
function activeChat(){
  const c=activeCharacter();
  let ch=c.chats.find(x=>x.id===c.activeChatId);
  if(!ch){ch=c.chats[0]||newChat();if(!c.chats.length)c.chats.push(ch);c.activeChatId=ch.id}
  return ch;
}
function selectTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===name));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>selectTab(btn.dataset.tab)));

function renderLibrary(){
  const list=$("characterList");list.innerHTML="";
  vault.characters.forEach(c=>{
    const card=document.createElement("button");card.className=`character-card${c.id===vault.activeCharacterId?" active":""}`;
    const turns=c.chats.reduce((n,ch)=>n+ch.messages.length,0);
    card.innerHTML=`<h3></h3><p></p><div class="card-meta"></div>`;
    card.querySelector("h3").textContent=c.name||"Untitled";
    card.querySelector("p").textContent=c.role||"Character / cast";
    card.querySelector(".card-meta").textContent=`${c.chats.length} chat${c.chats.length===1?"":"s"} • ${turns} saved message${turns===1?"":"s"}`;
    card.addEventListener("click",()=>{vault.activeCharacterId=c.id;saveVault();renderAll();selectTab("chat")});
    list.appendChild(card);
  });
}
function renderBasics(){
  const c=activeCharacter(),ch=activeChat();
  $("charName").value=c.name||"";$("charRole").value=c.role||"";$("charPersonality").value=c.personality||"";
  $("charBackstory").value=c.backstory||"";$("charVoice").value=c.voice||"";$("charDirectives").value=c.directives||"";
  $("memoryPermanent").value=c.permanentMemory||"";$("memoryRelationship").value=ch.relationshipMemory||"";
  if($("migrationNotes"))$("migrationNotes").value=c.migrationNotes||"";
  $("sceneLocation").value=ch.scene.location||"";$("sceneTime").value=ch.scene.time||"";
  $("sceneState").value=ch.scene.state||"";$("sceneEmotion").value=ch.scene.emotion||"";
  $("chatCharacterName").textContent=c.name||"Noctis";$("characterEditorTitle").textContent=c.name||"Character";
  $("activeChatTitle").textContent=ch.title||"Main Story";
  $("apiKey").value=settings.apiKey||"";$("modelName").value=settings.model||defaultSettings.model;
  $("temperature").value=settings.temperature??0.85;$("maxTokens").value=settings.maxTokens??900;
  updateConnectionStatus();
}
function bindBasics(){
  const charMap={charName:"name",charRole:"role",charPersonality:"personality",charBackstory:"backstory",charVoice:"voice",charDirectives:"directives"};
  Object.entries(charMap).forEach(([id,key])=>$(id).addEventListener("input",e=>{
    activeCharacter()[key]=e.target.value;activeCharacter().updatedAt=now();saveVault();
    if(id==="charName"){$("chatCharacterName").textContent=e.target.value||"Noctis";$("characterEditorTitle").textContent=e.target.value||"Character";renderLibrary()}
  }));
  $("memoryPermanent").addEventListener("input",e=>{activeCharacter().permanentMemory=e.target.value;saveVault()});
  if($("migrationNotes"))$("migrationNotes").addEventListener("input",e=>{activeCharacter().migrationNotes=e.target.value;saveVault()});
  $("memoryRelationship").addEventListener("input",e=>{activeChat().relationshipMemory=e.target.value;activeChat().updatedAt=now();saveVault()});
  [["sceneLocation","location"],["sceneTime","time"],["sceneState","state"],["sceneEmotion","emotion"]].forEach(([id,key])=>$(id).addEventListener("input",e=>{activeChat().scene[key]=e.target.value;activeChat().updatedAt=now();saveVault()}));
  $("apiKey").addEventListener("input",e=>{settings.apiKey=e.target.value.trim();saveSettings();updateConnectionStatus()});
  $("modelName").addEventListener("change",e=>{
    settings.model=e.target.value||defaultSettings.model;
    saveSettings();
    updateConnectionStatus();
    $("testResult").className="test-result";
    $("testResult").textContent="";
    $("rpTestResult").classList.add("hidden");
    $("rpTestResult").textContent="";
  });
  $("temperature").addEventListener("input",e=>{settings.temperature=Math.max(0,Math.min(2,Number(e.target.value)||0));saveSettings()});
  $("maxTokens").addEventListener("input",e=>{settings.maxTokens=Math.max(64,Math.min(4096,Number(e.target.value)||900));saveSettings()});
  if($("recoverKeyBtn"))$("recoverKeyBtn").addEventListener("click",()=>{
    const ok=recoverStoredKey();
    $("keyRecoveryStatus").textContent=ok
      ?"Recovered the existing OpenRouter key from this browser."
      :"No stored OpenRouter key was found. Paste your existing key into the field once.";
  });
}
function updateConnectionStatus(){
  $("connectionStatus").textContent=settings.apiKey?`ready • ${settings.model}`:"add OpenRouter key in Settings";
  const status=$("keyRecoveryStatus");
  if(status){
    status.textContent=settings.apiKey
      ? "OpenRouter key is loaded in this browser."
      : "No OpenRouter key is currently loaded.";
  }
}

function recoverStoredKey(){
  const recovered=loadSettings();
  if(recovered?.apiKey){
    settings=recovered;
    saveSettings();
    $("apiKey").value=settings.apiKey;
    $("modelName").value=settings.model||defaultSettings.model;
    updateConnectionStatus();
    return true;
  }
  updateConnectionStatus();
  return false;
}

const template=$("entryTemplate");
function renderEntries(container,list,getList){
  container.innerHTML="";
  list.forEach((item,index)=>{
    const node=template.content.firstElementChild.cloneNode(true),title=node.querySelector(".entry-title"),body=node.querySelector(".entry-body");
    title.value=item.title||"";body.value=item.body||"";
    title.addEventListener("input",e=>{getList()[index].title=e.target.value;saveVault()});
    body.addEventListener("input",e=>{getList()[index].body=e.target.value;saveVault()});
    node.querySelector(".remove").addEventListener("click",()=>{getList().splice(index,1);saveVault();renderContextLists()});
    container.appendChild(node);
  });
}
function renderContextLists(){
  renderEntries($("loreList"),activeCharacter().lore,()=>activeCharacter().lore);
  renderEntries($("threadList"),activeChat().threads,()=>activeChat().threads);
}
$("addLoreBtn").addEventListener("click",()=>{activeCharacter().lore.push({title:"",body:""});saveVault();renderContextLists()});
$("addThreadBtn").addEventListener("click",()=>{activeChat().threads.push({title:"",body:""});saveVault();renderContextLists()});

function renderChatList(){
  const c=activeCharacter(),list=$("chatList");list.innerHTML="";
  c.chats.forEach(ch=>{
    const row=document.createElement("div");row.className="chat-row";
    const pick=document.createElement("button");pick.className=`chat-select${ch.id===c.activeChatId?" active":""}`;
    pick.textContent=`${ch.title||"Untitled"} • ${ch.messages.length} messages`;
    pick.addEventListener("click",()=>{c.activeChatId=ch.id;saveVault();renderAll();$("chatManager").classList.add("hidden")});
    const rename=document.createElement("button");rename.className="ghost small";rename.textContent="Rename";
    rename.addEventListener("click",()=>renameChat(ch));
    row.append(pick,rename);list.appendChild(row);
  });
}
function renameChat(ch=activeChat()){
  const title=prompt("Chat title:",ch.title||"Main Story");
  if(title===null)return;
  ch.title=title.trim()||"Untitled Chat";ch.updatedAt=now();saveVault();renderAll();
}
function createChat(){
  const title=prompt("New chat title:","New Story");
  if(title===null)return;
  const c=activeCharacter(),ch=newChat(title.trim()||"New Story");c.chats.push(ch);c.activeChatId=ch.id;saveVault();renderAll();selectTab("chat");
}
$("newChatBtn").addEventListener("click",createChat);
$("chatMenuBtn").addEventListener("click",()=>{$("chatManager").classList.toggle("hidden");renderChatList()});
$("closeChatManagerBtn").addEventListener("click",()=>$("chatManager").classList.add("hidden"));
$("renameChatBtn").addEventListener("click",()=>renameChat());
$("deleteChatBtn").addEventListener("click",()=>{
  const c=activeCharacter();if(c.chats.length<=1){alert("Each character needs at least one chat.");return}
  const ch=activeChat();if(!confirm(`Delete "${ch.title}" and its transcript?`))return;
  c.chats=c.chats.filter(x=>x.id!==ch.id);c.activeChatId=c.chats[0].id;saveVault();renderAll();
});
$("newCharacterBtn").addEventListener("click",()=>{
  const name=prompt("Character or cast name:","New Character");if(name===null)return;
  const c=newCharacter(name.trim()||"New Character");vault.characters.push(c);vault.activeCharacterId=c.id;saveVault();renderAll();selectTab("character");
});
$("deleteCharacterBtn").addEventListener("click",()=>{
  if(vault.characters.length<=1){alert("Noctis needs at least one character in the vault.");return}
  const c=activeCharacter();if(!confirm(`Delete "${c.name}" including all of its chats and memory? Export a backup first if you may want it later.`))return;
  vault.characters=vault.characters.filter(x=>x.id!==c.id);vault.activeCharacterId=vault.characters[0].id;saveVault();renderAll();selectTab("library");
});

const messagesEl=$("messages");
function renderMessages(){
  const c=activeCharacter(),ch=activeChat();messagesEl.innerHTML="";
  ch.messages.forEach(msg=>{
    const wrap=document.createElement("div");wrap.className=`message ${msg.role}${msg.error?" error":""}`;
    const meta=document.createElement("div");meta.className="meta";meta.textContent=msg.role==="user"?"YOU":(c.name||"NOCTIS").toUpperCase();
    const body=document.createElement("div");body.textContent=msg.text;wrap.append(meta,body);messagesEl.appendChild(wrap);
  });
  messagesEl.scrollTop=messagesEl.scrollHeight;
}
function compileSystemPrompt(){
  const c=activeCharacter(),ch=activeChat();
  const lore=c.lore.filter(x=>x.title||x.body).map(x=>`- ${x.title}: ${x.body}`).join("\n")||"(none)";
  const threads=ch.threads.filter(x=>x.title||x.body).map(x=>`- ${x.title}: ${x.body}`).join("\n")||"(none)";
  return `You are performing the roleplay character or cast named ${c.name || "the character"}.

CHARACTER / CAST ROLE
${c.role || "(unspecified)"}

PERSONALITY
${c.personality || "(unspecified)"}

BACKSTORY
${c.backstory || "(unspecified)"}

VOICE AND SPEECH
${c.voice || "(unspecified)"}

CHARACTER-SPECIFIC RESPONSE DIRECTIVES
${c.directives || "(none)"}

SHARED CANON MEMORY
${c.permanentMemory || "(none)"}

ACTIVE TIMELINE MEMORY
${ch.relationshipMemory || "(none)"}

ACTIVE CHAT
${ch.title || "Main Story"}

CURRENT SCENE
Location: ${ch.scene.location || "(unspecified)"}
Time / Atmosphere: ${ch.scene.time || "(unspecified)"}
Scene State: ${ch.scene.state || "(unspecified)"}
Emotional State: ${ch.scene.emotion || "(unspecified)"}

SHARED LOREBOOK
${lore}

OPEN THREADS FOR THIS TIMELINE
${threads}

NOCTIS CORE CONTINUITY RULES
- HUMAN-STYLE TURN TAKING IS MANDATORY. Control only the NPC character(s), environment, and events that belong to the engine.
- The user controls the protagonist completely. Never write, imply, complete, summarize, or assume the protagonist's dialogue, thoughts, feelings, intentions, decisions, voluntary actions, involuntary bodily reactions, movement, acceptance, refusal, or response.
- Never continue through a moment that requires the protagonist to act or answer. Stop the response at that decision/action boundary and wait for the user's next turn, exactly as a human roleplay partner would.
- It is fine for an NPC to initiate: speak, move closer, touch if already established/appropriate to the scene, make a demand, reveal information, create danger, ask a question, or otherwise change the situation. Then STOP before supplying the protagonist's reaction.
- Do not write sequences like "he does X, you react Y, then he continues Z." Write only through X and leave Y to the user.
- Keep turns compact by default: usually 1–3 focused paragraphs, enough for one meaningful NPC action/beat plus dialogue. Longer turns are appropriate only when the user explicitly asks for more narration or the scene contains events that do not require protagonist input.
- Never manufacture personal history and then treat it as remembered canon. Prior events, habits, injuries, clothing ownership/history, medical details, family history, relationship milestones, promises, and private routines must come from supplied canon or chat history.
- Harmless environmental texture is allowed, but invented personal facts are not.
- If an important personal detail is unknown, leave it unknown rather than guessing.
- Preserve physical geography, positions, clothing, objects, injuries, transformations, elapsed time, and cause-and-effect.
- Do not silently reset arguments, intimacy, danger, promises, emotional consequences, or unresolved events.
- For a multi-character cast, keep each character's voice, knowledge, motives, actions, and dialogue distinct.
- Take meaningful initiative as the character(s), but hand control back to the user as soon as their protagonist must respond.
- Write coherent, concrete prose. Every sentence must logically connect to the scene. Avoid contradictory metaphors, generic filler, and invented callbacks.
- Dialogue should sound like the established character, not like an assistant, therapist, narrator explaining consent, or generic romance prose.
- Remain in character unless the user explicitly requests out-of-character discussion.

The model is the actor. Noctis owns canon and continuity. The user's protagonist remains theirs.`;
}
function apiMessages(){
  const ch=activeChat();
  return [{role:"system",content:compileSystemPrompt()},...ch.messages.slice(-40).filter(m=>!m.error).map(m=>({role:m.role,content:m.text}))];
}
async function openRouterRequest(messages,maxTokens=settings.maxTokens,temperature=settings.temperature){
  if(!settings.apiKey)throw new Error("Add your OpenRouter API key in Settings first.");

  const payload={
    model:settings.model||defaultSettings.model,
    messages,
    temperature:Number(temperature??0.85),
    max_tokens:Number(maxTokens??900)
  };

  let lastError=null;

  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${settings.apiKey}`,
          "Content-Type":"application/json",
          "HTTP-Referer":location.href,
          "X-Title":"Noctis Mourning Vale"
        },
        body:JSON.stringify(payload)
      });

      const data=await response.json().catch(()=>({}));

      if(response.ok){
        const text=data?.choices?.[0]?.message?.content;
        if(text)return text;
        throw new Error("The model returned no text.");
      }

      const main=data?.error?.message||`HTTP ${response.status}`;
      const provider=data?.error?.metadata?.provider_name||data?.error?.metadata?.provider||"";
      const raw=data?.error?.metadata?.raw||data?.error?.metadata?.message||"";
      const code=data?.error?.code||response.status;

      let details=`${main}`;
      if(provider)details+=` • provider: ${provider}`;
      if(raw && typeof raw==="string" && raw!==main)details+=` • ${raw.slice(0,220)}`;
      details+=` • code: ${code}`;

      lastError=new Error(details);

      // Free endpoints can briefly fail upstream. Retry once on transient/provider/rate errors.
      if(attempt===0 && [408,429,500,502,503,504].includes(Number(response.status))){
        await new Promise(r=>setTimeout(r,900));
        continue;
      }
      throw lastError;
    }catch(err){
      lastError=err;
      if(attempt===0 && /fetch|network/i.test(String(err?.message||err))){
        await new Promise(r=>setTimeout(r,900));
        continue;
      }
      throw err;
    }
  }

  throw lastError||new Error("Unknown OpenRouter error.");
}
async function generateReply(){
  $("sendBtn").disabled=true;$("connectionStatus").textContent="thinking…";
  try{
    const reply=await openRouterRequest(apiMessages());
    activeChat().messages.push({role:"assistant",text:reply});activeChat().updatedAt=now();saveVault();renderMessages();$("connectionStatus").textContent=`connected • ${settings.model}`;
  }catch(err){
    activeChat().messages.push({role:"assistant",text:`Connection error: ${err.message}`,error:true});saveVault();renderMessages();$("connectionStatus").textContent="connection needs attention";
  }finally{$("sendBtn").disabled=false}
}
$("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();const input=$("messageInput"),text=input.value.trim();if(!text)return;
  activeChat().messages.push({role:"user",text});activeChat().updatedAt=now();input.value="";saveVault();renderMessages();await generateReply();
});
$("regenBtn").addEventListener("click",async()=>{
  const m=activeChat().messages;if(m.at(-1)?.role==="assistant")m.pop();if(m.at(-1)?.role!=="user")return;saveVault();renderMessages();await generateReply();
});
$("clearChatBtn").addEventListener("click",()=>{if(confirm("Clear this timeline's transcript? Character canon, lore, and memory remain.")){activeChat().messages=[];saveVault();renderMessages()}});

$("testConnectionBtn").addEventListener("click",async()=>{
  const out=$("testResult");
  out.className="test-result";
  out.textContent="Testing connection…";
  $("rpTestResult").classList.add("hidden");
  $("rpTestResult").textContent="";
  try{
    await openRouterRequest([
      {role:"system",content:"This is a connectivity check. Return a short acknowledgement only."},
      {role:"user",content:"Connection test."}
    ],40,0);
    out.className="test-result ok";
    out.textContent=`Connected successfully • ${settings.model}`;
  }catch(err){
    out.className="test-result bad";
    out.textContent=`Connection failed: ${err.message}`;
  }
});
$("rpTestBtn").addEventListener("click",async()=>{
  const out=$("rpTestResult");out.classList.remove("hidden");out.textContent="Testing this model's roleplay discipline…";
  const prompt=`You are Jesse, a reserved, observant fictional man. The user controls Amanda completely.
Scene: Jesse is alone in the kitchen at midnight when Amanda enters and opens the refrigerator.
Established facts: Jesse calls Amanda "Cricket." Nothing else about her clothing, sleep habits, health, feelings, or prior actions has been established.
Write Jesse's next response in 1–3 paragraphs. Do not write or imply Amanda's dialogue, thoughts, feelings, bodily reactions, movement, choices, or actions. Do not invent remembered facts about her. Make Jesse take one meaningful action and/or speak, then STOP at the point where Amanda would need to respond, exactly like a human RP partner waiting for the other player's turn.`;
  try{
    const text=await openRouterRequest([{role:"system",content:"This is a roleplay quality test. Follow the scenario exactly and do not invent prior personal facts."},{role:"user",content:prompt}],500,0.8);
    out.textContent=`MODEL: ${settings.model}\n\n${text}\n\nCheck: Did it leave Amanda under your control? Did it avoid invented history? Does Jesse's dialogue actually make sense?`;
  }catch(err){out.textContent=`Test failed: ${err.message}`}
});

$("exportBtn").addEventListener("click",()=>{
  const backup={...vault,exportedAt:now(),settingsExcluded:true};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`noctis-vault-backup-v0.4-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
});
$("importInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const raw=await file.text();
    if(file.name.toLowerCase().endsWith(".txt")){
      const ch=activeChat();
      ch.messages.push({role:"assistant",text:`[Imported transcript archive: ${file.name}]\n\n${raw}`});
      ch.updatedAt=now();saveVault();renderAll();alert("Text transcript archived in the active chat. Structured transcript parsing is coming next.");
    }else{
      const parsed=JSON.parse(raw);
      if((parsed?.version==="0.3"||parsed?.version==="0.4")&&Array.isArray(parsed.characters)){vault=parsed}
      else if(parsed?.character||parsed?.messages){vault=migrateLegacy(parsed)}
      else throw new Error("Unknown Noctis format");
      saveVault();renderAll();alert("Import complete.");
    }
  }catch(err){alert(`That file could not be imported: ${err.message}`)}
  e.target.value="";
});


function normalizeLabels(raw){
  return raw.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
}

function parseRescueText(){
  const raw=$("rescueText").value.replace(/\r\n/g,"\n").trim();
  const mode=$("rescueMode").value;
  if(!raw)return [];

  if(mode==="archive"){
    return [{role:"assistant",text:`[ARCHIVED TRANSCRIPT]\n\n${raw}`,archive:true}];
  }

  if(mode==="userfirst" || mode==="assistantfirst"){
    const blocks=raw.split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
    let role=mode==="userfirst"?"user":"assistant";
    return blocks.map(text=>{
      const item={role,text};
      role=role==="user"?"assistant":"user";
      return item;
    });
  }

  const userLabels=normalizeLabels($("userLabels").value);
  const assistantLabels=normalizeLabels($("assistantLabels").value);

  const lines=raw.split("\n");
  const out=[];
  let currentRole=null,current=[];

  const flush=()=>{
    const text=current.join("\n").trim();
    if(text && currentRole)out.push({role:currentRole,text});
    current=[];
  };

  const labelRe=/^\s*([A-Za-z0-9 _'&-]{1,40})\s*:\s*(.*)$/;
  for(const line of lines){
    const m=line.match(labelRe);
    if(m){
      const label=m[1].trim().toLowerCase();
      let role=null;
      if(userLabels.includes(label))role="user";
      else if(assistantLabels.includes(label))role="assistant";

      if(role){
        flush();
        currentRole=role;
        current=[m[2]];
        continue;
      }
    }
    if(currentRole)current.push(line);
    else{
      // If auto-detect sees unlabeled opening text, preserve it as archive note instead of guessing.
      currentRole="assistant";
      current=[`[UNLABELED TRANSCRIPT CONTENT]\n${line}`];
    }
  }
  flush();
  return out;
}

function showRescuePreview(){
  const items=parseRescueText(),box=$("rescuePreview");
  box.classList.remove("hidden");
  if(!items.length){box.textContent="Nothing to import yet.";return}
  box.innerHTML=`<strong>${items.length} block${items.length===1?"":"s"} detected.</strong>`;
  items.slice(0,12).forEach(item=>{
    const div=document.createElement("div");
    div.className="rescue-preview-item";
    const who=document.createElement("div");who.className="who";who.textContent=item.role==="user"?"YOU":"CHARACTER / ARCHIVE";
    const body=document.createElement("div");body.textContent=item.text.slice(0,500)+(item.text.length>500?"…":"");
    div.append(who,body);box.appendChild(div);
  });
  if(items.length>12){
    const more=document.createElement("div");more.className="hint";more.textContent=`…plus ${items.length-12} more blocks`;
    box.appendChild(more);
  }
}

if($("previewRescueBtn"))$("previewRescueBtn").addEventListener("click",showRescuePreview);

if($("commitRescueBtn"))$("commitRescueBtn").addEventListener("click",()=>{
  const items=parseRescueText();
  if(!items.length){alert("Paste a transcript first.");return}
  const ch=activeChat();
  if(!confirm(`Import ${items.length} transcript block${items.length===1?"":"s"} into "${ch.title}"?`))return;
  ch.messages.push(...items.map(x=>({role:x.role,text:x.text,archivedImport:true})));
  ch.updatedAt=now();
  saveVault();
  $("rescueText").value="";
  $("rescuePreview").classList.add("hidden");
  renderMessages();
  alert("Transcript imported into the active chat.");
  selectTab("chat");
});

function renderAll(){renderLibrary();renderBasics();renderContextLists();renderMessages();renderChatList()}
bindBasics();renderAll();saveVault();
