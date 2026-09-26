const NOCTIS_BUILD="0.7.5";
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
  return {
    id:uid(),title,messages:[],relationshipMemory:"",milestones:[],
    consolidatedMemory:"",consolidatedThroughMessageId:null,
    scene:{location:"",time:"",state:"",emotion:""},
    threads:[],activePersonaId:null,castFocus:"",
    pendingMilestone:false,createdAt:now(),updatedAt:now()
  };
}

function newPersona(slot=1,name=""){
  return {
    id:uid(),slot,name:name||`Persona ${slot}`,
    age:"",pronouns:"",species:"",occupation:"",
    relationshipStyle:"",appearance:"",personality:"",
    powers:"",canon:"",preferences:"",updatedAt:now()
  };
}
function ensurePersonas(v){
  if(!Array.isArray(v.personas))v.personas=[];
  while(v.personas.length<4)v.personas.push(newPersona(v.personas.length+1));
  v.personas=v.personas.slice(0,4);
  v.personas.forEach((p,i)=>{
    p.id=p.id||uid(); p.slot=i+1; p.name=p.name||`Persona ${i+1}`;
    ["age","pronouns","species","occupation","relationshipStyle","appearance","personality","powers","canon","preferences"]
      .forEach(k=>{if(typeof p[k]!=="string")p[k]=""});
    p.updatedAt=p.updatedAt||now();
  });
  return v.personas;
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
  const personas=[1,2,3,4].map(i=>newPersona(i));
  c.chats[0].activePersonaId=personas[0].id;
  return {version:"0.7",personas,characters:[c],activeCharacterId:c.id,updatedAt:now()};
}
const defaultSettings={
  apiKey:"",
  model:"nvidia/nemotron-3-ultra-550b-a55b:free",
  temperature:0.85,
  maxTokens:900,
  autoMemory:true,
  hardLimits:[
    "Anal sex or anal penetration",
    "Breath play",
    "Hard choking or strangulation",
    "Suffocation or intentional oxygen restriction",
    "Eroticized loss of consciousness from airway or blood-flow restriction",
    "Electrical stimulation / e-stim",
    "Sexual content involving animals or bestiality",
    "Extreme pain or torture-level pain",
    "Crying as an erotic goal, kink, or escalation target",
    "Urine / piss play",
    "Feces / scat / shit play",
    "Overstimulation"
  ].join("\n"),
  userTurnStyle:"Write the protagonist's turn naturally and in character. Match the user's established writing style and current scene. Keep it concise by default. Do not invent major new canon, backstory, consent, relationship milestones, injuries, powers, or decisions that are not supported by the existing RP."
};

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
  chat.milestones=Array.isArray(legacy?.milestones)?legacy.milestones:[];
  chat.scene={...chat.scene,...(legacy?.scene||{})};
  chat.threads=Array.isArray(legacy?.threads)?legacy.threads:[];
  chat.title="Main Story";
  const personas=[1,2,3,4].map(i=>newPersona(i)); chat.activePersonaId=personas[0].id; return {version:"0.7",personas,characters:[c],activeCharacterId:c.id,updatedAt:now()};
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

function normalizeVaultV07(){
  ensurePersonas(vault);
  (vault.characters||[]).forEach(c=>{
    (c.chats||[]).forEach(ch=>{
      ch.messages=Array.isArray(ch.messages)?ch.messages:[];
      ch.messages.forEach(m=>{if(!m.id)m.id=uid()});
      ch.milestones=Array.isArray(ch.milestones)?ch.milestones:[];
      if(typeof ch.consolidatedMemory!=="string")ch.consolidatedMemory="";
      if(!("consolidatedThroughMessageId" in ch))ch.consolidatedThroughMessageId=null;
      if(!vault.personas.some(p=>p.id===ch.activePersonaId))ch.activePersonaId=vault.personas[0].id;
      if(typeof ch.castFocus!=="string")ch.castFocus="";
    });
  });
  vault.version="0.7";
}

normalizeVaultV07();
let settings=loadSettings();

function activePersona(){
  ensurePersonas(vault);
  const ch=activeChat();
  return vault.personas.find(p=>p.id===ch.activePersonaId)||vault.personas[0];
}
function personaPrompt(){
  const p=activePersona();
  if(!p)return "(none)";
  return `Name: ${p.name||"(unspecified)"}
Age / Life stage: ${p.age||"(unspecified)"}
Pronouns: ${p.pronouns||"(unspecified)"}
Species / Nature: ${p.species||"(unspecified)"}
Occupation / Role: ${p.occupation||"(unspecified)"}
Relationship style: ${p.relationshipStyle||"(unspecified)"}
Appearance / Body: ${p.appearance||"(unspecified)"}
Personality: ${p.personality||"(unspecified)"}
Powers / Abilities: ${p.powers||"(none)"}
Background / Canon: ${p.canon||"(none)"}
Preferences / RP Notes: ${p.preferences||"(none)"}`;
}
function renderPersonas(){
  ensurePersonas(vault);
  const row=$("personaSlotRow");
  if(!row)return;
  const current=activePersona();
  row.innerHTML="";
  vault.personas.forEach(p=>{
    const b=document.createElement("button");
    b.type="button";
    b.className=`persona-slot${p.id===current.id?" active":""}`;
    b.textContent=`${p.slot}. ${p.name||`Persona ${p.slot}`}`;
    b.addEventListener("click",()=>{
      activeChat().activePersonaId=p.id;
      saveVault();renderPersonas();renderPersonaFields();renderPersonaBadge();
    });
    row.appendChild(b);
  });
}
function renderPersonaFields(){
  const p=activePersona(); if(!p)return;
  const map={
    personaName:"name",personaAge:"age",personaPronouns:"pronouns",
    personaSpecies:"species",personaOccupation:"occupation",
    personaRelationship:"relationshipStyle",personaAppearance:"appearance",
    personaPersonality:"personality",personaPowers:"powers",
    personaCanon:"canon",personaPreferences:"preferences"
  };
  Object.entries(map).forEach(([id,key])=>{if($(id))$(id).value=p[key]||""});
}


