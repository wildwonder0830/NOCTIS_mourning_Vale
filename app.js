const NOCTIS_BUILD="0.7.5";
const STORAGE_KEY="noctis-mourning-vale-v0.3";
const LEGACY_KEY="noctis-mourning-vale-v0.2";
const SETTINGS_KEY="noctis-private-settings-v0.4";
const LEGACY_SETTINGS_KEYS=[
  "noctis-private-settings-v0.2.1",
  "noctis-private-settings-v0.2"
];

const LARGE_VAULT_MARKER="noctis-large-vault-idb-v1";
const LARGE_VAULT_DB="noctis-large-vault";
const LARGE_VAULT_STORE="state";
let largeVaultMode=false;
let pendingLargeVaultLoad=null;
let largeVaultWriteQueue=Promise.resolve();

function openLargeVaultDb(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==="undefined"){reject(new Error("IndexedDB is unavailable in this browser."));return}
    const req=indexedDB.open(LARGE_VAULT_DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(LARGE_VAULT_STORE))db.createObjectStore(LARGE_VAULT_STORE)};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("Could not open large-vault storage."));
  });
}
async function readLargeVaultFromIdb(){
  const db=await openLargeVaultDb();
  return await new Promise((resolve,reject)=>{
    const tx=db.transaction(LARGE_VAULT_STORE,"readonly");
    const req=tx.objectStore(LARGE_VAULT_STORE).get("vault");
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error||new Error("Could not read the large vault."));
    tx.oncomplete=()=>db.close();
  });
}
function queueLargeVaultWrite(serialized){
  largeVaultMode=true;
  largeVaultWriteQueue=largeVaultWriteQueue
    .catch(()=>{})
    .then(async()=>{
      const db=await openLargeVaultDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(LARGE_VAULT_STORE,"readwrite");
        tx.objectStore(LARGE_VAULT_STORE).put(serialized,"vault");
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error("Could not save the large vault."));
        tx.onabort=()=>reject(tx.error||new Error("Large-vault save was aborted."));
      });
      db.close();
      try{
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(LARGE_VAULT_MARKER,"1");
      }catch{}
    });
  return largeVaultWriteQueue;
}

const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const now=()=>new Date().toISOString();

