/* Noctis Mourning Vale v0.15.2 — Compatibility / Shared Data Guard */
(() => {
  const BUILD = "0.15.2";
  const SCHEMA = "0.7";
  const str = v => typeof v === "string" ? v : "";
  const arr = v => Array.isArray(v) ? v : [];
  const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};

  window.NOCTIS_SCHEMA_VERSION = SCHEMA;
  window.NOCTIS_CURRENT_BUILD = BUILD;

  const PERSONA_STRING_FIELDS = [
    "name","age","pronouns","species","occupation","relationshipStyle",
    "appearance","personality","powers","canon","preferences",
    "height","weight","build","eyeColor","hairColor","hairStyle","skinTone",
    "distinguishingFeatures","apparentAge","actualAge","currentForm"
  ];
  const CHARACTER_STRING_FIELDS = [
    "name","role","personality","backstory","voice","directives",
    "permanentMemory","migrationNotes","species","height","weight","build",
    "eyeColor","hairColor","hairStyle","skinTone","distinguishingFeatures",
    "apparentAge","actualAge","currentForm"
  ];

  function ensureMessage(m){
    if(!m || typeof m !== "object") return null;
    if(!m.id && typeof uid === "function") m.id = uid();
    if(typeof m.role !== "string") m.role = "assistant";
    if(typeof m.text !== "string") m.text = String(m.text ?? "");
    return m;
  }

  function ensureChat(ch){
    if(!ch || typeof ch !== "object") ch = {};
    if(!ch.id && typeof uid === "function") ch.id = uid();
    if(typeof ch.title !== "string") ch.title = "Main Story";
    ch.messages = arr(ch.messages).map(ensureMessage).filter(Boolean);
    if(typeof ch.relationshipMemory !== "string") ch.relationshipMemory = "";
    if(typeof ch.consolidatedMemory !== "string") ch.consolidatedMemory = "";
    if(!("consolidatedThroughMessageId" in ch)) ch.consolidatedThroughMessageId = null;
    ch.scene = {
      location: str(ch.scene?.location), time: str(ch.scene?.time),
      state: str(ch.scene?.state), emotion: str(ch.scene?.emotion)
    };
    ch.threads = arr(ch.threads);
    ch.milestones = arr(ch.milestones);
    if(!("activePersonaId" in ch)) ch.activePersonaId = null;
    if(typeof ch.castFocus !== "string") ch.castFocus = "";
    if(typeof ch.pendingMilestone !== "boolean") ch.pendingMilestone = false;

    /* Living-world / stats / social / phone fields are additive. Never delete
       unknown properties: newer feature modules may own them. */
    ch.socialPosts = arr(ch.socialPosts);
    if(!Number.isFinite(Number(ch.socialUnread))) ch.socialUnread = 0;
    if(!Number.isFinite(Number(ch.socialFollowerCount))) ch.socialFollowerCount = 0;
    ch.storyStats = obj(ch.storyStats);
    ch.sceneCast = arr(ch.sceneCast);
    ch.beatLog = arr(ch.beatLog);
    ch.phoneThreads = obj(ch.phoneThreads);
    ch.phoneGroups = arr(ch.phoneGroups);
    ch.groupThreads = obj(ch.groupThreads);
    ch.phoneUnread = obj(ch.phoneUnread);
    if(typeof ch.phoneAwayNote !== "string") ch.phoneAwayNote = "";
    return ch;
  }

  function ensurePersona(p, index){
    if(!p || typeof p !== "object") p = {};
    if(!p.id && typeof uid === "function") p.id = uid();
    p.slot = Number.isFinite(Number(p.slot)) ? Number(p.slot) : index + 1;
    PERSONA_STRING_FIELDS.forEach(k => { if(typeof p[k] !== "string") p[k] = ""; });
    return p;
  }

  function ensureCharacter(c){
    if(!c || typeof c !== "object") c = {};
    if(!c.id && typeof uid === "function") c.id = uid();
    CHARACTER_STRING_FIELDS.forEach(k => { if(typeof c[k] !== "string") c[k] = ""; });
    c.lore = arr(c.lore);
    c.chats = arr(c.chats).map(ensureChat);
    c.phoneContacts = arr(c.phoneContacts);
    if(!c.chats.length && typeof newChat === "function") c.chats.push(newChat());
    if(c.chats.length && !c.chats.some(ch => ch.id === c.activeChatId)) c.activeChatId = c.chats[0].id;
    return c;
  }

  function normalizeSharedShape(){
    if(typeof vault === "undefined" || !vault || typeof vault !== "object") return;
    if(typeof ensurePersonas === "function") ensurePersonas(vault);
    vault.personas = arr(vault.personas).map(ensurePersona);
    vault.characters = arr(vault.characters).map(ensureCharacter);
    if(vault.characters.length && !vault.characters.some(c => c.id === vault.activeCharacterId)){
      vault.activeCharacterId = vault.characters[0].id;
    }
    vault.version = SCHEMA;
  }

  /* Feature modules historically stamp 0.8/0.9 into vault.version. Keep those
     feature versions separate from the persisted vault schema. */
  if(typeof saveVault === "function" && !window.__noctisCompatSaveWrapped){
    const baseSaveVault = saveVault;
    saveVault = function(){
      normalizeSharedShape();
      vault.version = SCHEMA;
      return baseSaveVault();
    };
    window.__noctisCompatSaveWrapped = true;
  }

  function audit(){
    const required = [
      "app.js","phone.js","phone-fix.js","stats.js","social.js",
      "phone-rp-sync.js","physical-fields.js","import-fix.js","runtime-fixes.js",
      "compatibility-core.js","merge-sync.js","backup-format-fix.js","profile-sheet.js","character-replacement.js","build-version.js"
    ];
    const loaded = [...document.scripts].map(s => (s.getAttribute("src") || "").split("?")[0].split("/").pop()).filter(Boolean);
    const missing = required.filter(x => !loaded.includes(x));
    return {
      build: BUILD,
      schema: SCHEMA,
      missingScripts: missing,
      characterCount: vault?.characters?.length || 0,
      personaCount: vault?.personas?.length || 0,
      ok: missing.length === 0
    };
  }

  normalizeSharedShape();
  if(typeof saveVault === "function") saveVault();

  window.NoctisCompat = { build:BUILD, schema:SCHEMA, normalizeSharedShape, audit };

  const report = audit();
  if(!report.ok) console.warn("Noctis compatibility audit found missing scripts:", report.missingScripts);
})();
