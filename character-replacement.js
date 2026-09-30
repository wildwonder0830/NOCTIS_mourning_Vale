/* Noctis Mourning Vale v0.15.1 — Safe Character Profile Replacement Import
   Replaces character definition/profile canon while preserving live timelines,
   phone/social state, runtime IDs, and device-local conversation history.
*/
(() => {
  const BUILD="0.15.1";
  const copy=x=>JSON.parse(JSON.stringify(x));
  const PRESERVE=new Set([
    "id","chats","activeChatId","phoneContacts","activePhoneContactId",
    "createdAt","socialFollowerCount","socialUnread","nextSocialPostAt",
    "socialSeeded"
  ]);

  function isReplacement(parsed){
    return parsed?.format==="noctis-character-replacement" && parsed?.character && typeof parsed.character==="object";
  }

  function findTarget(parsed){
    const id=parsed.targetCharacterId||parsed.character?.id;
    if(id){
      const hit=(vault.characters||[]).find(c=>c.id===id);
      if(hit)return hit;
    }
    const wanted=String(parsed.targetName||parsed.character?.name||"").trim().toLowerCase();
    if(wanted){
      const exact=(vault.characters||[]).find(c=>String(c.name||"").trim().toLowerCase()===wanted);
      if(exact)return exact;
    }
    return null;
  }

  function replaceCharacter(parsed){
    const target=findTarget(parsed);
    if(!target)throw new Error(`Could not find the existing character “${parsed.targetName||parsed.character?.name||"unknown"}”.`);
    const src=parsed.character;
    const keep={};
    PRESERVE.forEach(k=>{if(k in target)keep[k]=target[k]});

    const oldName=target.name||"Character";
    const oldChatCount=Array.isArray(target.chats)?target.chats.length:0;
    const oldMsgCount=(target.chats||[]).reduce((n,ch)=>n+(ch?.messages?.length||0),0);

    /* Remove replaceable profile/canon keys, but keep unknown runtime fields
       that are not supplied by the replacement file. */
    const replaceKeys=new Set([
      "name","role","personality","backstory","voice","directives","permanentMemory","migrationNotes","lore",
      "species","height","weight","build","eyeColor","hairColor","hairStyle","skinTone","distinguishingFeatures",
      "apparentAge","actualAge","currentForm","sex","genderIdentity","pronouns","sexualOrientation","ethnicity",
      "occupation","relationshipStyle","appearance","powers","canon","preferences","profileSheet"
    ]);
    replaceKeys.forEach(k=>delete target[k]);

    Object.entries(src).forEach(([k,v])=>{
      if(PRESERVE.has(k))return;
      target[k]=copy(v);
    });
    Object.assign(target,keep);
    target.updatedAt=typeof now==="function"?now():new Date().toISOString();
    if(typeof saveVault==="function")saveVault();
    if(typeof renderAll==="function")renderAll();

    const newChatCount=Array.isArray(target.chats)?target.chats.length:0;
    const newMsgCount=(target.chats||[]).reduce((n,ch)=>n+(ch?.messages?.length||0),0);
    if(oldChatCount!==newChatCount || oldMsgCount!==newMsgCount){
      throw new Error("Safety check failed: timeline counts changed during profile replacement.");
    }
    return {name:target.name||oldName,chats:newChatCount,messages:newMsgCount};
  }

  document.addEventListener("change",async event=>{
    const input=event.target;
    if(input?.id!=="importInput")return;
    const file=input.files?.[0];
    if(!file || !/\.json$/i.test(file.name||""))return;
    let parsed;
    try{parsed=JSON.parse(await file.text())}catch{return}
    if(!isReplacement(parsed))return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try{
      const target=findTarget(parsed);
      if(!target)throw new Error(`No matching current character found for ${parsed.targetName||parsed.character?.name||file.name}.`);
      const chats=Array.isArray(target.chats)?target.chats.length:0;
      const msgs=(target.chats||[]).reduce((n,ch)=>n+(ch?.messages?.length||0),0);
      if(!confirm(`Replace ${target.name}'s CHARACTER SHEET and canon?\n\nPreserved: ${chats} chat(s), ${msgs} message(s), phone history, and runtime IDs.\n\nThe imported profile/canon will replace the current character definition.`))return;
      const done=replaceCharacter(parsed);
      alert(`${done.name}'s character sheet was replaced successfully.\n\nPreserved: ${done.chats} chat(s) and ${done.messages} messages.`);
    }catch(err){
      alert(`Character replacement failed: ${err?.message||String(err)}`);
    }finally{input.value=""}
  },true);

  window.NoctisCharacterReplacement={replaceCharacter,isReplacement};
})();
