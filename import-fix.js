/* Noctis Mourning Vale v0.12.1 — Full Character JSON Import */
(() => {
  const BUILD="0.12.1";

  const str=v=>typeof v==="string"?v:"";
  const arr=v=>Array.isArray(v)?v:[];
  const pick=(obj,keys)=>{
    for(const k of keys){
      const v=obj?.[k];
      if(typeof v==="string" && v.trim())return v.trim();
    }
    return "";
  };
  const uniqueText=parts=>[...new Set(parts.map(x=>String(x||"").trim()).filter(Boolean))].join("\n\n");

  function unwrapCharacterJson(parsed){
    if(!parsed || typeof parsed!=="object")return null;

    /* Native Noctis character wrappers. */
    if(parsed.format==="noctis-character" && parsed.character)return parsed.character;
    if(parsed.character && typeof parsed.character==="object" && !Array.isArray(parsed.characters))return parsed.character;

    /* Character Card V2 / Tavern style. */
    if(parsed.spec==="chara_card_v2" && parsed.data && typeof parsed.data==="object")return parsed.data;
    if(parsed.data && typeof parsed.data==="object" &&
       (parsed.data.name || parsed.data.description || parsed.data.personality || parsed.data.first_mes))return parsed.data;

    /* Direct character object. */
    if(parsed.name && (
      parsed.description!==undefined ||
      parsed.personality!==undefined ||
      parsed.backstory!==undefined ||
      parsed.scenario!==undefined ||
      parsed.first_mes!==undefined ||
      parsed.greeting!==undefined ||
      parsed.character_book!==undefined ||
      parsed.lore!==undefined
    ))return parsed;

    return null;
  }

  function isPersonaJson(parsed){
    if(parsed?.format==="noctis-persona" && parsed?.persona)return true;
    if(parsed?.persona && typeof parsed.persona==="object" && !Array.isArray(parsed.characters) &&
       !parsed.character && !parsed.spec)return true;

    /* Only treat a direct object as a persona when it has persona-specific
       fields. A Character Card with name+personality must NOT be mistaken
       for a persona anymore. */
    return !!(parsed?.name && (
      parsed.age!==undefined ||
      parsed.pronouns!==undefined ||
      parsed.appearance!==undefined ||
      parsed.powers!==undefined ||
      parsed.relationshipStyle!==undefined ||
      parsed.preferences!==undefined
    ) && !parsed.scenario && !parsed.first_mes && !parsed.greeting && !parsed.character_book);
  }

  function normalizeLoreEntry(entry,index){
    if(!entry || typeof entry!=="object")return null;

    const title=pick(entry,["title","name","comment","key","label"]) ||
      (Array.isArray(entry.keys)&&entry.keys.length?entry.keys.join(", "):`Lore ${index+1}`);

    const body=pick(entry,["body","content","text","value","description"]);
    if(!body)return null;
    return {title,body};
  }

  function extractLore(src){
    const out=[];

    arr(src.lore).forEach((e,i)=>{
      const n=normalizeLoreEntry(e,i);if(n)out.push(n);
    });

    arr(src.lorebook).forEach((e,i)=>{
      const n=normalizeLoreEntry(e,i);if(n)out.push(n);
    });

    const book=src.character_book || src.characterBook || src.world_book || src.worldBook;
    if(book && typeof book==="object"){
      arr(book.entries).forEach((e,i)=>{
        const n=normalizeLoreEntry(e,i);if(n)out.push(n);
      });
    }

    /* Some exporters store lore entries as an object map. */
    if(src.lore && !Array.isArray(src.lore) && typeof src.lore==="object"){
      Object.entries(src.lore).forEach(([k,v],i)=>{
        if(typeof v==="string" && v.trim())out.push({title:k||`Lore ${i+1}`,body:v.trim()});
        else{
          const n=normalizeLoreEntry(v,i);if(n)out.push(n);
        }
      });
    }

    const seen=new Set();
    return out.filter(e=>{
      const key=(e.title+"\n"+e.body).trim().toLowerCase();
      if(!key || seen.has(key))return false;
      seen.add(key);return true;
    });
  }

  function normalizeMessage(m){
    if(!m)return null;
    if(typeof m==="string")return {id:uid(),role:"assistant",text:m,archivedImport:true};

    const text=pick(m,["text","content","message","mes","value"]);
    if(!text)return null;

    let role=String(m.role||m.speaker||m.author||"").toLowerCase();
    if(["user","you","human","protagonist","player","amanda"].includes(role))role="user";
    else if(["assistant","character","bot","ai","char"].includes(role))role="assistant";
    else if(m.is_user===true || m.isUser===true)role="user";
    else role="assistant";

    return {
      ...m,
      id:m.id||uid(),
      role,
      text,
      archivedImport:true
    };
  }

  function extractMessages(src){
    const candidates=[
      src.messages,
      src.chat,
      src.history,
      src.transcript,
      src.conversation,
      src.dialogue
    ];
    for(const v of candidates){
      if(Array.isArray(v)){
        const rows=v.map(normalizeMessage).filter(Boolean);
        if(rows.length)return rows;
      }
    }
    return [];
  }

  function importCharacterIntoActive(src,fileName="character.json"){
    const c=activeCharacter();
    const ch=activeChat();
    const imported=[];

    const name=pick(src,["name","char_name","character_name"]);
    const role=pick(src,["role","archetype","occupation","title"]);
    const personality=pick(src,["personality","personality_summary","traits","character_personality"]);

    const backstory=uniqueText([
      pick(src,["backstory","history","biography","bio","background"]),
      pick(src,["description","character_description","description_text"])
    ]);

    const voice=uniqueText([
      pick(src,["voice","speech","speech_style","voice_and_speech","dialogue_style"]),
      pick(src,["example_dialogue","example dialogue","mes_example","example_messages"])
    ]);

    const directives=uniqueText([
      pick(src,["directives","response_directives","system_prompt","system instructions","system_instructions"]),
      pick(src,["post_history_instructions","instructions","behavior_rules","rules"])
    ]);

    const permanentMemory=uniqueText([
      pick(src,["permanentMemory","permanent_memory","canon","continuity","continuity_notes","continuity notes"]),
      pick(src,["world_info","worldInfo"])
    ]);

    const migrationNotes=uniqueText([
      pick(src,["migrationNotes","migration_notes","notes","creator_notes","creatorcomment","creatorcommentary"]),
      Array.isArray(src.tags)&&src.tags.length?`Tags: ${src.tags.join(", ")}`:""
    ]);

    if(name){c.name=name;imported.push("name")}
    if(role){c.role=role;imported.push("role")}
    if(personality){c.personality=personality;imported.push("personality")}
    if(backstory){c.backstory=backstory;imported.push("backstory/description")}
    if(voice){c.voice=voice;imported.push("voice/example dialogue")}
    if(directives){c.directives=directives;imported.push("response/system directives")}
    if(permanentMemory){c.permanentMemory=permanentMemory;imported.push("canon/continuity")}
    if(migrationNotes){c.migrationNotes=migrationNotes;imported.push("notes/tags")}

    const scenario=uniqueText([
      pick(src,["scenario","scene","scene_state","first_scene","first scene","opening_scene","opening scene"]),
      pick(src,["context","setting"])
    ]);
    if(scenario){
      ch.scene=ch.scene||{location:"",time:"",state:"",emotion:""};
      ch.scene.state=scenario;
      imported.push("scenario/current scene");
    }

    const relationshipMemory=uniqueText([
      pick(src,["relationshipMemory","relationship_memory","relationship","relationship_state"])
    ]);
    if(relationshipMemory){
      ch.relationshipMemory=relationshipMemory;
      imported.push("relationship memory");
    }

    const lore=extractLore(src);
    if(lore.length){
      c.lore=Array.isArray(c.lore)?c.lore:[];
      const existing=new Set(c.lore.map(e=>(String(e.title||"")+"\n"+String(e.body||"")).toLowerCase()));
      lore.forEach(e=>{
        const key=(e.title+"\n"+e.body).toLowerCase();
        if(!existing.has(key)){c.lore.push(e);existing.add(key)}
      });
      imported.push(`${lore.length} lore entr${lore.length===1?"y":"ies"}`);
    }

    const structuredMessages=extractMessages(src);
    if(structuredMessages.length){
      if(!Array.isArray(ch.messages))ch.messages=[];
      if(ch.messages.length===0){
        ch.messages.push(...structuredMessages);
        imported.push(`${structuredMessages.length} transcript messages`);
      }else{
        const ok=confirm(`This JSON contains ${structuredMessages.length} transcript messages. Append them to the current timeline?`);
        if(ok){
          ch.messages.push(...structuredMessages);
          imported.push(`${structuredMessages.length} transcript messages`);
        }
      }
    }

    /* Character Card greeting / first_mes belongs in the timeline, not in the
       character profile. It is added only if it isn't already there. */
    const greeting=pick(src,["first_mes","first_message","greeting","firstMessage","opening_message","opening message"]);
    if(greeting){
      if(!Array.isArray(ch.messages))ch.messages=[];
      const exists=ch.messages.some(m=>m.role==="assistant" && String(m.text||"").trim()===greeting.trim());
      if(!exists){
        const canAdd=ch.messages.length===0 ||
          confirm(`This character card has an opening message/first scene. Add it to the current timeline?`);
        if(canAdd){
          ch.messages.push({id:uid(),role:"assistant",text:greeting,archivedImport:true,importSource:fileName});
          imported.push("opening message");
        }
      }
    }

    /* Native Noctis card format can contain full chats. Import every chat,
       not only the first one. */
    if(Array.isArray(src.chats) && src.chats.length){
      const normalizedChats=src.chats.map((incoming,i)=>{
        const n=newChat(incoming?.title||`Imported Timeline ${i+1}`);
        n.id=incoming?.id||uid();
        n.title=incoming?.title||n.title;
        n.messages=arr(incoming?.messages).map(normalizeMessage).filter(Boolean);
        n.relationshipMemory=str(incoming?.relationshipMemory||incoming?.relationship_memory);
        n.consolidatedMemory=str(incoming?.consolidatedMemory||incoming?.consolidated_memory);
        n.consolidatedThroughMessageId=incoming?.consolidatedThroughMessageId||null;
        n.scene={...n.scene,...(incoming?.scene||{})};
        n.threads=arr(incoming?.threads);
        n.milestones=arr(incoming?.milestones);
        n.activePersonaId=incoming?.activePersonaId||ch.activePersonaId||null;
        return n;
      });

      /* Avoid duplicating current chat if we already imported profile/scenario
         from the same card: imported timelines are added as separate chats. */
      normalizedChats.forEach(n=>c.chats.push(n));
      c.activeChatId=normalizedChats[0]?.id||c.activeChatId;
      imported.push(`${normalizedChats.length} complete timeline${normalizedChats.length===1?"":"s"}`);
    }

    for(const k of ["species","height","weight","build","eyeColor","hairColor","hairStyle","skinTone","distinguishingFeatures","apparentAge","actualAge","currentForm"]){
      if(typeof src[k]==="string")c[k]=src[k];
    }
    if(src.profileSheet && typeof src.profileSheet==="object")c.profileSheet=clone(src.profileSheet);
    c.updatedAt=now();
    ch.updatedAt=now();
    saveVault();
    if(typeof normalizeVaultV07==="function")normalizeVaultV07();
    saveVault();
    renderAll();

    const summary=imported.length?imported.join(", "):"no recognized character fields";
    alert(`Character JSON import complete.\n\nImported: ${summary}.\n\nFile: ${fileName}`);
  }

  async function robustImport(file){
    if(!file)return;
    const raw=await file.text();

    if(file.name.toLowerCase().endsWith(".txt")){
      const ch=activeChat();
      ch.messages.push({id:uid(),role:"assistant",text:`[Imported transcript archive: ${file.name}]\n\n${raw}`});
      ch.updatedAt=now();saveVault();renderAll();
      alert("Text transcript archived in the active chat.");
      return;
    }

    const parsed=JSON.parse(raw);

    // Route by content once; async document listeners cannot cancel an event
    // after awaiting file.text(). Never let replacement files reach card import.
    if(window.NoctisCharacterReplacement?.isReplacement(parsed)){
      window.NoctisCharacterReplacement.importParsed(parsed);
      return;
    }
    if(window.NoctisMerge?.vaultFrom(parsed)){
      const ok=await window.NoctisMerge.mergeFile(file);
      if(ok)alert("Backup merged. Unique chats and messages from both devices were preserved.");
      return;
    }
    if(parsed?.format==="noctis-persona" || parsed?.persona){
      window.NoctisProfileSheet.importPersona(parsed);
      return;
    }

    /* Persona imports remain supported, but only after we have ruled out a
       character card. This fixes Character Card V2 being mistaken for persona. */
    const character=unwrapCharacterJson(parsed);
    if(character){
      importCharacterIntoActive(character,file.name);
      return;
    }

    if(isPersonaJson(parsed)){
      const src=parsed?.persona&&typeof parsed.persona==="object"?parsed.persona:parsed;
      window.NoctisProfileSheet.importPersona(parsed);
      return;
    }

    /* Very old Noctis legacy backup. */
    if(parsed?.character || parsed?.messages){
      vault=migrateLegacy(parsed);saveVault();renderAll();
      alert("Legacy import complete.");
      return;
    }

    throw new Error("Unknown JSON format. Noctis could not find a vault, persona, or character card in this file.");
  }

  function replaceImporter(){
    const old=document.getElementById("importInput");
    if(!old || old.dataset.fullJsonImport==="1")return;

    /* Clone removes the old app.js change listener without changing layout. */
    const fresh=old.cloneNode(true);
    fresh.dataset.fullJsonImport="1";
    fresh.accept="application/json,.json,.txt,.noctis";
    old.parentNode.replaceChild(fresh,old);

    fresh.addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        await robustImport(file);
      }catch(err){
        alert(`That file could not be imported: ${err?.message||String(err)}`);
      }finally{
        e.target.value="";
      }
    });
  }

  replaceImporter();

  /* Character-card fields are imported into the active Character vault entry,
     while complete Noctis backups still replace the full vault exactly as before. */
  const badge=document.getElementById("buildBadge");
  if(badge)badge.textContent="v"+BUILD;
})();