const AMANDA_24_PRESET={
  name:"Amanda — 24",
  age:"24-year-old adult woman",
  pronouns:"she/her",
  species:"Appears fully human; secretly an immortal witch",
  occupation:"Independent creative young woman; outwardly ordinary",
  relationshipStyle:"Deeply emotional, loyal, intense, sensual, guarded at first; fiercely committed once bonded",
  appearance:"Petite at 4'11\" with a soft, voluptuous hourglass figure, very fair skin, thick dark lashes, and hazel eyes that can read green, brown, gray, or gold depending on the light. Dark hair and a feminine gothic style. She looks delicate at first glance but carries herself with quiet confidence.",
  personality:"Intelligent, observant, witty, stubborn, playful, emotionally intense, and difficult to intimidate. She has a sharp mouth when provoked, dry humor, a mischievous streak, and strong loyalty. She notices small details, dislikes being underestimated or lied to, and can be teasing, bratty, affectionate, protective, and unexpectedly tender with people she trusts.",
  powers:"Amanda is secretly an immortal witch with immense natural magic. She does not age and cannot die by ordinary means. Her magic is instinctive and tied to will, emotion, intention, blood, and ancient forces. Potential abilities include protection, wards, destructive magic, energy manipulation, supernatural sensing, and other powers that can emerge naturally through the story. She is practiced at hiding all evidence of magic.",
  canon:"Amanda has hidden both her immortality and her witch nature from everyone. To friends, family, coworkers, romantic interests, and strangers, she is simply a normal healthy 24-year-old woman. No one knows the truth unless it is revealed during the roleplay. She learned long ago that discovery could make her a target, so concealment is second nature. Revealing what she is should be treated as a major relationship or plot milestone.",
  preferences:"Amanda controls her own dialogue, thoughts, feelings, choices, and physical actions. NPCs may pursue, flirt, provoke, challenge, misread, protect, or act on their own initiative, but they must never narrate Amanda's response for her. Favor strong personalities, emotional intensity, possessiveness, wit, tension, supernatural themes, fate, loyalty, and characters who take meaningful initiative. Her immortality and magic remain hidden until the story creates a compelling reason for discovery or revelation."
};
function loadAmanda24Preset(){
  const p=activePersona();
  const keys=["name","age","pronouns","species","occupation","relationshipStyle","appearance","personality","powers","canon","preferences"];
  keys.forEach(k=>p[k]=AMANDA_24_PRESET[k]||"");
  p.updatedAt=now();
  saveVault();
  renderPersonaFields();
  renderPersonas();
  renderPersonaBadge();
  alert(`Loaded Amanda 24 into persona slot ${p.slot}.`);
}

function personaExportFilename(p=activePersona()){
  const safe=(p?.name||"persona").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"persona";
  return `${safe}.noctis-persona.json`;
}
function exportActivePersona(){
  const p=activePersona();
  const payload={
    app:"Noctis Mourning Vale",
    format:"noctis-persona",
    version:"0.7.3",
    exportedAt:new Date().toISOString(),
    persona:{
      name:p.name||"",age:p.age||"",pronouns:p.pronouns||"",species:p.species||"",
      occupation:p.occupation||"",relationshipStyle:p.relationshipStyle||"",
      appearance:p.appearance||"",personality:p.personality||"",powers:p.powers||"",
      canon:p.canon||"",preferences:p.preferences||""
    }
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=personaExportFilename(p);
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function applyPersonaImport(src){
  if(!src || typeof src!=="object")throw new Error("That file is not a Noctis persona import.");
  const p=activePersona();
  const keys=["name","age","pronouns","species","occupation","relationshipStyle","appearance","personality","powers","canon","preferences"];
  keys.forEach(k=>p[k]=typeof src[k]==="string"?src[k]:"");
  p.updatedAt=now();
  saveVault();
  renderPersonaFields();renderPersonas();renderPersonaBadge();
  return p;
}

async function importPersonaFile(file){
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    let src=null;

    if(parsed?.format==="noctis-persona" && parsed?.persona) src=parsed.persona;
    else if(parsed?.persona && typeof parsed.persona==="object") src=parsed.persona;
    else if(parsed?.name && (parsed?.appearance!==undefined || parsed?.personality!==undefined || parsed?.canon!==undefined)) src=parsed;

    if(!src)throw new Error("That file is not a Noctis persona import.");

    const p=applyPersonaImport(src);
    alert(`Imported persona into slot ${p.slot}: ${p.name||`Persona ${p.slot}`}`);
  }catch(err){
    alert(`Could not import persona: ${err?.message||String(err)}`);
  }finally{
    const input=$("personaImportInput");if(input)input.value="";
  }
}

function bindPersonaFields(){
  const map={
    personaName:"name",personaAge:"age",personaPronouns:"pronouns",
    personaSpecies:"species",personaOccupation:"occupation",
    personaRelationship:"relationshipStyle",personaAppearance:"appearance",
    personaPersonality:"personality",personaPowers:"powers",
    personaCanon:"canon",personaPreferences:"preferences"
  };
  Object.entries(map).forEach(([id,key])=>{
    if(!$(id))return;
    $(id).addEventListener("input",e=>{
      const p=activePersona(); p[key]=e.target.value; p.updatedAt=now(); saveVault();
      if(key==="name"){renderPersonas();renderPersonaBadge()}
    });
  });
}
function renderPersonaBadge(){
  const el=$("activePersonaBadge"); if(!el)return;
  const p=activePersona(); el.textContent=p?.name?`Playing as: ${p.name}`:"";
}

function saveVault(){vault.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(vault))}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
const $=id=>document.getElementById(id);
function activeCharacter(){return vault.characters.find(c=>c.id===vault.activeCharacterId)||vault.characters[0]}
function activeChat(){
  const c=activeCharacter();
  let ch=c.chats.find(x=>x.id===c.activeChatId);
  if(!ch){ch=c.chats[0]||newChat();if(!c.chats.length)c.chats.push(ch);c.activeChatId=ch.id}
  if(!Array.isArray(ch.milestones))ch.milestones=[];
  return ch;
}
function selectTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===name));
  window.scrollTo({top:0,behavior:"smooth"});
  requestAnimationFrame(updateScrollBottomButton);
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
  if($("userTurnStyle"))$("userTurnStyle").value=settings.userTurnStyle||defaultSettings.userTurnStyle;
  if($("hardLimits"))$("hardLimits").value=settings.hardLimits||defaultSettings.hardLimits;
  if($("autoMemory"))$("autoMemory").checked=settings.autoMemory!==false;
  updateConnectionStatus();
  updateMemoryStatus();
}

