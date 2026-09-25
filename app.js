
const STORAGE_KEY = "noctis-mourning-vale-v0.1";

const defaultState = {
  character: {
    name: "Noctis",
    role: "Test Character",
    personality: "Observant, emotionally intelligent, proactive, consistent, and capable of independent action.",
    backstory: "A temporary test character used to validate the Noctis Mourning Vale engine.",
    voice: "Natural, immersive prose. Speaks with confidence and specificity.",
    directives: [
      "Never narrate the user's thoughts, choices, dialogue, or actions.",
      "Preserve established canon and physical continuity.",
      "Take initiative when it fits the character instead of waiting passively.",
      "Do not forget transformations, injuries, relationships, promises, or unresolved conflicts.",
      "Avoid repetitive phrasing and empty consent loops.",
      "Treat scene state and memory as authoritative."
    ].join("\n")
  },
  memory: {
    permanent: "",
    relationship: ""
  },
  scene: {
    location: "",
    time: "",
    state: "",
    emotion: ""
  },
  lore: [
    { title: "Engine Rule", body: "The model is the actor. Noctis owns canon, memory, scene state, and continuity." }
  ],
  threads: [
    { title: "Prototype", body: "Connect a real language model provider after the local engine shell is validated." }
  ],
  messages: [
    { role: "assistant", text: "Noctis Mourning Vale initialized. This is the local prototype shell." }
  ]
};

let state = loadState();

function clone(x){ return JSON.parse(JSON.stringify(x)); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...clone(defaultState), ...JSON.parse(raw) } : clone(defaultState);
  }catch{
    return clone(defaultState);
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const ids = [
  "charName","charRole","charPersonality","charBackstory","charVoice","charDirectives",
  "memoryPermanent","memoryRelationship","sceneLocation","sceneTime","sceneState","sceneEmotion"
];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const messagesEl = document.getElementById("messages");
const loreList = document.getElementById("loreList");
const threadList = document.getElementById("threadList");
const template = document.getElementById("entryTemplate");

function renderBasics(){
  el.charName.value = state.character.name || "";
  el.charRole.value = state.character.role || "";
  el.charPersonality.value = state.character.personality || "";
  el.charBackstory.value = state.character.backstory || "";
  el.charVoice.value = state.character.voice || "";
  el.charDirectives.value = state.character.directives || "";
  el.memoryPermanent.value = state.memory.permanent || "";
  el.memoryRelationship.value = state.memory.relationship || "";
  el.sceneLocation.value = state.scene.location || "";
  el.sceneTime.value = state.scene.time || "";
  el.sceneState.value = state.scene.state || "";
  el.sceneEmotion.value = state.scene.emotion || "";
  document.getElementById("chatCharacterName").textContent = state.character.name || "Noctis";
}

function bindBasics(){
  const map = {
    charName:["character","name"],
    charRole:["character","role"],
    charPersonality:["character","personality"],
    charBackstory:["character","backstory"],
    charVoice:["character","voice"],
    charDirectives:["character","directives"],
    memoryPermanent:["memory","permanent"],
    memoryRelationship:["memory","relationship"],
    sceneLocation:["scene","location"],
    sceneTime:["scene","time"],
    sceneState:["scene","state"],
    sceneEmotion:["scene","emotion"]
  };
  for(const [id,[group,key]] of Object.entries(map)){
    el[id].addEventListener("input", e => {
      state[group][key] = e.target.value;
      if(id === "charName") document.getElementById("chatCharacterName").textContent = e.target.value || "Noctis";
      saveState();
    });
  }
}

function renderEntries(container, listName){
  container.innerHTML = "";
  state[listName].forEach((item,index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".entry-title");
    const body = node.querySelector(".entry-body");
    const remove = node.querySelector(".remove");
    title.value = item.title || "";
    body.value = item.body || "";
    title.addEventListener("input", e => { state[listName][index].title = e.target.value; saveState(); });
    body.addEventListener("input", e => { state[listName][index].body = e.target.value; saveState(); });
    remove.addEventListener("click", () => {
      state[listName].splice(index,1);
      saveState();
      renderEntries(container,listName);
    });
    container.appendChild(node);
  });
}

function renderMessages(){
  messagesEl.innerHTML = "";
  for(const msg of state.messages){
    const wrap = document.createElement("div");
    wrap.className = `message ${msg.role}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = msg.role === "user" ? "YOU" : (state.character.name || "NOCTIS").toUpperCase();
    const body = document.createElement("div");
    body.textContent = msg.text;
    wrap.append(meta, body);
    messagesEl.appendChild(wrap);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function buildContextPacket(userMessage){
  return {
    character: clone(state.character),
    memory: clone(state.memory),
    scene: clone(state.scene),
    lore: clone(state.lore),
    openThreads: clone(state.threads),
    recentMessages: state.messages.slice(-12),
    userMessage
  };
}

// Temporary local response engine.
// This is intentionally simple; the real model adapter will replace it.
function localEngineReply(userMessage){
  const name = state.character.name || "Noctis";
  const sceneBits = [
    state.scene.location && `Location: ${state.scene.location}`,
    state.scene.time && `Time: ${state.scene.time}`,
    state.scene.emotion && `Emotional state: ${state.scene.emotion}`
  ].filter(Boolean);

  const continuity = sceneBits.length
    ? `\n\n[Continuity held: ${sceneBits.join(" • ")}]`
    : "";

  return `${name} registers the message and holds the established context instead of resetting the scene. This local prototype is not connected to a language model yet, but the complete context packet has been assembled for the future model adapter.${continuity}`;
}

document.getElementById("chatForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if(!text) return;

  state.messages.push({ role:"user", text });
  const packet = buildContextPacket(text);
  console.log("NOCTIS_CONTEXT_PACKET", packet);

  state.messages.push({ role:"assistant", text:localEngineReply(text) });
  input.value = "";
  saveState();
  renderMessages();
});

document.getElementById("addLoreBtn").addEventListener("click", () => {
  state.lore.push({title:"",body:""});
  saveState(); renderEntries(loreList,"lore");
});
document.getElementById("addThreadBtn").addEventListener("click", () => {
  state.threads.push({title:"",body:""});
  saveState(); renderEntries(threadList,"threads");
});
document.getElementById("clearChatBtn").addEventListener("click", () => {
  if(confirm("Clear only the chat history? Character and memory will remain.")){
    state.messages = [];
    saveState(); renderMessages();
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(state.character.name || "noctis").replace(/\s+/g,"-").toLowerCase()}-noctis-export.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importInput").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    state = JSON.parse(await file.text());
    saveState();
    renderAll();
  }catch{
    alert("That file could not be imported.");
  }
  e.target.value = "";
});

function renderAll(){
  renderBasics();
  renderEntries(loreList,"lore");
  renderEntries(threadList,"threads");
  renderMessages();
}

bindBasics();
renderAll();