function newChat(title="Main Story"){
  return {
    id:uid(),title,messages:[],relationshipMemory:"",milestones:[],
    consolidatedMemory:"",consolidatedThroughMessageId:null,
    knowledgeLedger:{known:"",unknown:"",recent:"",doNotAsk:""},
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

const CAST_MEMBER_STRING_FIELDS=[
  "name","role","personality","backstory","voice","directives","permanentMemory","migrationNotes",
  "species","height","weight","build","eyeColor","hairColor","hairStyle","skinTone",
  "distinguishingFeatures","apparentAge","actualAge","currentForm"
];

function newCastMember(name="New Character"){
  return {
    id:uid(),name,role:"",personality:"",backstory:"",voice:"",
    directives:[
      "Never narrate the user's thoughts, dialogue, decisions, emotions, bodily reactions, or voluntary actions.",
      "Preserve established canon, scene geography, physical positions, clothing, injuries, objects, and elapsed time.",
      "Take initiative as the character instead of waiting passively.",
      "Do not invent prior events or personal history and present them as established facts.",
      "Keep this character's knowledge, voice, relationship history, and physical position separate from every other cast member."
    ].join("\n"),
    permanentMemory:"",migrationNotes:"",relationshipDynamic:"",
    createdAt:now(),updatedAt:now()
  };
}

function castMemberFromLegacy(c){
  const m=newCastMember(c?.name||"Character 1");
  CAST_MEMBER_STRING_FIELDS.forEach(key=>{
    if(typeof c?.[key]==="string")m[key]=c[key];
  });
  if(c?.profileSheet && typeof c.profileSheet==="object")m.profileSheet=clone(c.profileSheet);
  return m;
}

function sameLegacyCastCore(c,m){
  if(!c||!m)return false;
  const keys=["name","role","personality","backstory","voice","directives","permanentMemory","migrationNotes"];
  return keys.every(key=>String(c?.[key]||"")===String(m?.[key]||""));
}

/*
  CAST SAFETY CONTRACT
  --------------------
  The existing RP character object (c) is ALWAYS the primary bot sheet.
  Extra sheets are additive only. We never migrate, replace, or delete the
  original character fields just to enable a multi-bot RP.

  v0.17.14 briefly auto-cloned the primary character into castMembers.
  If that untouched mirror is encountered, preserve it in storage but mark it
  hidden so no user data is destroyed and it cannot appear as a duplicate.
*/
function ensureCastMembers(c){
  if(!c || typeof c!=="object")return [];
  if(!Array.isArray(c.castMembers))c.castMembers=[];
  c.castMembers=c.castMembers.filter(x=>x&&typeof x==="object");
  c.castMembers.forEach((m,i)=>{
    m.id=m.id||uid();
    m.name=typeof m.name==="string"&&m.name.trim()?m.name:`Character ${i+2}`;
    CAST_MEMBER_STRING_FIELDS.forEach(key=>{if(typeof m[key]!=="string")m[key]=""});
    if(typeof m.relationshipDynamic!=="string")m.relationshipDynamic="";
    m.updatedAt=m.updatedAt||now();
    m.createdAt=m.createdAt||m.updatedAt;
  });
  const first=c.castMembers[0];
  if(first && first.legacyPrimaryMirror!==false && sameLegacyCastCore(c,first)){
    first.legacyPrimaryMirror=true;
  }
  return c.castMembers;
}

function supplementalCastMembers(c=activeCharacter()){
  return ensureCastMembers(c).filter(m=>m.legacyPrimaryMirror!==true);
}

function allCastMembers(c=activeCharacter()){
  if(!c)return [];
  return [c,...supplementalCastMembers(c)];
}

function activeCastMember(c=activeCharacter()){
  if(!c)return null;
  const extras=supplementalCastMembers(c);
  return extras.find(m=>m.id===c.activeCastMemberId)||c;
}

function sceneCastMembers(c=activeCharacter(),ch=activeChat()){
  const members=allCastMembers(c);
  const roster=Array.isArray(ch?.sceneCast)?ch.sceneCast:[];
  const ids=new Set(roster.map(x=>x?.castMemberId).filter(Boolean));
  const names=new Set(roster.map(x=>String(x?.name||"").trim().toLowerCase()).filter(Boolean));
  const present=members.filter(m=>ids.has(m.id)||names.has(String(m.name||"").trim().toLowerCase()));
  if(present.length)return present;
  /*
    Legacy timelines may not have a linked scene roster yet. Fall back to the
    primary bot only when there are no explicit linked bot sheets.
  */
  return roster.length?[]:[c].filter(Boolean);
}

function isCastMemberInScene(member,ch=activeChat()){
  if(!member)return false;
  const roster=Array.isArray(ch?.sceneCast)?ch.sceneCast:[];
  return roster.some(x=>x?.castMemberId===member.id || String(x?.name||"").trim().toLowerCase()===String(member.name||"").trim().toLowerCase());
}

function setCastMemberInScene(member,present,ch=activeChat()){
  if(!member)return;
  if(!Array.isArray(ch.sceneCast))ch.sceneCast=[];
  if(present){
    const existing=ch.sceneCast.find(x=>x?.castMemberId===member.id || String(x?.name||"").trim().toLowerCase()===String(member.name||"").trim().toLowerCase());
    if(existing){
      existing.castMemberId=member.id;
      existing.name=member.name||existing.name;
      if(!existing.species)existing.species=member.species||"";
      existing.updatedAt=now();
    }else{
      ch.sceneCast.push({id:uid(),castMemberId:member.id,name:member.name||"Unnamed",species:member.species||"",health:"",clothing:"",status:"",notes:"",updatedAt:now()});
    }
  }else{
    ch.sceneCast=ch.sceneCast.filter(x=>x?.castMemberId!==member.id && String(x?.name||"").trim().toLowerCase()!==String(member.name||"").trim().toLowerCase());
  }
  ch.updatedAt=now();
  saveVault();
}

function castSheetFromImportedCharacter(src){
  if(!src||typeof src!=="object")throw new Error("That file does not contain a character sheet.");
  const name=String(src.name||src.char_name||src.character_name||"Imported Character").trim()||"Imported Character";
  const m=newCastMember(name);
  const aliases={
    role:["role","archetype","occupation","title"],
    personality:["personality","personalitySummary","personality_summary","traits"],
    backstory:["backstory","history","biography","bio","background","description"],
    voice:["voice","speech","speech_style","voice_and_speech","dialogue_style"],
    directives:["directives","response_directives","system_prompt","system_instructions","instructions"],
    permanentMemory:["permanentMemory","permanent_memory","canon","continuity","continuity_notes"],
    migrationNotes:["migrationNotes","migration_notes","notes","creator_notes"],
    relationshipDynamic:["relationshipDynamic","relationship_dynamic","dynamic","relationship"]
  };
  for(const [target,keys] of Object.entries(aliases)){
    for(const key of keys){
      if(typeof src[key]==="string"&&src[key].trim()){m[target]=src[key].trim();break}
    }
  }
  for(const key of ["species","height","weight","build","eyeColor","hairColor","hairStyle","skinTone","distinguishingFeatures","apparentAge","actualAge","currentForm"]){
    if(typeof src[key]==="string")m[key]=src[key];
  }
  if(src.profileSheet&&typeof src.profileSheet==="object")m.profileSheet=clone(src.profileSheet);
  if(Array.isArray(src.lore))m.lore=clone(src.lore);
  m.importSourceName=String(src.name||name);
  m.updatedAt=now();
  return m;
}

function addImportedCastSheet(parsed,fileName="character.json"){
  const src=parsed?.format==="noctis-character"&&parsed?.character?parsed.character:
    (parsed?.character&&typeof parsed.character==="object"&&!Array.isArray(parsed.characters)?parsed.character:parsed);
  const c=activeCharacter();
  const member=castSheetFromImportedCharacter(src);
  ensureCastMembers(c).push(member);
  c.activeCastMemberId=member.id;
  c.updatedAt=now();
  saveVault();
  renderAll();
  selectTab("character");
  alert(`${member.name} was added as a new bot sheet to ${c.storyName||c.name||"this roleplay"}.\n\nNo chats, personas, or existing character data were replaced.`);
  return member;
}

window.NoctisCastSheets={addImportedCastSheet,castSheetFromImportedCharacter,allCastMembers,supplementalCastMembers};

function newCharacter(name="New Character"){
  const chat=newChat();
  return {
    id:uid(),name,storyName:"",role:"",personality:"",backstory:"",voice:"",
    migrationNotes:"",loveInterests:[],
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
    chats:[chat],activeChatId:chat.id,castMembers:[],activeCastMemberId:null,createdAt:now(),updatedAt:now()
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
    if(localStorage.getItem(LARGE_VAULT_MARKER)==="1" && typeof indexedDB!=="undefined"){
      largeVaultMode=true;
      pendingLargeVaultLoad=readLargeVaultFromIdb();
      return defaultVault();
    }
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
      if(parsed)return parsed;
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

if(pendingLargeVaultLoad){
  const restoringLargeVault=pendingLargeVaultLoad;
  restoringLargeVault.then(raw=>{
    if(!raw)throw new Error("Large-vault storage returned no saved vault.");
    const hydrated=JSON.parse(raw);
    if(!hydrated || !Array.isArray(hydrated.characters))throw new Error("Large-vault data is invalid.");
    vault=hydrated;
    if(pendingLargeVaultLoad===restoringLargeVault)pendingLargeVaultLoad=null;
    normalizeVaultV07();
    try{renderAll()}catch{}
    try{updateConnectionStatus()}catch{}
  }).catch(err=>{
    if(pendingLargeVaultLoad===restoringLargeVault)pendingLargeVaultLoad=null;
    console.error("[Noctis] Could not restore large vault:",err);
    alert("Noctis could not restore the large local vault. No placeholder vault was written over it.");
  });
}

function normalizeVaultV07(){
  ensurePersonas(vault);
  (vault.characters||[]).forEach(c=>{
    ensureCastMembers(c);
    if(!Array.isArray(c.loveInterests))c.loveInterests=[];
    c.loveInterests=c.loveInterests.filter(x=>x&&typeof x==='object').map(x=>({
      id:x.id||uid(),name:typeof x.name==='string'?x.name:'',role:typeof x.role==='string'?x.role:'',
      dynamic:typeof x.dynamic==='string'?x.dynamic:'',voice:typeof x.voice==='string'?x.voice:'',
      continuity:typeof x.continuity==='string'?x.continuity:'',updatedAt:x.updatedAt||now()
    }));
    (c.chats||[]).forEach(ch=>{
      ch.messages=Array.isArray(ch.messages)?ch.messages:[];
      ch.messages.forEach(m=>{if(!m.id)m.id=uid()});
      ch.milestones=Array.isArray(ch.milestones)?ch.milestones:[];
      if(typeof ch.consolidatedMemory!=="string")ch.consolidatedMemory="";
      if(!("consolidatedThroughMessageId" in ch))ch.consolidatedThroughMessageId=null;
      if(!ch.knowledgeLedger || typeof ch.knowledgeLedger!=="object" || Array.isArray(ch.knowledgeLedger))ch.knowledgeLedger={};
      ["known","unknown","recent","doNotAsk"].forEach(k=>{if(typeof ch.knowledgeLedger[k]!=="string")ch.knowledgeLedger[k]=""});
      if(!vault.personas.some(p=>p.id===ch.activePersonaId))ch.activePersonaId=vault.personas[0].id;
      if(typeof ch.castFocus!=="string")ch.castFocus="";
      if(!Array.isArray(ch.sceneCast))ch.sceneCast=[];
      ch.sceneCast.forEach(person=>{
        if(!person || person.castMemberId)return;
        const match=allCastMembers(c).find(m=>String(m.name||"").trim().toLowerCase()===String(person.name||"").trim().toLowerCase());
        if(match)person.castMemberId=match.id;
      });
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

function saveVault(){
  // While IndexedDB hydration is still pending, vault is only the temporary
  // default placeholder. Never persist that placeholder over the real large vault.
  if(pendingLargeVaultLoad)return;
  vault.updatedAt=now();
  const serialized=JSON.stringify(vault);
  if(largeVaultMode){
    queueLargeVaultWrite(serialized);
    return;
  }
  try{
    localStorage.setItem(STORAGE_KEY,serialized);
  }catch(err){
    const quota=err?.name==="QuotaExceededError" || err?.name==="NS_ERROR_DOM_QUOTA_REACHED" || /quota|storage/i.test(String(err?.message||err));
    if(!quota)throw err;
    queueLargeVaultWrite(serialized).catch(e=>console.error("[Noctis] Large-vault fallback failed:",e));
  }
}
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
    const cast=allCastMembers(c);
    card.querySelector("h3").textContent=c.storyName||c.name||"Untitled";
    card.querySelector("p").textContent=cast.map(m=>m.name||"Unnamed").join(" • ")||"Character cast";
    card.querySelector(".card-meta").textContent=`${cast.length} bot sheet${cast.length===1?"":"s"} • ${c.chats.length} chat${c.chats.length===1?"":"s"} • ${turns} saved message${turns===1?"":"s"}`;
    card.addEventListener("click",()=>{vault.activeCharacterId=c.id;saveVault();renderAll();selectTab("chat")});
    list.appendChild(card);
  });
}
function renderBasics(){
  const c=activeCharacter(),member=activeCastMember(c),ch=activeChat();
  if($("storyName"))$("storyName").value=c.storyName||c.name||"";
  $("charName").value=member?.name||"";$("charRole").value=member?.role||"";if($("charRelationshipDynamic"))$("charRelationshipDynamic").value=member?.relationshipDynamic||"";$("charPersonality").value=member?.personality||"";
  $("charBackstory").value=member?.backstory||"";$("charVoice").value=member?.voice||"";$("charDirectives").value=member?.directives||"";
  $("memoryPermanent").value=member?.permanentMemory||"";$("memoryRelationship").value=ch.relationshipMemory||"";
  if($("knowledgeKnown"))$("knowledgeKnown").value=ch.knowledgeLedger?.known||"";
  if($("knowledgeUnknown"))$("knowledgeUnknown").value=ch.knowledgeLedger?.unknown||"";
  if($("knowledgeRecent"))$("knowledgeRecent").value=ch.knowledgeLedger?.recent||"";
  if($("knowledgeDoNotAsk"))$("knowledgeDoNotAsk").value=ch.knowledgeLedger?.doNotAsk||"";
  if($("migrationNotes"))$("migrationNotes").value=member?.migrationNotes||"";
  renderCastMemberTabs();
  renderLoveInterests();
  $("sceneLocation").value=ch.scene.location||"";$("sceneTime").value=ch.scene.time||"";
  $("sceneState").value=ch.scene.state||"";$("sceneEmotion").value=ch.scene.emotion||"";
  $("chatCharacterName").textContent=c.storyName||c.name||"Noctis";$("characterEditorTitle").textContent=`${c.storyName||c.name||"Roleplay"} • ${member?.name||"Character"}`;
  $("activeChatTitle").textContent=ch.title||"Main Story";
  $("apiKey").value=settings.apiKey||"";$("modelName").value=settings.model||defaultSettings.model;
  $("temperature").value=settings.temperature??0.85;$("maxTokens").value=settings.maxTokens??900;
  if($("userTurnStyle"))$("userTurnStyle").value=settings.userTurnStyle||defaultSettings.userTurnStyle;
  if($("hardLimits"))$("hardLimits").value=settings.hardLimits||defaultSettings.hardLimits;
  if($("autoMemory"))$("autoMemory").checked=settings.autoMemory!==false;
  updateConnectionStatus();
  updateMemoryStatus();
}

function renderCastMemberTabs(){
  const c=activeCharacter(),host=$("castMemberTabs");
  if(!host)return;
  const members=allCastMembers(c),active=activeCastMember(c),ch=activeChat();
  host.innerHTML="";
  members.forEach((member,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className=`cast-member-tab${member.id===active?.id?" active":""}${isCastMemberInScene(member,ch)?" in-scene":""}`;
    button.innerHTML=`<span>${member.name||`Character ${index+1}`}</span><small>${isCastMemberInScene(member,ch)?"IN SCENE":"OFF SCENE"}</small>`;
    button.addEventListener("click",()=>{
      c.activeCastMemberId=member.id;c.updatedAt=now();saveVault();renderAll();selectTab("character");
    });
    host.appendChild(button);
  });
  const sceneToggle=$("castMemberInScene");
  if(sceneToggle){
    sceneToggle.checked=!!active&&isCastMemberInScene(active,ch);
    sceneToggle.disabled=!active;
  }
  const deleteBtn=$("deleteCastMemberBtn");
  if(deleteBtn)deleteBtn.disabled=!active || active===c;
}

function renderLoveInterests(){
  const host=$("loveInterestList"); if(!host)return;
  const c=activeCharacter(); if(!Array.isArray(c.loveInterests))c.loveInterests=[];
  host.innerHTML="";
  if(!c.loveInterests.length){const empty=document.createElement("p");empty.className="hint love-empty";empty.textContent="No additional love interests yet. Add one when the story becomes an ensemble.";host.append(empty);return}
  c.loveInterests.forEach((person,index)=>{
    const card=document.createElement("article");card.className="love-interest-card";
    card.innerHTML=`<div class="section-title-row"><strong>Love interest ${index+1}</strong><button class="ghost danger small" type="button">Remove</button></div>
      <div class="field-grid"><label>Name<input class="li-name" placeholder="Name" /></label><label>Role / identity<input class="li-role" placeholder="Vampire, rival, husband…" /></label></div>
      <label>Relationship dynamic<input class="li-dynamic" placeholder="Fated mate, rival, second chance…" /></label>
      <label>Voice &amp; behavior<textarea class="li-voice" rows="3" placeholder="How this person speaks, acts, and differs from the others."></textarea></label>
      <label>Continuity notes<textarea class="li-continuity" rows="3" placeholder="Promises, boundaries, history, current status…"></textarea></label>`;
    const map={".li-name":"name",".li-role":"role",".li-dynamic":"dynamic",".li-voice":"voice",".li-continuity":"continuity"};
    Object.entries(map).forEach(([selector,key])=>{const input=card.querySelector(selector);input.value=person[key]||"";input.addEventListener("input",e=>{person[key]=e.target.value;person.updatedAt=now();saveVault()})});
    card.querySelector("button").addEventListener("click",()=>{c.loveInterests.splice(index,1);c.updatedAt=now();saveVault();renderLoveInterests()});
    host.append(card);
  });
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

  if($("storyName"))$("storyName").addEventListener("input",e=>{
    const c=activeCharacter();c.storyName=e.target.value;c.updatedAt=now();saveVault();
    $("chatCharacterName").textContent=e.target.value||c.name||"Noctis";renderLibrary();
  });
  const charMap={charName:"name",charRole:"role",charRelationshipDynamic:"relationshipDynamic",charPersonality:"personality",charBackstory:"backstory",charVoice:"voice",charDirectives:"directives"};
  Object.entries(charMap).forEach(([id,key])=>$(id).addEventListener("input",e=>{
    const c=activeCharacter(),member=activeCastMember(c);if(!member)return;
    member[key]=e.target.value;member.updatedAt=now();c.updatedAt=now();saveVault();
    if(id==="charName"){
      (activeChat().sceneCast||[]).forEach(p=>{if(p.castMemberId===member.id)p.name=e.target.value});
      $("characterEditorTitle").textContent=`${c.storyName||c.name||"Roleplay"} • ${e.target.value||"Character"}`;
      renderCastMemberTabs();
    }
  }));
  if($("addCastMemberBtn"))$("addCastMemberBtn").addEventListener("click",()=>{
    const name=prompt("New character name:","New Character");if(name===null)return;
    const c=activeCharacter(),member=newCastMember(name.trim()||"New Character");
    ensureCastMembers(c).push(member);c.activeCastMemberId=member.id;c.updatedAt=now();saveVault();renderAll();selectTab("character");
  });
  if($("importBotSheetBtn"))$("importBotSheetBtn").addEventListener("click",()=>$("importBotSheetInput")?.click());
  if($("importBotSheetInput"))$("importBotSheetInput").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      addImportedCastSheet(parsed,file.name);
    }catch(err){
      alert(`Bot sheet import failed: ${err?.message||String(err)}`);
    }finally{
      e.target.value="";
    }
  });
  if($("deleteCastMemberBtn"))$("deleteCastMemberBtn").addEventListener("click",()=>{
    const c=activeCharacter(),member=activeCastMember(c);
    if(!member||member===c){alert("The Primary Bot Sheet is the original RP character and cannot be deleted. Extra bot sheets can be removed safely.");return}
    if(!confirm(`Delete ${member.name||"this character"}'s extra bot sheet from this roleplay? The shared RP chat will not be deleted.`))return;
    c.castMembers=ensureCastMembers(c).filter(m=>m.id!==member.id);
    (c.chats||[]).forEach(ch=>{if(Array.isArray(ch.sceneCast))ch.sceneCast=ch.sceneCast.filter(p=>p.castMemberId!==member.id)});
    c.activeCastMemberId=null;c.updatedAt=now();saveVault();renderAll();selectTab("character");
  });
  if($("castMemberInScene"))$("castMemberInScene").addEventListener("change",e=>{
    const member=activeCastMember();if(!member)return;
    setCastMemberInScene(member,e.target.checked);renderCastMemberTabs();
    if(typeof renderStats==="function")renderStats();
  });
  $("memoryPermanent").addEventListener("input",e=>{const c=activeCharacter(),m=activeCastMember(c);if(!m)return;m.permanentMemory=e.target.value;m.updatedAt=now();c.updatedAt=now();saveVault()});
  if($("migrationNotes"))$("migrationNotes").addEventListener("input",e=>{const c=activeCharacter(),m=activeCastMember(c);if(!m)return;m.migrationNotes=e.target.value;m.updatedAt=now();c.updatedAt=now();saveVault()});
  if($("addLoveInterestBtn"))$("addLoveInterestBtn").addEventListener("click",()=>{
    const c=activeCharacter();if(!Array.isArray(c.loveInterests))c.loveInterests=[];
    c.loveInterests.push({id:uid(),name:"",role:"",dynamic:"",voice:"",continuity:"",updatedAt:now()});
    c.updatedAt=now();saveVault();renderLoveInterests();
  });
  $("memoryRelationship").addEventListener("input",e=>{activeChat().relationshipMemory=e.target.value;activeChat().updatedAt=now();saveVault()});
  [["knowledgeKnown","known"],["knowledgeUnknown","unknown"],["knowledgeRecent","recent"],["knowledgeDoNotAsk","doNotAsk"]].forEach(([id,key])=>{
    if(!$(id))return;
    $(id).addEventListener("input",e=>{
      const ch=activeChat();
      if(!ch.knowledgeLedger||typeof ch.knowledgeLedger!=="object")ch.knowledgeLedger={known:"",unknown:"",recent:"",doNotAsk:""};
      ch.knowledgeLedger[key]=e.target.value;ch.updatedAt=now();saveVault();
    });
  });
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

Keep only durable facts future scenes may need: relationship status and milestones; promises and consequences; identities, powers, transformations, lasting injuries; major discoveries and who knows them; plot-relevant locations or objects; unresolved threads; stable preferences established in the RP. Preserve knowledge ownership explicitly: label facts as KNOWN TO [character], UNKNOWN TO [character], or DO NOT ASK FOR AS NEW when appropriate.

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

function syncMilestonesToMemory(ch=activeChat()){
  const markerStart="[[AUTO MILESTONES]]";
  const markerEnd="[[/AUTO MILESTONES]]";
  const base=(ch.relationshipMemory||"").replace(/\n?\[\[AUTO MILESTONES\]\][\s\S]*?\[\[\/AUTO MILESTONES\]\]\n?/g,"").trim();
  const block=ch.milestones.length
    ? `${markerStart}\n${ch.milestones.map(m=>`- ${m.text}`).join("\n")}\n${markerEnd}`
    : "";
  ch.relationshipMemory=[base,block].filter(Boolean).join("\n\n");
  if(activeChat()===ch && $("memoryRelationship"))$("memoryRelationship").value=ch.relationshipMemory;
}

function milestoneCandidateText(ch=activeChat()){
  const recent=ch.messages.slice(-6).map(m=>m.text||"").join("\n").toLowerCase();
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

function maybeAutoSaveMilestone(ch=activeChat()){
  if(settings.autoMemory===false)return;
  if(!milestoneCandidateText(ch))return;
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
      syncMilestonesToMemory(ch);
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
  // Move only the transcript when it owns scrolling; avoid two competing animations.
  if(messagesScrollable()){
    messagesEl.scrollTo({top:messagesEl.scrollHeight,behavior});
  }else{
    document.querySelector(".composer-dock")?.scrollIntoView({behavior,block:"end"});
  }
  setTimeout(updateScrollBottomButton,260);
}
if(scrollBottomBtn)scrollBottomBtn.addEventListener("click",()=>scrollMessagesToBottom("smooth"));

// One scroll update per frame. Hiding chrome must never change document height.
let lastPageY=documentScrollTop();
let lastMessageY=messagesEl?.scrollTop||0;
let chromeHidden=false;
let scrollFrame=null;
function setChromeHidden(hidden){
  if(!topbarEl || chromeHidden===hidden)return;
  chromeHidden=hidden;
  document.body.classList.toggle("chrome-hidden",hidden);
}
function reactToScrollDirection(current,previous,source){
  const nearTop=source==="page" ? current<22 : current<8 && documentScrollTop()<22;
  if(nearTop){setChromeHidden(false);return true;}
  if(Math.abs(current-previous)<12)return false;
  setChromeHidden(current>previous);
  return true;
}
function scheduleScrollUpdate(){
  if(scrollFrame!==null)return;
  scrollFrame=requestAnimationFrame(()=>{
    scrollFrame=null;
    const pageY=Math.max(0,documentScrollTop());
    const messageY=Math.max(0,messagesEl?.scrollTop||0);
    if(pageY!==lastPageY && reactToScrollDirection(pageY,lastPageY,"page"))lastPageY=pageY;
    if(messageY!==lastMessageY && reactToScrollDirection(messageY,lastMessageY,"messages"))lastMessageY=messageY;
    updateScrollBottomButton();
  });
}
window.addEventListener("scroll",scheduleScrollUpdate,{passive:true});
messagesEl?.addEventListener("scroll",scheduleScrollUpdate,{passive:true});
let renderedChatId=null;

function renderMessages(){
  const c=activeCharacter(),ch=activeChat();
  const previousTop=messagesEl.scrollTop;
  const followLatest=renderedChatId!==ch.id || isMessagesNearBottom();
  renderedChatId=ch.id;
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
    wrap.dataset.messageId=msg.id;
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
          invalidateCompactMemory(ch,msg);
          msg.text=revised;msg.edited=true;msg.editedAt=now();ch.updatedAt=now();saveVault();renderMessages();
        });
        actions.append(cancel,save);wrap.append(editor,actions);editor.focus();editor.setSelectionRange(editor.value.length,editor.value.length);
      });
      tools.append(editBtn);wrap.append(tools);
    }
    if(msg.edited){const edited=document.createElement("div");edited.className="meta";edited.textContent="EDITED";wrap.append(edited)}
    messagesEl.appendChild(wrap);
  });
  window.NoctisStoryPresentation?.decorate(messagesEl,ch);
  messagesEl.scrollTop=followLatest?messagesEl.scrollHeight:previousTop;
  lastMessageY=messagesEl.scrollTop;
  updateScrollBottomButton();
}
function compileSystemPrompt(){
  const c=activeCharacter(),ch=activeChat();
  const allCast=allCastMembers(c);
  const presentCast=sceneCastMembers(c,ch);
  const offSceneCast=allCast.filter(m=>!presentCast.some(p=>p.id===m.id));
  const castSheets=presentCast.map((m,i)=>{
    const memberLore=Array.isArray(m.lore)?m.lore.filter(x=>x&&(x.title||x.body)).map(x=>`- ${x.title||"Lore"}: ${x.body||""}`).join("\n"):"";
    return `CAST MEMBER ${i+1}: ${m.name||"Unnamed"}
Role / Archetype: ${m.role||"(unspecified)"}
Personality: ${m.personality||"(unspecified)"}
Backstory: ${m.backstory||"(unspecified)"}
Voice & Speech: ${m.voice||"(unspecified)"}
Relationship Dynamic: ${m.relationshipDynamic||"(unspecified)"}
Character Directives: ${m.directives||"(none)"}
Personal Permanent Memory: ${m.permanentMemory||"(none)"}
Character-Specific Lore:
${memberLore||"(none)"}`;
  }).join("\n\n");
  const sceneRoster=(ch.sceneCast||[]).map(p=>`- ${p.name||"Unnamed"}${p.status?` — ${p.status}`:""}${p.clothing?` | clothing: ${p.clothing}`:""}${p.health?` | health: ${p.health}`:""}`).join("\n")||"(no explicit roster details)";
  const lore=c.lore.filter(x=>x.title||x.body).map(x=>`- ${x.title}: ${x.body}`).join("\n")||"(none)";
  const threads=ch.threads.filter(x=>x.title||x.body).map(x=>`- ${x.title}: ${x.body}`).join("\n")||"(none)";
  const loveInterests=(c.loveInterests||[]).filter(x=>x.name||x.role||x.dynamic||x.voice||x.continuity).map((x,i)=>`${i+1}. ${x.name||"Unnamed love interest"}
Role / identity: ${x.role||"(unspecified)"}
Relationship dynamic: ${x.dynamic||"(unspecified)"}
Voice & behavior: ${x.voice||"(unspecified)"}
Continuity notes: ${x.continuity||"(none)"}`).join("\n\n")||"(none — this is a single-interest or non-romantic story)";
  const ledger=ch.knowledgeLedger||{};
  const knowledgeLedger=[
    `KNOWN TO NPCS / CAST:\n${ledger.known||"(none recorded)"}`,
    `UNKNOWN OR UNCONFIRMED:\n${ledger.unknown||"(none recorded)"}`,
    `RECENTLY CONFIRMED:\n${ledger.recent||"(none recorded)"}`,
    `DO NOT ASK FOR AS NEW:\n${ledger.doNotAsk||"(none recorded)"}`
  ].join("\n\n");
  return `You are performing the roleplay cast for ${c.storyName || c.name || "this roleplay"}.

ACTIVE SCENE CAST — FULL BOT CHARACTER SHEETS
${castSheets||"(none)"}

OFF-SCENE BOT CHARACTERS
${offSceneCast.length?offSceneCast.map(m=>"- "+(m.name||"Unnamed")).join("\n"):"(none)"}

CURRENT SCENE ROSTER / PHYSICAL PRESENCE
${sceneRoster}

CAST PRESENCE RULES
- Only bot characters listed in ACTIVE SCENE CAST may speak, act, touch the protagonist, observe current events firsthand, or be physically present unless the story explicitly brings another cast member into the scene.
- OFF-SCENE BOT CHARACTERS remain part of canon but do not suddenly appear, speak from nowhere, know current private events firsthand, or inherit another character's observations.
- Track each cast member separately: voice, knowledge, memories, relationship status, jealousy, promises, injuries, clothing, location, and physical position are never interchangeable.
- When a scene transition adds or removes someone, update continuity naturally; never teleport cast members without an established arrival/departure.
- If several cast members are present, label or write dialogue clearly enough that the user can always tell who spoke or acted.

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

LOVE INTERESTS / ROMANTIC ENSEMBLE
${loveInterests}
- When more than one love interest is listed, keep each person's voice, knowledge, motives, relationship history, jealousy, boundaries, and physical position distinct.
- Do not merge love interests into one interchangeable voice or make one person speak for another.
- Preserve the user's agency in every relationship and never decide which person the protagonist chooses.

CURRENT SCENE
Location: ${ch.scene.location || "(unspecified)"}
Time / Atmosphere: ${ch.scene.time || "(unspecified)"}
Scene State: ${ch.scene.state || "(unspecified)"}
Emotional State: ${ch.scene.emotion || "(unspecified)"}

SHARED LOREBOOK
${lore}

OPEN THREADS FOR THIS TIMELINE
${threads}

KNOWLEDGE LEDGER — WHO KNOWS WHAT
${knowledgeLedger}

GLOBAL HARD LIMITS — ABSOLUTE
${settings.hardLimits || defaultSettings.hardLimits}

HARD-LIMIT ENFORCEMENT
- The listed hard limits apply across every character, cast, timeline, and scene.
- Never have an NPC propose, request, threaten, fantasize about, initiate, normalize, or escalate toward a listed hard limit.
- Never eroticize a listed hard limit.
- Do not test the boundary by offering a "milder" version of the same prohibited act.
- If a scene naturally approaches a hard limit, redirect the NPC toward a different action that fits the character and tone without breaking immersion.
- Do not repeatedly mention the hard limit or turn the RP into a safety lecture.
- HARD LIMITS DO NOT NEUTER CHARACTERIZATION. A dominant, possessive, obsessive, jealous, dangerous, ruthless, commanding, or morally gray NPC must remain recognizably that character while staying inside the listed limits and protagonist-agency rules.
- Do not replace intensity with therapy-speak, generic reassurance, excessive permission-checking, timid waiting, or saintly politeness unless that behavior is established in CHARACTER VOICE. The NPC may initiate, demand, pursue, crowd the moment, show jealousy, make plans, take risks, issue commands, act possessive, or create pressure/tension on the NPC/world side; simply stop before supplying the protagonist's response or crossing a hard limit.
- User-created OOC edits can change the list in Settings, but ordinary in-character dialogue does not override it.

NOCTIS CANON AUTHORITY + DRIFT PREVENTION
- Use this authority order when facts conflict: ACTIVE USER PERSONA; explicit permanent canon and manually saved memory; verified milestones/timeline memory/lore/scene/knowledge ledger; the protagonist's own messages; assistant-authored story prose last.
- Assistant-authored prose is NOT self-verifying canon. A model mistake does not become true merely because it appeared in an earlier character reply or was repeated later.
- If earlier assistant prose conflicts with the persona or stronger canon, silently discard the bad detail and continue from the stronger source. Do not rationalize the contradiction.
- The protagonist's stored physical description is locked unless the USER explicitly changes it in the story. Never alter skin tone, body type, height, hair, eyes, species, anatomy, scars, tattoos, or other persistent appearance details because of atmosphere, metaphor, lighting, scent, or a previous assistant mistake.
- PERSONA FIDELITY IS ABSOLUTE: the ACTIVE USER PERSONA is a specification, not inspiration. Follow every recorded persona field exactly as written. Do not rewrite, reinterpret, "improve," substitute, generalize, contradict, or add persistent identity/appearance traits that are not present.
- Never infer a different complexion, race/ethnicity, body shape, age, species, hair, eyes, anatomy, disability, occupation, history, personality trait, skill, or relationship preference from genre conventions, character archetypes, names, images, or previous assistant prose. If the persona says very fair/pale skin, do not describe the protagonist as dark-skinned, tan, brown-skinned, olive, or otherwise change the recorded complexion.
- When a persona field is unspecified, leave that fact unspecified. Missing data is not permission to invent it.
- MAJOR EVENT EVIDENCE: sex, orgasms, first kisses, bites, marks, mate bonds, claiming, engagement, marriage, pregnancy, children, transformations, serious injuries, moving in, breakups, reconciliations, and similar durable events may be treated as completed only when supported by explicit user-authored participation/confirmation or a higher-authority saved canon source. A prior assistant claim by itself is insufficient.
- Desire is not history. Saying "mine", "mate", "Alpha", wanting to mark someone, planning a bond, imagining marriage, or discussing sex does not mean the mark, bond, marriage, or sex already happened.
- Do not backfill missing steps. If intimacy level is uncertain, describe only what is definitely established and let the next user turn determine what happens.
- ROLE LABELS ARE NOT PRONOUNS: words such as Alpha, Dom, king, boss, mate, or owner do not make a character refer to himself in the third person. Use normal first-person dialogue unless CHARACTER VOICE explicitly establishes a recurring third-person/self-title speech habit.
- Do not invent expertise from isolated behavior. A single calculation, observation, joke, or clever line does not make the protagonist a mathematician, doctor, hacker, linguist, fighter, or other specialist unless canon says so.
- When uncertain, omit the disputed fact rather than guessing.

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
- Knowledge ownership is part of canon. A fact can be true without every character knowing it; use the ledger, canon, and transcript to decide who may reference it.
- SURVEILLANCE / BUGGING CONTINUITY: if an NPC is established to have watched, monitored, bugged, or surveilled the protagonist or a location, that NPC already knows details they could reasonably observe there, including the residence or apartment exterior, visible routines, and a pet's name if it was observable or learned through that surveillance. Do not ask the protagonist to reveal an already-observed fact as though it is unknown. Keep genuinely private or unobserved details unknown.
- Preserve physical geography, positions, clothing, objects, injuries, transformations, elapsed time, and cause-and-effect.
- BODY/PERSPECTIVE CONSISTENCY: Never reverse physical roles when switching between narration and dialogue. Track who is touching, holding, carrying, wearing, penetrating, containing, or positioned inside whom. First-person dialogue must preserve the same physical relationship already established by the scene.
- Do not silently reset arguments, intimacy, danger, promises, emotional consequences, or unresolved events.
- For a multi-character cast, keep each character's voice, knowledge, motives, actions, and dialogue distinct.
- Take meaningful initiative as the character(s), but hand control back to the user as soon as their protagonist must respond.
- Write coherent, concrete prose. Every sentence must logically connect to the scene. Avoid contradictory metaphors, generic filler, and invented callbacks.
- NO REPETITION CLAUSE — STRICT: Do not recycle the same sentence, phrase, pet name, epithet, title, metaphor, observation, emotional conclusion, possessive declaration, or character-summary beat merely with slightly different wording.
- Do not use rhythmic filler such as "Dante is listening. Dante is waiting. Dante is yours." and do not repeatedly reduce the protagonist to labels such as "the artist," "the mathematician," "the daughter," "his girl," "his mate," or similar shorthand unless the USER has explicitly made that label canon and it is genuinely natural in the scene.
- Do not restate the previous assistant reply unless a brief recap is necessary for comprehension. Every reply must add at least one genuinely new NPC action, line of dialogue, observation, consequence, revelation, or scene beat.
- Avoid consecutive replies with the same grammatical skeleton, opening cadence, possessive declaration, emotional conclusion, or closing beat.
- An incidental action or trait must never become a recurring label, identity, profession, archetype, or nickname. One calculation does not make someone "the mathematician"; one drawing does not make them "the artist."
- Before finishing a reply, silently remove redundant sentences that repeat an idea already expressed in the same response or the immediately previous assistant turn.
- BAN FRAGMENT STACKING AS A STYLE CRUTCH: do not write chains of clipped fragments that rename the same person or repeat the same preposition/cadence, such as "The wolf. The don. The ghost." or "For the steam. For the water. For the hand. For the possibility." Use normal connected prose instead.
- Do not use three-or-more parallel sentence fragments merely for dramatic emphasis. One short fragment can be effective; repeated fragment ladders are not.
- Avoid serial reassurance beats such as "I'm here. I'm listening. I'm waiting." when the scene already established attention/presence. Replace them with character-specific action, dialogue, menace, wit, desire, conflict, or a new consequence.
- Dialogue should sound like the established character, not like an assistant, therapist, narrator explaining consent, or generic romance prose.
- Remain in character unless the user explicitly requests out-of-character discussion.

The model is the actor. Noctis owns canon and continuity. The user's protagonist remains theirs.`;
}
function continuityGuardPrompt(){
  const p=activePersona();
  return `NOCTIS FINAL CANON CHECK — apply this after reading the recent transcript.
- The recent transcript can contain prior MODEL mistakes. Assistant-authored claims do not become canon by repetition.
- ACTIVE PERSONA IS LOCKED CANON. Follow it exactly; never alter, reinterpret, embellish, or replace persona facts.
- Highest-priority protagonist identity: ${p?.name||"(name unspecified)"} | ${p?.age||"(age unspecified)"} | ${p?.pronouns||"(pronouns unspecified)"} | ${p?.species||"(nature unspecified)"}.
- Highest-priority protagonist appearance: ${p?.appearance||"(no appearance recorded — do not invent persistent traits)"}.
- Highest-priority protagonist canon: ${p?.canon||"(none recorded)"}.
- Highest-priority protagonist personality/preferences: ${p?.personality||"(none recorded)"} | ${p?.preferences||"(none recorded)"}.
- Preserve the protagonist exactly as stored. If recent assistant prose conflicts with ANY persona field, ignore the assistant error.
- Never substitute a different skin tone/complexion, race/ethnicity, body type, height, hair, eyes, age, species, anatomy, history, occupation, personality, skill set, or relationship preference. Unspecified means unknown, not improvise.
- Do not state that sex, orgasm, a bite/mark, mate bond, claim, engagement, marriage, pregnancy, child, transformation, major injury, or other durable milestone already happened unless the USER explicitly participated/confirmed it or it exists in saved canon/memory.
- Possessive language, fantasies, plans, titles, and archetype labels are not completed events.
- Keep the established character voice. Do not switch into repetitive third-person self-titling such as "Alpha wants..." unless that speech habit is explicitly written in CHARACTER VOICE.
- NO REPETITION: do not reuse or lightly paraphrase the immediately previous assistant reply's phrases, sentence patterns, pet names, epithets, titles, declarations, observations, or emotional conclusions. Do not use a character's name/title in repetitive rhythmic fragments such as "X is listening. X is waiting. X is yours."
- STYLE CHECK: no fragment ladders such as "The wolf. The don. The ghost." and no repeated-preposition ladders such as "For the steam. For the water. For the..." Connect the thought naturally and move the scene forward.
- CHARACTER FORCE CHECK: continuity and agency rules must not make the NPC passive, timid, over-accommodating, or therapeutically reassuring if that contradicts established character voice. Preserve dominance, menace, obsession, possessiveness, jealousy, initiative, and moral roughness within hard limits.
- Do not create recurring labels from incidental behavior (for example, one calculation does not make the protagonist "the mathematician"). Each new reply must materially advance the NPC/world beat instead of summarizing the same idea again.
- Do not invent new protagonist skills or expertise to make a line work.
- If a fact is uncertain or contradictory, leave it unspecified and continue from confirmed canon.`;
}