function syncFilename(){
  const d=new Date();
  const stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}`;
  return `noctis-sync-${stamp}.json`;
}
function makeSyncPayload(){
  normalizeVaultV07();
  return {app:"Noctis Mourning Vale",format:"noctis-sync",version:"0.7.2",exportedAt:new Date().toISOString(),vault};
}
function setSyncStatus(msg){const el=$("syncStatus");if(el)el.textContent=msg||""}
function openSyncModal(){const el=$("syncModal");if(el)el.classList.remove("hidden");setSyncStatus("")}
function closeSyncModal(){const el=$("syncModal");if(el)el.classList.add("hidden")}
async function shareCurrentVault(){
  try{
    saveVault();
    const text=JSON.stringify(makeSyncPayload(),null,2);
    const file=new File([text],syncFilename(),{type:"application/json"});
    if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){
      setSyncStatus("Opening the share sheet…");
      await navigator.share({files:[file],title:"Noctis Vault",text:"Noctis vault transfer"});
      setSyncStatus("Vault shared. Import that file on the other device.");
      return;
    }
    const blob=new Blob([text],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setSyncStatus("Vault file saved. Move it with Files, iCloud Drive, AirDrop, or another file-sharing method.");
  }catch(err){
    if(err?.name==="AbortError"){setSyncStatus("Share cancelled.");return}
    setSyncStatus(`Could not share vault: ${err?.message||String(err)}`);
  }
}
async function importSyncFile(file){
  if(!file)return;
  try{
    const text=await file.text();
    const parsed=JSON.parse(text);
    let incoming=null;
    if(parsed?.format==="noctis-sync" && parsed?.vault?.characters)incoming=parsed.vault;
    else if(Array.isArray(parsed?.characters))incoming=parsed;
    if(!incoming)throw new Error("That file does not look like a Noctis vault.");
    vault=incoming;
    normalizeVaultV07();
    saveVault();
    renderAll();
    setSyncStatus(`Imported ${vault.characters?.length||0} character vault entr${vault.characters?.length===1?"y":"ies"} successfully.`);
  }catch(err){
    setSyncStatus(`Could not import vault: ${err?.message||String(err)}`);
  }finally{
    const input=$("syncImportInput");if(input)input.value="";
  }
}

function bindBasics(){
  if($("loadAmanda24PresetBtn"))$("loadAmanda24PresetBtn").addEventListener("click",loadAmanda24Preset);


  if($("importPersonaBtn"))$("importPersonaBtn").addEventListener("click",()=>$("personaImportInput")?.click());
  if($("exportPersonaBtn"))$("exportPersonaBtn").addEventListener("click",exportActivePersona);
  if($("personaImportInput"))$("personaImportInput").addEventListener("change",e=>importPersonaFile(e.target.files?.[0]));


  if($("syncBtn"))$("syncBtn").addEventListener("click",openSyncModal);
  if($("syncCloseBtn"))$("syncCloseBtn").addEventListener("click",closeSyncModal);
  if($("shareSyncBtn"))$("shareSyncBtn").addEventListener("click",shareCurrentVault);
  if($("importSyncBtn"))$("importSyncBtn").addEventListener("click",()=>$("syncImportInput")?.click());
  if($("syncImportInput"))$("syncImportInput").addEventListener("change",e=>importSyncFile(e.target.files?.[0]));
  if($("syncModal"))$("syncModal").addEventListener("click",e=>{if(e.target===$("syncModal"))closeSyncModal()});

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
  if($("userTurnStyle"))$("userTurnStyle").addEventListener("input",e=>{settings.userTurnStyle=e.target.value;saveSettings()});
  if($("hardLimits"))$("hardLimits").addEventListener("input",e=>{settings.hardLimits=e.target.value;saveSettings()});
  if($("autoMemory"))$("autoMemory").addEventListener("change",e=>{settings.autoMemory=e.target.checked;saveSettings();updateMemoryStatus()});
  if($("saveMilestoneNowBtn"))$("saveMilestoneNowBtn").addEventListener("click",saveMilestoneNow);
  if($("consolidateMemoryBtn"))$("consolidateMemoryBtn").addEventListener("click",consolidateOlderHistory);
  if($("consolidatedMemory"))$("consolidatedMemory").addEventListener("input",e=>{
    activeChat().consolidatedMemory=e.target.value;activeChat().updatedAt=now();saveVault();updateConsolidationStatus();
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


function getConversationMessages(ch=activeChat()){
  return ch.messages.filter(m=>m && (m.role==="user"||m.role==="assistant") && !m.error);
}
function unconsolidatedMessages(ch=activeChat()){
  const msgs=getConversationMessages(ch);
  if(!ch.consolidatedThroughMessageId)return msgs;
  const idx=msgs.findIndex(m=>m.id===ch.consolidatedThroughMessageId);
  return idx>=0?msgs.slice(idx+1):msgs;
}
function renderConsolidatedMemory(){
  const ch=activeChat();
  if($("consolidatedMemory"))$("consolidatedMemory").value=ch.consolidatedMemory||"";
  updateConsolidationStatus();
}
function updateConsolidationStatus(text=""){
  const el=$("consolidationStatus"); if(!el)return;
  if(text){el.textContent=text;return}
  const pending=unconsolidatedMessages().length;
  if(!activeChat().consolidatedMemory && pending<=16)el.textContent=`Nothing needs compressing yet • ${pending} active transcript messages.`;
  else if(pending>24)el.textContent=`${pending} messages since the last consolidation • compacting is recommended.`;
  else el.textContent=`${pending} recent messages remain live alongside the compact history.`;
}
async function consolidateOlderHistory(){
  const ch=activeChat();
  const all=getConversationMessages(ch), keepRecent=16;
  if(all.length<=keepRecent){
    updateConsolidationStatus("Not enough history yet. Noctis keeps the most recent 16 messages live.");
    return;
  }
  const cutoffIndex=all.length-keepRecent-1;
  const cutoffMessage=all[cutoffIndex];
  const priorIndex=ch.consolidatedThroughMessageId?all.findIndex(m=>m.id===ch.consolidatedThroughMessageId):-1;
  const slice=all.slice(Math.max(0,priorIndex+1),cutoffIndex+1);
  if(!slice.length){updateConsolidationStatus("Older history is already compacted.");return}

  const btn=$("consolidateMemoryBtn"); if(btn)btn.disabled=true;
  updateConsolidationStatus(`Compressing ${slice.length} older messages…`);
  const transcript=slice.map(m=>`${m.role==="user"?"USER":"CHARACTER"}: ${m.text}`).join("\n\n");
  const prompt=`You are compacting fictional roleplay history for long-term continuity.

Merge the EXISTING COMPACT MEMORY with the NEW OLDER TRANSCRIPT into one concise continuity record.

Keep only durable facts future scenes may need: relationship status and milestones; promises and consequences; identities, powers, transformations, lasting injuries; major discoveries and who knows them; plot-relevant locations or objects; unresolved threads; stable preferences established in the RP.

Drop prose flourishes, repeated affection, routine meals/outfits/minor actions, explicit mechanical sexual detail, temporary sensations, and duplicate facts.

Use short bullets or compact sentences. Prefer concrete names and facts. Do not invent anything. Target roughly 250-450 words maximum.

EXISTING COMPACT MEMORY:
${ch.consolidatedMemory||"(none)"}

