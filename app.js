const STORAGE_KEY="noctis-mourning-vale-v0.2";
const SETTINGS_KEY="noctis-private-settings-v0.2";

const defaultState={
  character:{
    name:"Noctis",
    role:"Test Character",
    personality:"Observant, emotionally intelligent, proactive, consistent, and capable of independent action.",
    backstory:"A temporary test character used to validate the Noctis Mourning Vale engine.",
    voice:"Natural, immersive prose. Speaks with confidence and specificity.",
    directives:[
      "Never narrate the user's thoughts, choices, dialogue, or actions.",
      "Preserve established canon and physical continuity.",
      "Take initiative when it fits the character instead of waiting passively.",
      "Do not forget transformations, injuries, relationships, promises, or unresolved conflicts.",
      "Avoid repetitive phrasing and empty consent loops.",
      "Treat scene state, lore, and memory as authoritative.",
      "Do not break character unless the user explicitly asks for out-of-character discussion."
    ].join("\n")
  },
  memory:{permanent:"",relationship:""},
  scene:{location:"",time:"",state:"",emotion:""},
  lore:[{title:"Engine Rule",body:"The model is the actor. Noctis owns canon, memory, scene state, and continuity."}],
  threads:[{title:"Prototype",body:"Validate persistent RP continuity with a real model connection."}],
  messages:[{role:"assistant",text:"Noctis Mourning Vale initialized. Add an OpenRouter API key in Settings, then return to Chat."}]
};

const defaultSettings={apiKey:"",model:"openrouter/free",temperature:0.9,maxTokens:900};
const clone=x=>JSON.parse(JSON.stringify(x));

function loadJSON(key,fallback){try{const r=localStorage.getItem(key);return r?{...clone(fallback),...JSON.parse(r)}:clone(fallback)}catch{return clone(fallback)}}
let state=loadJSON(STORAGE_KEY,defaultState);
let settings=loadJSON(SETTINGS_KEY,defaultSettings);
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}

const $=id=>document.getElementById(id);
const el={charName:$("charName"),charRole:$("charRole"),charPersonality:$("charPersonality"),charBackstory:$("charBackstory"),charVoice:$("charVoice"),charDirectives:$("charDirectives"),memoryPermanent:$("memoryPermanent"),memoryRelationship:$("memoryRelationship"),sceneLocation:$("sceneLocation"),sceneTime:$("sceneTime"),sceneState:$("sceneState"),sceneEmotion:$("sceneEmotion")};

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===btn.dataset.tab));
  window.scrollTo({top:0,behavior:"smooth"});
}));

function renderBasics(){
  el.charName.value=state.character.name||"";el.charRole.value=state.character.role||"";
  el.charPersonality.value=state.character.personality||"";el.charBackstory.value=state.character.backstory||"";
  el.charVoice.value=state.character.voice||"";el.charDirectives.value=state.character.directives||"";
  el.memoryPermanent.value=state.memory.permanent||"";el.memoryRelationship.value=state.memory.relationship||"";
  el.sceneLocation.value=state.scene.location||"";el.sceneTime.value=state.scene.time||"";
  el.sceneState.value=state.scene.state||"";el.sceneEmotion.value=state.scene.emotion||"";
  $("chatCharacterName").textContent=state.character.name||"Noctis";
  $("apiKey").value=settings.apiKey||"";$("modelName").value=settings.model||"openrouter/free";
  $("temperature").value=settings.temperature??0.9;$("maxTokens").value=settings.maxTokens??900;
  updateConnectionStatus();
}
function bindBasics(){
  const map={charName:["character","name"],charRole:["character","role"],charPersonality:["character","personality"],charBackstory:["character","backstory"],charVoice:["character","voice"],charDirectives:["character","directives"],memoryPermanent:["memory","permanent"],memoryRelationship:["memory","relationship"],sceneLocation:["scene","location"],sceneTime:["scene","time"],sceneState:["scene","state"],sceneEmotion:["scene","emotion"]};
  Object.entries(map).forEach(([id,[g,k]])=>el[id].addEventListener("input",e=>{state[g][k]=e.target.value;if(id==="charName")$("chatCharacterName").textContent=e.target.value||"Noctis";saveState()}));
  $("apiKey").addEventListener("input",e=>{settings.apiKey=e.target.value.trim();saveSettings();updateConnectionStatus()});
  $("modelName").addEventListener("input",e=>{settings.model=e.target.value.trim()||"openrouter/free";saveSettings()});
  $("temperature").addEventListener("input",e=>{settings.temperature=Math.max(0,Math.min(2,Number(e.target.value)||0));saveSettings()});
  $("maxTokens").addEventListener("input",e=>{settings.maxTokens=Math.max(64,Math.min(4096,Number(e.target.value)||900));saveSettings()});
}
function updateConnectionStatus(){$("connectionStatus").textContent=settings.apiKey?"model key saved locally":"add model key in Settings"}

const template=$("entryTemplate"),loreList=$("loreList"),threadList=$("threadList");
function renderEntries(container,listName){
  container.innerHTML="";
  state[listName].forEach((item,index)=>{
    const node=template.content.firstElementChild.cloneNode(true),title=node.querySelector(".entry-title"),body=node.querySelector(".entry-body");
    title.value=item.title||"";body.value=item.body||"";
    title.addEventListener("input",e=>{state[listName][index].title=e.target.value;saveState()});
    body.addEventListener("input",e=>{state[listName][index].body=e.target.value;saveState()});
    node.querySelector(".remove").addEventListener("click",()=>{state[listName].splice(index,1);saveState();renderEntries(container,listName)});
    container.appendChild(node);
  });
}
$("addLoreBtn").addEventListener("click",()=>{state.lore.push({title:"",body:""});saveState();renderEntries(loreList,"lore")});
$("addThreadBtn").addEventListener("click",()=>{state.threads.push({title:"",body:""});saveState();renderEntries(threadList,"threads")});