function apiMessages(extraSystem=""){
  const ch=activeChat();
  const all=getConversationMessages(ch);
  let live;
  if(ch.consolidatedThroughMessageId){
    const idx=all.findIndex(m=>m.id===ch.consolidatedThroughMessageId);
    live=idx>=0?all.slice(idx+1):all.slice(-40);
  }else live=all.slice(-40);

  // Keep full transcripts in storage; send a compact recent window plus saved memory.
  live=live.slice(-16);
  let chars=0;
  for(let i=live.length-1;i>=0;i--){
    chars+=String(live[i].text||'').length;
    if(chars>16000 && i<live.length-2){live=live.slice(i+1);break;}
  }
  const out=[{role:"system",content:compileSystemPrompt()},...live.map(m=>({role:m.role,content:m.text})),{role:"system",content:continuityGuardPrompt()}];
  if(extraSystem)out.push({role:"system",content:extraSystem});
  return out;
}
async function openRouterRequest(messages,maxTokens=settings.maxTokens,temperature=settings.temperature){
  if(!settings.apiKey)throw new Error("Add your OpenRouter API key in Settings first.");

  const payload={
    model:settings.model||defaultSettings.model,
    messages,
    temperature:Number(temperature??0.85),
    reasoning:{exclude:true},
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
      // Exhausted daily allowances cannot recover through immediate retries.
      if(/daily|per.day|per-day|free-models-per-day|insufficient credits|quota.*exceed/i.test(details))throw lastError;

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

let mainGenerationBusy=false;
function setMainGenerationBusy(busy){
  mainGenerationBusy=busy;
  for(const id of ["sendBtn","continueBtn","elaborateBtn","generateMyTurnBtn","regenBtn"]){
    if($(id))$(id).disabled=busy;
  }
}
function invalidateCompactMemory(ch,msg){
  const all=getConversationMessages(ch);
  const cutoff=all.findIndex(m=>m.id===ch.consolidatedThroughMessageId);
  const index=all.findIndex(m=>m.id===msg.id);
  if(cutoff>=0 && index>=0 && index<=cutoff){
    ch.consolidatedMemory="";ch.consolidatedThroughMessageId=null;
  }
}

async function generateDirectedContinuation(mode){
  if(mainGenerationBusy)return;
  const ch=activeChat();
  const last=getConversationMessages(ch).at(-1);
  if(!last || last.role!=="assistant"){
    alert("There needs to be a character reply to continue from.");
    return;
  }

  setMainGenerationBusy(true);
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
    maybeAutoSaveMilestone(ch);
  }catch(err){
    $("connectionStatus").textContent="temporary model hiccup • try again";
    console.warn("Noctis continuation error:", err);
  }finally{
    setMainGenerationBusy(false);
  }
}


async function generateMyTurn(){
  if(mainGenerationBusy)return;
  const ch=activeChat();
  const c=activeCharacter();
  const last=getConversationMessages(ch).at(-1);

  if(!last || last.role!=="assistant"){
    alert("Generate My Turn works after the character has replied.");
    return;
  }

  const originalInput=$("messageInput").value;
  setMainGenerationBusy(true);
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

    if(activeChat()!==ch || $("messageInput").value!==originalInput){
      ch.messages.push({id:uid(),role:"systemnote",text:`SAVED DRAFT (not sent)\n${draft.trim()}`,createdAt:now()});
      ch.updatedAt=now();saveVault();renderMessages();
      return;
    }
    $("messageInput").value=draft.trim();
    $("messageInput").focus();
    $("messageInput").setSelectionRange($("messageInput").value.length,$("messageInput").value.length);
    $("connectionStatus").textContent=`draft ready • ${settings.model}`;
  }catch(err){
    $("connectionStatus").textContent="draft generator needs attention";
    alert(`Could not generate your turn: ${err?.message||String(err)}`);
  }finally{
    setMainGenerationBusy(false);
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
    ch.messages.slice(-n).forEach(m=>invalidateCompactMemory(ch,m));
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

async function generateReply(extraSystem="",replaceMessage=null){
  if(mainGenerationBusy)return;
  const ch=activeChat();
  const send=$("sendBtn");
  setMainGenerationBusy(true);
  send.textContent="…";
  $("connectionStatus").textContent="thinking…";
  try{
    const messages=apiMessages(extraSystem);
    if(replaceMessage){
      // Regeneration replaces the old reply only after a successful response.
      const index=messages.findLastIndex(m=>m.role==="assistant" && m.content===replaceMessage.text);
      if(index>=0)messages.splice(index,1);
    }
    const reply=await openRouterRequest(messages);
    if(replaceMessage){invalidateCompactMemory(ch,replaceMessage);ch.messages=ch.messages.filter(m=>m.id!==replaceMessage.id);}
    ch.messages.push({id:uid(),role:"assistant",text:reply,createdAt:now()});
    ch.updatedAt=now();
    saveVault();
    renderMessages();
    $("connectionStatus").textContent=`connected • ${settings.model}`;
    maybeAutoSaveMilestone(ch);
  }catch(err){
    const msg=String(err?.message||err);
    if(/rate limit|free-models-per-day|code:\s*429|code: 429/i.test(msg)){
      $("connectionStatus").textContent="daily free-model limit reached";
    }else{
      $("connectionStatus").textContent="temporary model hiccup • tap Regen";
    }
    console.warn("Noctis model error:", err);
  }finally{
    setMainGenerationBusy(false);
    send.textContent="Send";
  }
}
$("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(mainGenerationBusy)return;
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
  if(mainGenerationBusy)return;

  const ch=activeChat();
  const conversation=getConversationMessages(ch);
  const last=conversation.at(-1);
  if(!last)return;

  if(last.role==="user"){
    await generateReply();
    return;
  }

  if(last.role!=="assistant")return;

  // Never regenerate an assistant-only opening; there must be at least one
  // actual user turn somewhere before this reply.
  const lastIndex=conversation.lastIndexOf(last);
  if(!conversation.slice(0,lastIndex).some(m=>m.role==="user"))return;

  // Preserve engine context for replies created by OOC / Continue / Elaborate.
  let extraSystem="";
  if(last.continuationMode==="continue"){
    extraSystem=`ENGINE-ONLY INSTRUCTION: Continue the character/world side of the current turn. The user is asking for more from the NPC/world before taking their own turn. Continue only with NPC actions, dialogue, environmental events, or consequences that do NOT require assuming any action, reaction, choice, sensation, or dialogue from the user's protagonist. The instant the protagonist must respond or act, STOP and hand the turn back to the user.`;
  }else if(last.continuationMode==="elaborate"){
    extraSystem=`ENGINE-ONLY INSTRUCTION: Elaborate on the character/world side of the CURRENT MOMENT without changing what the user's protagonist has done. Add richer NPC expression, dialogue, atmosphere, physical detail, subtext, or relevant world detail. Do not repeat the previous reply verbatim. Do not move the user's protagonist, decide for them, narrate their sensations/reactions, or assume they answered. Do not advance past a point where the protagonist must act or respond. Stop there and hand the turn back to the user.`;
  }else{
    const rawIndex=ch.messages.findIndex(m=>m===last || (m.id&&last.id&&m.id===last.id));
    const prev=rawIndex>0?ch.messages[rawIndex-1]:null;
    if(prev?.role==="command" && /^OOC\s*•\s*/i.test(prev.text||"")){
      const instruction=String(prev.text||"").replace(/^OOC\s*•\s*/i,"").trim();
      if(instruction){
        extraSystem=`ENGINE-ONLY OOC INSTRUCTION: ${instruction}
This is direction from the user, not dialogue or canon. Follow it for the regenerated reply without treating the instruction itself as something the protagonist said or did.`;
      }
    }
  }

  await generateReply(extraSystem,last);
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