NEW OLDER TRANSCRIPT:
${transcript}`;

  try{
    const result=await openRouterRequest([
      {role:"system",content:"Return only the compact continuity memory. No preamble."},
      {role:"user",content:prompt}
    ],700,0.15);
    ch.consolidatedMemory=String(result||"").replace(/^```(?:text|markdown)?/i,"").replace(/```$/,"").trim();
    ch.consolidatedThroughMessageId=cutoffMessage.id;
    ch.updatedAt=now();saveVault();renderConsolidatedMemory();
    updateConsolidationStatus(`Compacted ${slice.length} older messages. The full transcript is still preserved.`);
  }catch(err){
    updateConsolidationStatus(`Could not consolidate: ${err?.message||String(err)}`);
  }finally{if(btn)btn.disabled=false}
}

function updateMemoryStatus(text=""){
  const el=$("memoryStatus");
  if(!el)return;
  if(text){el.textContent=text;return}
  if(settings.autoMemory===false){
    el.textContent="Milestone flagging is off.";
  }else if(activeChat()?.pendingMilestone){
    el.textContent="Likely major milestone detected • tap Save Milestone Now when you want to store it.";
  }else{
    el.textContent="Budget mode on • milestone detection is local and uses no extra requests.";
  }
}

function renderMilestones(){
  const list=$("milestoneList");
  if(!list)return;
  const ch=activeChat();
  list.innerHTML="";

  if(!ch.milestones.length){
    const empty=document.createElement("div");
    empty.className="hint";
    empty.textContent="No auto-saved milestones yet.";
    list.appendChild(empty);
    return;
  }

  ch.milestones.slice().reverse().forEach(m=>{
    const box=document.createElement("div");
    box.className="milestone-item";

    const text=document.createElement("div");
    text.className="milestone-text";
    text.textContent=m.text;

    const meta=document.createElement("div");
    meta.className="milestone-meta";
    meta.textContent=m.createdAt ? `Auto-saved ${new Date(m.createdAt).toLocaleString()}` : "Auto-saved";

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="ghost danger small";
    remove.textContent="Delete";
    remove.addEventListener("click",()=>{
      ch.milestones=ch.milestones.filter(x=>x.id!==m.id);
      syncMilestonesToMemory();
      saveVault();
      renderMilestones();
    });

    box.append(text,meta,remove);
    list.appendChild(box);
  });
}

function syncMilestonesToMemory(){
  const ch=activeChat();
  const markerStart="[[AUTO MILESTONES]]";
  const markerEnd="[[/AUTO MILESTONES]]";
  const base=(ch.relationshipMemory||"").replace(new RegExp(`\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`,"g"),"").trim();
  const block=ch.milestones.length
    ? `${markerStart}\n${ch.milestones.map(m=>`- ${m.text}`).join("\n")}\n${markerEnd}`
    : "";
  ch.relationshipMemory=[base,block].filter(Boolean).join("\n\n");
  if($("memoryRelationship"))$("memoryRelationship").value=ch.relationshipMemory;
}

function milestoneCandidateText(){
  const recent=activeChat().messages.slice(-6).map(m=>m.text||"").join("\n").toLowerCase();
  const signals=[
    "i love you","love you","first time","had sex","slept together","made love",
    "kissed for the first time","engaged","proposal","marry me","married","wedding",
    "mate","mated","bonded","bond sealed","marked","claimed","break up","broke up",
    "we're done","relationship","girlfriend","boyfriend","partner","moved in",
    "pregnant","pregnancy","baby","died","death","killed","revealed","discovered",
    "found out","secret","transformed","shifted","first shift","immortal","prophecy",
    "promise","confessed","confession","betrayed","forgave","forgiven","home"
  ];
  return signals.some(s=>recent.includes(s));
}

function normalizeMilestoneResult(raw){
  const cleaned=(raw||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  try{
    const obj=JSON.parse(cleaned);
    if(obj && typeof obj.milestone==="string" && obj.milestone.trim())return obj.milestone.trim();
    return null;
  }catch{
    return null;
  }
}

function maybeAutoSaveMilestone(){
  if(settings.autoMemory===false)return;
  if(!milestoneCandidateText())return;
  const ch=activeChat();
  ch.pendingMilestone=true;
  ch.pendingMilestoneAt=now();
  saveVault();
  updateMemoryStatus("Likely major milestone detected • tap Save Milestone Now when you want to store it.");
}

async function saveMilestoneNow(){
  const ch=activeChat();
  if(!ch.messages.length){
    updateMemoryStatus("There is no recent scene to summarize.");
    return;
  }

  updateMemoryStatus("Saving milestone…");
  const recent=ch.messages.slice(-8).map(m=>`${m.role==="user"?"USER":"CHARACTER"}: ${m.text}`).join("\n\n");
  const existing=ch.milestones.map(m=>`- ${m.text}`).join("\n")||"(none)";

  const prompt=`You are a continuity-memory extractor for a fictional roleplay.

Determine whether the RECENT EXCERPT contains a MAJOR, durable continuity milestone that future scenes should remember.

Save only things such as:
- a relationship status change or major confession
- first-time intimacy or another clearly relationship-defining event
- marriage, engagement, mate bond, marking, bonding, breakup, reconciliation
- major identity/power reveal or transformation
- death, betrayal, rescue, discovery, irreversible promise, major plot revelation
- a lasting change in who knows what or how the relationship fundamentally stands

DO NOT save ordinary flirting, kisses, meals, routine sex after an already-established sexual relationship, momentary emotions, temporary positions, clothing, minor actions, jokes, atmospheric details, or explicit mechanical sexual detail.

Return ONLY valid JSON:
{"milestone":"one concise neutral continuity sentence"}
or
{"milestone":null}

EXISTING MILESTONES:
${existing}

RECENT EXCERPT:
${recent}`;

  try{
    const raw=await openRouterRequest([
      {role:"system",content:"Return strict JSON only. No markdown and no explanation."},
      {role:"user",content:prompt}
    ],140,0.1);

    const milestone=normalizeMilestoneResult(raw);
    if(!milestone){
      updateMemoryStatus("No major milestone found.");
      ch.pendingMilestone=false;
      saveVault();
      return;
    }

    const duplicate=ch.milestones.some(m=>{
      const a=m.text.toLowerCase(),b=milestone.toLowerCase();
      return a===b || a.includes(b) || b.includes(a);
    });

    if(!duplicate){
      ch.milestones.push({id:uid(),text:milestone,createdAt:now(),source:"manual"});
      syncMilestonesToMemory();
      ch.updatedAt=now();
      renderMilestones();
    }

    ch.pendingMilestone=false;
    saveVault();
    updateMemoryStatus(duplicate?"Milestone already remembered.":"Major milestone saved.");
  }catch(err){
    updateMemoryStatus(`Could not save milestone: ${err?.message||String(err)}`);
  }
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
const scrollBottomBtn=$("scrollBottomBtn");
const topbarEl=$("topbar");

function chatViewActive(){
  return document.querySelector('[data-view="chat"]')?.classList.contains("active");
}
function documentScrollTop(){
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}
function messagesScrollable(){
  return messagesEl && messagesEl.scrollHeight > messagesEl.clientHeight + 8;
}
function isMessagesNearBottom(){
  if(!messagesEl)return true;
  return messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<60;
}
function composerNearViewportBottom(){
  const composer=document.querySelector(".composer-dock");
  if(!composer)return true;
  const r=composer.getBoundingClientRect();
  return r.bottom <= window.innerHeight + 40 && r.top < window.innerHeight;
}
function updateScrollBottomButton(){
  if(!scrollBottomBtn)return;
  if(!chatViewActive()){
    scrollBottomBtn.classList.add("hidden");
    return;
  }

  // On chat, keep the button visible whenever there is meaningful transcript
  // content. Dim it slightly when already at the bottom rather than removing it.
  const hasContent=getConversationMessages(activeChat()).length>1 || messagesScrollable();
  scrollBottomBtn.classList.toggle("hidden",!hasContent);
  const alreadyThere=isMessagesNearBottom() && composerNearViewportBottom();
  scrollBottomBtn.classList.toggle("at-bottom",alreadyThere);
  scrollBottomBtn.setAttribute("aria-label",alreadyThere?"Already at latest message":"Scroll to latest message");
}
function scrollMessagesToBottom(behavior="smooth"){
  if(messagesEl){
    messagesEl.scrollTo({top:messagesEl.scrollHeight,behavior});
  }
  const composer=document.querySelector(".composer-dock");
  if(composer){
    // Safari sometimes ignores an internal scroller when the page itself is
    // also scrolled. Bring the composer into view too.
    setTimeout(()=>composer.scrollIntoView({behavior,block:"end"}),30);
  }
  setTimeout(updateScrollBottomButton,260);
}
if(scrollBottomBtn)scrollBottomBtn.addEventListener("click",()=>scrollMessagesToBottom("smooth"));

let lastPageY=documentScrollTop();
let lastMessageY=messagesEl?.scrollTop||0;
let lastTouchY=null;
let chromeHidden=false;
let revealTimer=null;

function setChromeHidden(hidden){
  if(!topbarEl)return;
  chromeHidden=hidden;
  document.body.classList.toggle("chrome-hidden",hidden);
}
function showChromeTemporarily(){
  setChromeHidden(false);
  clearTimeout(revealTimer);
  // If the user is in Chat and not at the very top, the header goes away
  // again after a short pause so it does not eat screen space.
  if(chatViewActive() && documentScrollTop()>28){
    revealTimer=setTimeout(()=>setChromeHidden(true),1100);
  }
}
function reactToScrollDirection(current,previous,source){
  const delta=current-previous;
  if(Math.abs(delta)<3)return;

  const nearTop = source==="page" ? current<22 : (current<8 && documentScrollTop()<22);
  if(nearTop){
    setChromeHidden(false);
    return;
  }

  if(delta>0){
    // Scrolling down = maximize reading space.
    setChromeHidden(true);
  }else{
    // Scrolling up = reveal controls.
    showChromeTemporarily();
  }
}

window.addEventListener("scroll",()=>{
  const current=documentScrollTop();
  reactToScrollDirection(current,lastPageY,"page");
  lastPageY=current;
  updateScrollBottomButton();
},{passive:true});

if(messagesEl){
  messagesEl.addEventListener("scroll",()=>{
    const current=messagesEl.scrollTop;
    reactToScrollDirection(current,lastMessageY,"messages");
    lastMessageY=current;
    updateScrollBottomButton();
  },{passive:true});
}

// Mobile Safari can move the page without producing a useful scroll delta
// soon enough, so also watch the finger direction.
document.addEventListener("touchstart",e=>{
  lastTouchY=e.touches?.[0]?.clientY ?? null;
},{passive:true});

document.addEventListener("touchmove",e=>{
  if(lastTouchY===null)return;
  const y=e.touches?.[0]?.clientY;
  if(typeof y!=="number")return;
  const fingerDelta=y-lastTouchY;
  if(Math.abs(fingerDelta)>5){
    // Finger moving up means content is moving down / user is scrolling down.
    if(fingerDelta<0 && (documentScrollTop()>20 || (messagesEl?.scrollTop||0)>8)){
      setChromeHidden(true);
    }else if(fingerDelta>0){
      showChromeTemporarily();
    }
    lastTouchY=y;
  }
},{passive:true});

document.addEventListener("touchend",()=>{lastTouchY=null},{passive:true});

function renderMessages(){
  const c=activeCharacter(),ch=activeChat();
  messagesEl.innerHTML="";
  ch.messages.forEach((msg,index)=>{
    if(msg.error && /^Connection error: Rate limit exceeded/i.test(msg.text||""))return;

    if(msg.role==="command"||msg.role==="systemnote"){
      const wrap=document.createElement("div");wrap.className="message command-message";
      const body=document.createElement("div");body.className="command-chip";body.textContent=msg.text;
      wrap.append(body);messagesEl.appendChild(wrap);return;
    }

    const wrap=document.createElement("div");
    wrap.className=`message ${msg.role}${msg.error?" error":""}`;
    const meta=document.createElement("div");meta.className="meta";
    meta.textContent=msg.role==="user"?"YOU":(c.name||"NOCTIS").toUpperCase();
    const body=document.createElement("div");body.className="message-body";body.textContent=msg.text;
    wrap.append(meta,body);

    if(msg.role==="user"&&!msg.error){
      const tools=document.createElement("div");tools.className="message-tools";
      const editBtn=document.createElement("button");editBtn.type="button";editBtn.className="ghost";editBtn.textContent="Edit";
      editBtn.addEventListener("click",()=>{
        if(wrap.querySelector(".message-edit"))return;
        body.classList.add("hidden");tools.classList.add("hidden");
        const editor=document.createElement("textarea");editor.className="message-edit";editor.value=msg.text;
        const actions=document.createElement("div");actions.className="message-edit-actions";
        const cancel=document.createElement("button");cancel.type="button";cancel.className="ghost small";cancel.textContent="Cancel";
        const save=document.createElement("button");save.type="button";save.className="send small";save.textContent="Save";
        cancel.addEventListener("click",()=>{editor.remove();actions.remove();body.classList.remove("hidden");tools.classList.remove("hidden")});
        save.addEventListener("click",()=>{
          const revised=editor.value.trim();if(!revised){alert("A message cannot be empty.");return}
          msg.text=revised;msg.edited=true;msg.editedAt=now();ch.updatedAt=now();saveVault();renderMessages();
        });
        actions.append(cancel,save);wrap.append(editor,actions);editor.focus();editor.setSelectionRange(editor.value.length,editor.value.length);
      });
      tools.append(editBtn);wrap.append(tools);
    }
    if(msg.edited){const edited=document.createElement("div");edited.className="meta";edited.textContent="EDITED";wrap.append(edited)}
    messagesEl.appendChild(wrap);
  });
  messagesEl.scrollTop=messagesEl.scrollHeight;lastMessageScrollTop=messagesEl.scrollTop;updateScrollBottomButton();
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

ACTIVE USER PERSONA — CANON FOR THIS TIMELINE
${personaPrompt()}

SHARED CANON MEMORY
${c.permanentMemory || "(none)"}

CONSOLIDATED OLDER HISTORY
${ch.consolidatedMemory || "(none)"}

ACTIVE TIMELINE MEMORY
${ch.relationshipMemory || "(none)"}

ACTIVE CHAT
${ch.title || "Main Story"}

CAST FOCUS
${ch.castFocus || "(none — use the full active cast as appropriate)"}

CURRENT SCENE
Location: ${ch.scene.location || "(unspecified)"}
Time / Atmosphere: ${ch.scene.time || "(unspecified)"}
Scene State: ${ch.scene.state || "(unspecified)"}
Emotional State: ${ch.scene.emotion || "(unspecified)"}

SHARED LOREBOOK
${lore}

OPEN THREADS FOR THIS TIMELINE
${threads}

GLOBAL HARD LIMITS — ABSOLUTE
${settings.hardLimits || defaultSettings.hardLimits}

HARD-LIMIT ENFORCEMENT
- The listed hard limits apply across every character, cast, timeline, and scene.
- Never have an NPC propose, request, threaten, fantasize about, initiate, normalize, or escalate toward a listed hard limit.
- Never eroticize a listed hard limit.
- Do not test the boundary by offering a "milder" version of the same prohibited act.
- If a scene naturally approaches a hard limit, redirect the NPC toward a different action that fits the character and tone without breaking immersion.
- Do not repeatedly mention the hard limit or turn the RP into a safety lecture.
- User-created OOC edits can change the list in Settings, but ordinary in-character dialogue does not override it.

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
- BODY/PERSPECTIVE CONSISTENCY: Never reverse physical roles when switching between narration and dialogue. Track who is touching, holding, carrying, wearing, penetrating, containing, or positioned inside whom. First-person dialogue must preserve the same physical relationship already established by the scene.
- Do not silently reset arguments, intimacy, danger, promises, emotional consequences, or unresolved events.
- For a multi-character cast, keep each character's voice, knowledge, motives, actions, and dialogue distinct.
- Take meaningful initiative as the character(s), but hand control back to the user as soon as their protagonist must respond.
- Write coherent, concrete prose. Every sentence must logically connect to the scene. Avoid contradictory metaphors, generic filler, and invented callbacks.
- Dialogue should sound like the established character, not like an assistant, therapist, narrator explaining consent, or generic romance prose.
- Remain in character unless the user explicitly requests out-of-character discussion.

The model is the actor. Noctis owns canon and continuity. The user's protagonist remains theirs.`;
}
function apiMessages(extraSystem=""){
  const ch=activeChat();
  const all=getConversationMessages(ch);
  let live;
  if(ch.consolidatedThroughMessageId){
    const idx=all.findIndex(m=>m.id===ch.consolidatedThroughMessageId);
    live=idx>=0?all.slice(idx+1):all.slice(-40);
  }else live=all.slice(-40);

  const out=[{role:"system",content:compileSystemPrompt()},...live.map(m=>({role:m.role,content:m.text}))];
  if(extraSystem)out.push({role:"system",content:extraSystem});
  return out;
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

  // Up to 3 tries with the SAME selected model.
  // This preserves character consistency while smoothing over flaky free-provider responses.
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),45000);

    try{
      const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${settings.apiKey}`,
          "Content-Type":"application/json",
          "HTTP-Referer":location.href,
          "X-Title":"Noctis Mourning Vale"
        },
        body:JSON.stringify(payload),
        signal:controller.signal
      });

      clearTimeout(timeout);
      const data=await response.json().catch(()=>({}));

      if(response.ok){
        const text=data?.choices?.[0]?.message?.content;

        if(text && String(text).trim()){
          return String(text).trim();
        }

        // Some free providers occasionally return a successful envelope with no text.
        // Treat that as transient and quietly retry the SAME model.
        lastError=new Error("The provider returned an empty reply.");
        if(attempt<2){
          await new Promise(r=>setTimeout(r,700 + attempt*500));
          continue;
        }
        throw lastError;
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

      if(attempt<2 && [408,429,500,502,503,504].includes(Number(response.status))){
        await new Promise(r=>setTimeout(r,900 + attempt*500));
        continue;
      }

      throw lastError;
    }catch(err){
      clearTimeout(timeout);

      if(err?.name==="AbortError"){
        lastError=new Error("The model provider did not answer within 45 seconds.");
        if(attempt<2){
          await new Promise(r=>setTimeout(r,700 + attempt*500));
          continue;
        }
        throw lastError;
      }

      lastError=err;
      if(attempt<2 && /fetch|network|load failed|empty reply/i.test(String(err?.message||err))){
        await new Promise(r=>setTimeout(r,800 + attempt*500));
        continue;
      }

      throw err;
    }
  }

  throw lastError||new Error("Unknown OpenRouter error.");
}

async function generateDirectedContinuation(mode){
  const ch=activeChat();
  const last=ch.messages.at(-1);
  if(!last || last.role!=="assistant"){
    alert("There needs to be a character reply to continue from.");
    return;
  }

  const btn = mode==="elaborate" ? $("elaborateBtn") : $("continueBtn");
  btn.disabled=true;
  $("connectionStatus").textContent=mode==="elaborate" ? "elaborating…" : "continuing…";

  const instruction = mode==="elaborate"
    ? `ENGINE-ONLY INSTRUCTION: Elaborate on the character/world side of the CURRENT MOMENT without changing what the user's protagonist has done. Add richer NPC expression, dialogue, atmosphere, physical detail, subtext, or relevant world detail. Do not repeat the previous reply verbatim. Do not move the user's protagonist, decide for them, narrate their sensations/reactions, or assume they answered. Do not advance past a point where the protagonist must act or respond. Stop there and hand the turn back to the user.`
    : `ENGINE-ONLY INSTRUCTION: Continue the character/world side of the current turn. The user is asking for more from the NPC/world before taking their own turn. Continue only with NPC actions, dialogue, environmental events, or consequences that do NOT require assuming any action, reaction, choice, sensation, or dialogue from the user's protagonist. The instant the protagonist must respond or act, STOP and hand the turn back to the user.`;

  try{
    const msgs=apiMessages();
    msgs.push({role:"system",content:instruction});
    const reply=await openRouterRequest(msgs);
    ch.messages.push({id:uid(),role:"assistant",text:reply,continuationMode:mode});
    ch.updatedAt=now();
    saveVault();
    renderMessages();
    $("connectionStatus").textContent=`connected • ${settings.model}`;
    maybeAutoSaveMilestone();
  }catch(err){
    $("connectionStatus").textContent="temporary model hiccup • try again";
    console.warn("Noctis continuation error:", err);
  }finally{
    btn.disabled=false;
  }
}


