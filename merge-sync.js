/* Noctis Mourning Vale v0.13.6 — Non-destructive Multi-Device Vault Merge */
(() => {
  const BUILD = "0.13.6";
  const copy = x => JSON.parse(JSON.stringify(x));
  const stamp = x => { const n = Date.parse(x || ""); return Number.isFinite(n) ? n : 0; };

  function msgKey(m){
    if(m?.id) return "id:" + m.id;
    return "fallback:" + [m?.role || "", m?.createdAt || "", String(m?.text || "").trim()].join("|");
  }

  function mergeMessages(a = [], b = []){
    const out = [], seen = new Set();
    for(const m of [...a, ...b]){
      if(!m) continue;
      const k = msgKey(m);
      if(seen.has(k)) continue;
      seen.add(k);
      out.push(copy(m));
    }
    out.sort((x,y) => {
      const ax = stamp(x?.createdAt), ay = stamp(y?.createdAt);
      if(ax && ay && ax !== ay) return ax - ay;
      return 0;
    });
    return out;
  }

  function itemKey(x, fallback, i){
    if(x?.id) return "id:" + x.id;
    const fb = fallback?.(x);
    if(fb) return "fallback:" + fb;
    return "anon:" + i + ":" + JSON.stringify(x);
  }

  function mergeArray(a = [], b = [], mergeFn = null, fallback = null){
    const out = [], map = new Map();
    a.forEach((x,i) => {
      const k = itemKey(x, fallback, i);
      const v = copy(x);
      map.set(k, v);
      out.push(v);
    });
    b.forEach((x,i) => {
      const k = itemKey(x, fallback, a.length + i);
      if(!map.has(k)){
        const v = copy(x);
        map.set(k, v);
        out.push(v);
        return;
      }
      if(!mergeFn) return;
      const old = map.get(k), merged = mergeFn(old, x);
      Object.keys(old).forEach(key => delete old[key]);
      Object.assign(old, merged);
    });
    return out;
  }

  function preferNewer(a,b){
    return copy(stamp(b?.updatedAt) > stamp(a?.updatedAt) ? b : a);
  }

  function mergeThreadMap(a = {}, b = {}){
    const out = {};
    for(const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])){
      out[id] = mergeMessages(a?.[id] || [], b?.[id] || []);
    }
    return out;
  }

  function mergeChat(a,b){
    const preferred = stamp(b?.updatedAt) > stamp(a?.updatedAt) ? b : a;
    const older = preferred === a ? b : a;
    const out = {...copy(older), ...copy(preferred)};

    out.messages = mergeMessages(a?.messages || [], b?.messages || []);
    out.milestones = mergeArray(a?.milestones || [], b?.milestones || [], preferNewer,
      x => `${x?.createdAt || ""}|${x?.text || ""}`);
    out.threads = mergeArray(a?.threads || [], b?.threads || [], preferNewer,
      x => `${x?.title || ""}|${x?.body || ""}`);
    out.sceneCast = mergeArray(a?.sceneCast || [], b?.sceneCast || [], preferNewer,
      x => String(x?.name || "").toLowerCase());
    out.beatLog = mergeArray(a?.beatLog || [], b?.beatLog || [], preferNewer,
      x => `${x?.createdAt || ""}|${x?.type || ""}|${x?.detail || ""}`);
    out.socialPosts = mergeArray(a?.socialPosts || [], b?.socialPosts || [], preferNewer,
      x => `${x?.createdAt || ""}|${x?.author || ""}|${x?.text || ""}`);
    out.phoneGroups = mergeArray(a?.phoneGroups || [], b?.phoneGroups || [], preferNewer,
      x => String(x?.name || "").toLowerCase());

    out.phoneThreads = mergeThreadMap(a?.phoneThreads || {}, b?.phoneThreads || {});
    out.groupThreads = mergeThreadMap(a?.groupThreads || {}, b?.groupThreads || {});

    out.phoneUnread = {...(a?.phoneUnread || {})};
    for(const [id,n] of Object.entries(b?.phoneUnread || {})){
      out.phoneUnread[id] = Math.max(Number(out.phoneUnread[id] || 0), Number(n || 0));
    }

    if(a?.storyStats || b?.storyStats){
      out.storyStats = {...(a?.storyStats || {})};
      for(const [k,v] of Object.entries(b?.storyStats || {})){
        out.storyStats[k] = Math.max(Number(out.storyStats[k] || 0), Number(v || 0));
      }
    }

    const newerScene = stamp(b?.updatedAt) > stamp(a?.updatedAt) ? b?.scene : a?.scene;
    const olderScene = newerScene === a?.scene ? b?.scene : a?.scene;
    out.scene = {...(olderScene || {}), ...(newerScene || {})};

    return out;
  }

  function mergeCharacter(a,b){
    const preferred = stamp(b?.updatedAt) > stamp(a?.updatedAt) ? b : a;
    const older = preferred === a ? b : a;
    const out = {...copy(older), ...copy(preferred)};

    out.chats = mergeArray(a?.chats || [], b?.chats || [], mergeChat,
      x => String(x?.title || "").toLowerCase());
    out.lore = mergeArray(a?.lore || [], b?.lore || [], preferNewer,
      x => `${x?.title || ""}|${x?.body || ""}`);
    out.phoneContacts = mergeArray(a?.phoneContacts || [], b?.phoneContacts || [], preferNewer,
      x => String(x?.name || x?.displayName || "").toLowerCase());

    if(!out.chats.some(ch => ch.id === out.activeChatId)) out.activeChatId = out.chats[0]?.id || null;
    return out;
  }

  function mergePersona(a,b){
    const preferred = stamp(b?.updatedAt) > stamp(a?.updatedAt) ? b : a;
    return {...copy(a), ...copy(b), ...copy(preferred)};
  }

  function mergeVaults(local, incoming){
    const out = {...copy(local)};

    out.personas = mergeArray(local?.personas || [], incoming?.personas || [], mergePersona,
      x => String(x?.slot || ""))
      .sort((x,y) => Number(x?.slot || 0) - Number(y?.slot || 0));

    out.characters = mergeArray(local?.characters || [], incoming?.characters || [], mergeCharacter,
      x => String(x?.name || "").toLowerCase());

    if(!out.characters.some(c => c.id === out.activeCharacterId)){
      out.activeCharacterId = out.characters.some(c => c.id === incoming?.activeCharacterId)
        ? incoming.activeCharacterId
        : (out.characters[0]?.id || null);
    }

    /* Canonicalize after the merge instead of inheriting feature-module versions. */
    out.version = window.NOCTIS_SCHEMA_VERSION || "0.7";
    out.updatedAt = new Date().toISOString();
    return out;
  }

  function vaultFrom(parsed){
    if(parsed?.format === "noctis-sync" && parsed?.vault?.characters) return parsed.vault;
    if(Array.isArray(parsed?.characters)) return parsed;
    return null;
  }

  function counts(v){
    return {
      chars: v?.characters?.length || 0,
      chats: (v?.characters || []).reduce((n,c) => n + (c?.chats?.length || 0), 0),
      msgs: (v?.characters || []).reduce((n,c) => n + (c?.chats || []).reduce((m,ch) => m + (ch?.messages?.length || 0), 0), 0)
    };
  }

  async function mergeFile(file, {confirmFirst = true, statusElement = null} = {}){
    if(!file) return false;
    const parsed = JSON.parse(await file.text());
    const incoming = vaultFrom(parsed);
    if(!incoming) throw new Error("That file is not a Noctis vault/sync file.");

    const here = counts(vault), there = counts(incoming);
    if(confirmFirst && !confirm(
      `Merge this file with the current device?\n\n` +
      `Current: ${here.chars} character(s), ${here.chats} chat(s), ${here.msgs} message(s)\n` +
      `Incoming: ${there.chars} character(s), ${there.chats} chat(s), ${there.msgs} message(s)\n\n` +
      `Unique data from BOTH sides will be kept.`
    )) return false;

    vault = mergeVaults(vault, incoming);
    if(typeof normalizeVaultV07 === "function") normalizeVaultV07();
    saveVault();
    renderAll();

    const done = counts(vault);
    if(statusElement) statusElement.textContent = `Merge complete • ${done.chars} character(s), ${done.chats} chat(s), ${done.msgs} messages.`;
    return true;
  }

  function makeSyncImportMergeByDefault(){
    const oldInput = document.getElementById("syncImportInput");
    const oldBtn = document.getElementById("importSyncBtn");
    if(!oldInput || !oldBtn || oldInput.dataset.mergeDefault === "1") return;

    /* Clone both controls to remove app.js's destructive replace listeners. */
    const input = oldInput.cloneNode(true);
    input.dataset.mergeDefault = "1";
    oldInput.parentNode.replaceChild(input, oldInput);

    const btn = oldBtn.cloneNode(true);
    btn.textContent = "Merge Vault Here";
    btn.dataset.mergeDefault = "1";
    oldBtn.parentNode.replaceChild(btn, oldBtn);

    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if(!file) return;
      const status = document.getElementById("syncStatus");
      try{
        if(status) status.textContent = "Merging vaults…";
        const ok = await mergeFile(file, {confirmFirst:true, statusElement:status});
        if(ok){
          if(status && !status.textContent) status.textContent = "Merge complete.";
          alert("Merge complete. Unique chats and messages from both devices were preserved.");
        }
      }catch(err){
        if(status) status.textContent = `Could not merge vault: ${err?.message || String(err)}`;
        alert(`Could not merge vault: ${err?.message || String(err)}`);
      }finally{
        input.value = "";
      }
    });

    const note = document.querySelector("#syncModal .sync-note");
    if(note) note.innerHTML = "<strong>iPhone/iPad:</strong> Share Current Vault → AirDrop or Save to Files/iCloud Drive → open Noctis on the other device → Merge Vault Here. Unique data from both devices is kept.";
  }

  function injectOptionalMergeButton(){
    const card = document.querySelector("#syncModal .sync-card");
    const actions = card?.querySelector(".sync-actions");
    if(!card || !actions || document.getElementById("mergeVaultBtn")) return;

    const btn = document.createElement("button");
    btn.id = "mergeVaultBtn";
    btn.type = "button";
    btn.className = "ghost";
    btn.textContent = "Merge Another Vault";

    const input = document.createElement("input");
    input.id = "mergeSyncInput";
    input.type = "file";
    input.accept = ".json,.noctis,application/json";
    input.hidden = true;

    const status = document.createElement("div");
    status.id = "mergeSyncStatus";
    status.className = "test-result";

    actions.appendChild(btn);
    card.appendChild(input);
    card.appendChild(status);

    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if(!file) return;
      try{
        const ok = await mergeFile(file, {confirmFirst:true, statusElement:status});
        if(ok) alert("Merge complete. Unique chats and messages from both devices were preserved.");
      }catch(err){
        status.textContent = `Merge failed: ${err?.message || String(err)}`;
        alert(`Could not merge vault: ${err?.message || String(err)}`);
      }finally{
        input.value = "";
      }
    });
  }


  function interceptTopBarVaultImports(){
    if(document.documentElement.dataset.noctisVaultMergeIntercept === "1") return;
    document.documentElement.dataset.noctisVaultMergeIntercept = "1";

    /*
      Backup -> Import is the workflow people naturally use between devices.
      Intercept files that clearly identify themselves as Noctis vault/sync
      backups and merge them instead of allowing the older importer to replace
      the local vault. Character/persona JSON continues to the normal importer.
    */
    document.addEventListener("change", async event => {
      const input = event.target;
      if(input?.id !== "importInput") return;
      const file = input.files?.[0];
      if(!file) return;

      const name = String(file.name || "").toLowerCase();
      const looksLikeVaultFile =
        name.includes("noctis-vault") ||
        name.includes("vault-backup") ||
        name.startsWith("noctis-sync-");

      if(!looksLikeVaultFile) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      try{
        const ok = await mergeFile(file, {confirmFirst:true});
        if(ok) alert("Backup merged. Unique chats and messages from both devices were preserved.");
      }catch(err){
        alert(`Could not merge backup: ${err?.message || String(err)}`);
      }finally{
        input.value = "";
      }
    }, true);
  }

  window.NoctisMerge = { mergeVaults, mergeFile, vaultFrom, counts };

  interceptTopBarVaultImports();
  makeSyncImportMergeByDefault();
  injectOptionalMergeButton();
  new MutationObserver(() => {
    makeSyncImportMergeByDefault();
    injectOptionalMergeButton();
  }).observe(document.body, {childList:true, subtree:true});

  const badge = document.getElementById("buildBadge");
  if(badge) badge.textContent = "v" + BUILD;
})();