const messagesEl=$("messages");
function renderMessages(){
  messagesEl.innerHTML="";
  state.messages.forEach(msg=>{
    const wrap=document.createElement("div");wrap.className=`message ${msg.role}${msg.error?" error":""}`;
    const meta=document.createElement("div");meta.className="meta";meta.textContent=msg.role==="user"?"YOU":(state.character.name||"NOCTIS").toUpperCase();
    const body=document.createElement("div");body.textContent=msg.text;wrap.append(meta,body);messagesEl.appendChild(wrap);
  });
  messagesEl.scrollTop=messagesEl.scrollHeight;
}
function compileSystemPrompt(){
  const lore=state.lore.filter(x=>x.title||x.body).map(x=>`- ${x.title}: ${x.body}`).join("\n")||"(none)";
  const threads=state.threads.filter(x=>x.title||x.body).map(x=>`- ${x.title}: ${x.body}`).join("\n")||"(none)";
  return `You are roleplaying as ${state.character.name || "the character"}.

CHARACTER ROLE
${state.character.role || "(unspecified)"}

PERSONALITY
${state.character.personality || "(unspecified)"}

BACKSTORY
${state.character.backstory || "(unspecified)"}

VOICE AND SPEECH
${state.character.voice || "(unspecified)"}

RESPONSE DIRECTIVES
${state.character.directives || "(none)"}

PERMANENT MEMORY
${state.memory.permanent || "(none)"}

RELATIONSHIP MEMORY
${state.memory.relationship || "(none)"}

CURRENT SCENE
Location: ${state.scene.location || "(unspecified)"}
Time/Atmosphere: ${state.scene.time || "(unspecified)"}
Scene State: ${state.scene.state || "(unspecified)"}
Emotional State: ${state.scene.emotion || "(unspecified)"}

LOREBOOK
${lore}

OPEN STORY THREADS
${threads}

Stay in character. Preserve continuity. The user's character belongs to the user; never invent the user's internal thoughts, dialogue, choices, or actions.`;
}
function apiMessages(){
  return [{role:"system",content:compileSystemPrompt()},...state.messages.slice(-24).map(m=>({role:m.role,content:m.text}))];
}
async function callModel(){
  if(!settings.apiKey) throw new Error("Add your OpenRouter API key in Settings first.");
  const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${settings.apiKey}`,
      "Content-Type":"application/json",
      "HTTP-Referer":location.href,
      "X-Title":"Noctis Mourning Vale"
    },
    body:JSON.stringify({
      model:settings.model||"openrouter/free",
      messages:apiMessages(),
      temperature:Number(settings.temperature??0.9),
      max_tokens:Number(settings.maxTokens??900)
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.error?.message || `Model request failed (${response.status}).`);
  const text=data?.choices?.[0]?.message?.content;
  if(!text) throw new Error("The model returned no text.");
  return text;
}
async function generateReply(){
  $("sendBtn").disabled=true;$("connectionStatus").textContent="thinking…";
  try{
    const reply=await callModel();state.messages.push({role:"assistant",text:reply});saveState();renderMessages();$("connectionStatus").textContent=`connected • ${settings.model}`;
  }catch(err){
    state.messages.push({role:"assistant",text:`Connection error: ${err.message}`,error:true});saveState();renderMessages();$("connectionStatus").textContent="connection needs attention";
  }finally{$("sendBtn").disabled=false}
}
$("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();const input=$("messageInput"),text=input.value.trim();if(!text)return;
  state.messages.push({role:"user",text});input.value="";saveState();renderMessages();await generateReply();
});
$("regenBtn").addEventListener("click",async()=>{
  if(state.messages.at(-1)?.role==="assistant")state.messages.pop();
  if(state.messages.at(-1)?.role!=="user")return;
  saveState();renderMessages();await generateReply();
});
$("clearChatBtn").addEventListener("click",()=>{if(confirm("Clear only the chat history? Character, lore, and memory will remain.")){state.messages=[];saveState();renderMessages()}});

$("testConnectionBtn").addEventListener("click",async()=>{
  const out=$("testResult");out.className="test-result";out.textContent="Testing…";
  try{
    if(!settings.apiKey)throw new Error("Paste an API key first.");
    const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${settings.apiKey}`,"Content-Type":"application/json","HTTP-Referer":location.href,"X-Title":"Noctis Mourning Vale"},body:JSON.stringify({model:settings.model||"openrouter/free",messages:[{role:"user",content:"Reply with exactly: Noctis connected."}],max_tokens:20})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error?.message||`Request failed (${response.status}).`);
    out.className="test-result ok";out.textContent=data?.choices?.[0]?.message?.content||"Connected.";
  }catch(err){out.className="test-result bad";out.textContent=err.message}
});

$("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`${(state.character.name||"noctis").replace(/\s+/g,"-").toLowerCase()}-noctis-export.json`;a.click();URL.revokeObjectURL(url);
});
$("importInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{state=JSON.parse(await file.text());saveState();renderAll()}catch{alert("That file could not be imported.")}e.target.value="";
});
function renderAll(){renderBasics();renderEntries(loreList,"lore");renderEntries(threadList,"threads");renderMessages()}
bindBasics();renderAll();