async function generateMyTurn(){
  const ch=activeChat();
  const c=activeCharacter();
  const last=ch.messages.at(-1);

  if(!last || last.role!=="assistant"){
    alert("Generate My Turn works after the character has replied.");
    return;
  }

  const btn=$("generateMyTurnBtn");
  btn.disabled=true;
  $("connectionStatus").textContent="drafting your turn…";

  const instruction=`You are drafting the USER PROTAGONIST'S NEXT ROLEPLAY TURN for the user to review before sending.

ACTIVE PROTAGONIST:
The user's protagonist in this RP. Use only details established in the chat, memory, lore, and existing user messages.

DRAFTING RULES:
- Write ONLY the protagonist's next turn, not the NPC's reply afterward.
- Match the user's established prose style, tense, formatting, dialogue habits, and typical length from their recent user messages.
- Preserve canon and current physical continuity.
- Do not invent major new backstory, powers, injuries, relationship milestones, consent, promises, or irreversible decisions.
- Do not force a dramatic choice the user has not implied.
- It is fine to respond to the NPC's latest action/dialogue, add protagonist dialogue, voluntary movement, thoughts, emotion, or action because THIS MODE exists specifically to draft the user's turn.
- Keep the draft editable and natural rather than overly polished or generic.
- Do not prepend labels such as "Amanda:" or "User:".
- Do not explain the draft.
- Do not continue into the NPC's next turn.

GLOBAL HARD LIMITS:
${settings.hardLimits||defaultSettings.hardLimits}

Never draft the protagonist initiating, requesting, accepting, fantasizing about, or escalating toward any listed hard limit.

USER'S MY-TURN STYLE PREFERENCE:
${settings.userTurnStyle||defaultSettings.userTurnStyle}`;

  try{
    const msgs=apiMessages();
    msgs.push({role:"system",content:instruction});
    msgs.push({role:"user",content:"Draft my next turn only."});

    const draft=await openRouterRequest(
      msgs,
      Math.min(Number(settings.maxTokens||900),700),
      Math.min(Number(settings.temperature??0.85),1.0)
    );

    $("messageInput").value=draft.trim();
    $("messageInput").focus();
    $("messageInput").setSelectionRange($("messageInput").value.length,$("messageInput").value.length);
    $("connectionStatus").textContent=`draft ready • ${settings.model}`;
  }catch(err){
    $("connectionStatus").textContent="draft generator needs attention";
    alert(`Could not generate your turn: ${err?.message||String(err)}`);
  }finally{
    btn.disabled=false;
  }
}


function addCommandChip(text){
  activeChat().messages.push({id:uid(),role:"command",text,createdAt:now()});
  activeChat().updatedAt=now();saveVault();renderMessages();
}
function addManualMemory(text){
  const ch=activeChat(),clean=text.trim();if(!clean)return;
  if(!ch.milestones.some(m=>m.text.toLowerCase()===clean.toLowerCase())){
    ch.milestones.push({id:uid(),text:clean,createdAt:now(),source:"command"});
    syncMilestonesToMemory();renderMilestones();
  }
  saveVault();
}
function addPermanentCanon(text){
  const c=activeCharacter(),clean=text.trim();if(!clean)return;
  if(!(c.permanentMemory||"").toLowerCase().includes(clean.toLowerCase())){
    c.permanentMemory=[(c.permanentMemory||"").trim(),`- ${clean}`].filter(Boolean).join("\n");
    if($("memoryPermanent"))$("memoryPermanent").value=c.permanentMemory;
  }
  saveVault();
}
function forgetMemory(q){
  q=q.trim().toLowerCase();if(!q)return 0;
  const ch=activeChat();const before=ch.milestones.length;
  ch.milestones=ch.milestones.filter(m=>!m.text.toLowerCase().includes(q));
  if((ch.consolidatedMemory||"").toLowerCase().includes(q)){
    ch.consolidatedMemory=ch.consolidatedMemory.split("\n").filter(line=>!line.toLowerCase().includes(q)).join("\n").trim();
  }
  syncMilestonesToMemory();renderMilestones();renderConsolidatedMemory();saveVault();
  return before-ch.milestones.length;
}
function localStatusText(){
  const c=activeCharacter(),ch=activeChat(),p=activePersona();
  return `STATUS • ${c.name} • ${ch.title} • Persona: ${p?.name||"None"} • Scene: ${ch.scene.location||"unspecified"} • ${ch.scene.time||"time unspecified"} • Cast focus: ${ch.castFocus||"full cast"} • Open threads: ${ch.threads.length} • Compact memory: ${ch.consolidatedMemory?"yes":"no"} • Recent live messages: ${unconsolidatedMessages(ch).length}`;
}
async function handleChatCommand(text){
  const first=text.indexOf(" ");const cmd=(first===-1?text:text.slice(0,first)).toLowerCase();const arg=(first===-1?"":text.slice(first+1)).trim();
  const ch=activeChat();

  if(cmd==="/continue"){addCommandChip("CONTINUE");await generateDirectedContinuation("continue");return true}
  if(cmd==="/elaborate"){addCommandChip("ELABORATE");await generateDirectedContinuation("elaborate");return true}
  if(cmd==="/ooc"){
    if(!arg){addCommandChip("OOC requires an instruction.");return true}
    addCommandChip(`OOC • ${arg}`);
    await generateReply(`ENGINE-ONLY OOC INSTRUCTION: ${arg}\nThis is direction from the user, not dialogue or canon. Follow it for the next reply without treating the instruction itself as something the protagonist said or did.`);
    return true;
  }
  if(cmd==="/timeskip"){
    if(!arg){addCommandChip("TIMESKIP requires an amount or destination, e.g. /timeskip 3 hours.");return true}
    ch.scene.time=arg;if($("sceneTime"))$("sceneTime").value=arg;addCommandChip(`TIME SKIP • ${arg}`);
    await generateReply(`ENGINE-ONLY TIME SKIP: Advance the scene by ${arg}. Bridge time only with NPC/world events that do not invent actions, dialogue, feelings, or decisions for the user's protagonist. Re-establish the scene and stop at the next protagonist response point.`);
    return true;
  }
  if(cmd==="/rewind"){
    let n=parseInt(arg||"2",10);if(!Number.isFinite(n)||n<1)n=2;n=Math.min(n,ch.messages.length);
    ch.messages.splice(Math.max(0,ch.messages.length-n),n);ch.updatedAt=now();saveVault();renderMessages();
    addCommandChip(`REWIND • removed ${n} message${n===1?"":"s"}`);return true;
  }
  if(cmd==="/scene"){
    if(!arg){addCommandChip(`SCENE • ${ch.scene.state||"(unset)"}`);return true}
    ch.scene.state=arg;if($("sceneState"))$("sceneState").value=arg;ch.updatedAt=now();saveVault();addCommandChip(`SCENE SET • ${arg}`);return true;
  }
  if(cmd==="/memory"){
    if(!arg){addCommandChip("MEMORY requires a concise continuity fact.");return true}
    addManualMemory(arg);addCommandChip(`MEMORY SAVED • ${arg}`);return true;
  }
  if(cmd==="/forget"){
    if(!arg){addCommandChip("FORGET requires words matching the saved memory.");return true}
    const n=forgetMemory(arg);addCommandChip(`MEMORY REMOVAL • ${n} milestone${n===1?"":"s"} matched "${arg}"`);return true;
  }
  if(cmd==="/canon"){
    if(!arg){addCommandChip("CANON requires a hard continuity fact.");return true}
    addPermanentCanon(arg);addCommandChip(`CANON ADDED • ${arg}`);return true;
  }
  if(cmd==="/persona"){
    if(!arg){addCommandChip(`PERSONA • ${activePersona()?.name||"None"}`);return true}
    const target=vault.personas.find(p=>p.name.toLowerCase()===arg.toLowerCase())||vault.personas.find(p=>String(p.slot)===arg);
    if(!target){addCommandChip(`PERSONA NOT FOUND • ${arg}`);return true}
    ch.activePersonaId=target.id;ch.updatedAt=now();saveVault();renderPersonas();renderPersonaFields();renderPersonaBadge();addCommandChip(`PERSONA SWITCHED • ${target.name}`);return true;
  }
  if(cmd==="/cast"){ch.castFocus=arg;ch.updatedAt=now();saveVault();addCommandChip(arg?`CAST FOCUS • ${arg}`:"CAST FOCUS CLEARED • full cast");return true}
  if(cmd==="/status"){addCommandChip(localStatusText());return true}
  if(cmd==="/summary"){
    addCommandChip("SUMMARY • generating concise current-state recap");
    try{
      const summary=await openRouterRequest(apiMessages(`ENGINE-ONLY TASK: Summarize the current roleplay state in concise bullets. Include relationship status, immediate scene/physical continuity, important knowledge, promises/consequences, and unresolved threads. Do not invent anything and do not advance the story.`),500,0.1);
      ch.messages.push({id:uid(),role:"systemnote",text:`CURRENT SUMMARY\n${summary}`,createdAt:now()});ch.updatedAt=now();saveVault();renderMessages();
    }catch(err){addCommandChip(`SUMMARY FAILED • ${err?.message||String(err)}`)}
    return true;
  }
  addCommandChip(`UNKNOWN COMMAND • ${cmd}`);return true;
}

async function generateReply(extraSystem=""){
  const send=$("sendBtn");
  send.disabled=true;
  send.textContent="…";
  $("connectionStatus").textContent="thinking…";
  try{
    const reply=await openRouterRequest(apiMessages(extraSystem));
    activeChat().messages.push({id:uid(),role:"assistant",text:reply});
    activeChat().updatedAt=now();
    saveVault();
    renderMessages();
    $("connectionStatus").textContent=`connected • ${settings.model}`;
    maybeAutoSaveMilestone();
  }catch(err){
    const msg=String(err?.message||err);
    if(/rate limit|free-models-per-day|code:\s*429|code: 429/i.test(msg)){
      $("connectionStatus").textContent="daily free-model limit reached";
    }else{
      $("connectionStatus").textContent="temporary model hiccup • tap Regen";
    }
    console.warn("Noctis model error:", err);
  }finally{
    send.disabled=false;
    send.textContent="Send";
  }
}
$("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const input=$("messageInput"),text=input.value.trim();if(!text)return;
  input.value="";
  if(text.startsWith("/")){await handleChatCommand(text);return}
  activeChat().messages.push({id:uid(),role:"user",text});activeChat().updatedAt=now();saveVault();renderMessages();updateConsolidationStatus();
  await generateReply();
});
$("continueBtn").addEventListener("click",()=>generateDirectedContinuation("continue"));
$("elaborateBtn").addEventListener("click",()=>generateDirectedContinuation("elaborate"));
$("generateMyTurnBtn").addEventListener("click",generateMyTurn);

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
  a.href=url;a.download=`noctis-vault-backup-v0.7-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
});
$("importInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const raw=await file.text();
    if(file.name.toLowerCase().endsWith(".txt")){
      const ch=activeChat();
      ch.messages.push({id:uid(),role:"assistant",text:`[Imported transcript archive: ${file.name}]\n\n${raw}`});
      ch.updatedAt=now();saveVault();renderAll();alert("Text transcript archived in the active chat. Structured transcript parsing is coming next.");
    }else{
      const parsed=JSON.parse(raw);
      if(parsed?.format==="noctis-persona" && parsed?.persona){
        const p=applyPersonaImport(parsed.persona);
        renderAll();
        alert(`Persona imported into slot ${p.slot}: ${p.name||`Persona ${p.slot}`}`);
      }
      else if(parsed?.persona && typeof parsed.persona==="object" && !Array.isArray(parsed.characters)){
        const p=applyPersonaImport(parsed.persona);
        renderAll();
        alert(`Persona imported into slot ${p.slot}: ${p.name||`Persona ${p.slot}`}`);
      }
      else if(parsed?.name && (parsed?.appearance!==undefined || parsed?.personality!==undefined || parsed?.canon!==undefined) && !Array.isArray(parsed.characters)){
        const p=applyPersonaImport(parsed);
        renderAll();
        alert(`Persona imported into slot ${p.slot}: ${p.name||`Persona ${p.slot}`}`);
      }
      else if((["0.3","0.4","0.7"].includes(parsed?.version))&&Array.isArray(parsed.characters)){vault=parsed;normalizeVaultV07();saveVault();renderAll();alert("Vault import complete.")}
      else if(parsed?.character||parsed?.messages){vault=migrateLegacy(parsed);saveVault();renderAll();alert("Legacy import complete.")}
      else throw new Error("Unknown Noctis format");
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
  ch.messages.push(...items.map(x=>({id:uid(),role:x.role,text:x.text,archivedImport:true})));
  ch.updatedAt=now();
  saveVault();
  $("rescueText").value="";
  $("rescuePreview").classList.add("hidden");
  renderMessages();
  alert("Transcript imported into the active chat.");
  selectTab("chat");
});

function renderAll(){normalizeVaultV07();renderLibrary();renderBasics();renderPersonas();renderPersonaFields();renderPersonaBadge();renderContextLists();renderMilestones();renderConsolidatedMemory();renderMessages();renderChatList()}
bindBasics();bindPersonaFields();renderAll();saveVault();
