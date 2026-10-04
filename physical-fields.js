/* Noctis Mourning Vale v0.13.0 — Structured Physical Canon */
(() => {
  const BUILD="0.13.0";

  const CHARACTER_FIELDS=[
    ["charSpecies","species","Species / Nature","Human, werewolf, vampire, witch…"],
    ["charHeight","height","Height","6'4\""],
    ["charWeight","weight","Weight","Optional"],
    ["charBuild","build","Build / Body Type","Lean, broad, petite, athletic…"],
    ["charEyes","eyeColor","Eye Color","Hazel, blue, amber…"],
    ["charHairColor","hairColor","Hair Color","Black, dark brown…"],
    ["charHairStyle","hairStyle","Hair Length / Style","Long curls, cropped, shaved sides…"],
    ["charSkin","skinTone","Skin Tone","Very fair, olive, deep brown…"],
    ["charFeatures","distinguishingFeatures","Distinguishing Features","Scars, tattoos, piercings, birthmarks…"],
    ["charApparentAge","apparentAge","Apparent Age","Looks early 30s"],
    ["charActualAge","actualAge","Actual Age","Optional / supernatural"],
    ["charCurrentForm","currentForm","Current Form","Human, wolf, transformed…"]
  ];

  const PERSONA_FIELDS=[
    ["personaHeight","height","Height","4'11\""],
    ["personaWeight","weight","Weight","Optional"],
    ["personaBuild","build","Build / Body Type","Petite, hourglass…"],
    ["personaEyes","eyeColor","Eye Color","Hazel"],
    ["personaHairColor","hairColor","Hair Color","Dark brown"],
    ["personaHairStyle","hairStyle","Hair Length / Style","Long, wavy…"],
    ["personaSkin","skinTone","Skin Tone","Very fair"],
    ["personaFeatures","distinguishingFeatures","Distinguishing Features","Scars, tattoos, piercings…"],
    ["personaApparentAge","apparentAge","Apparent Age","24"],
    ["personaActualAge","actualAge","Actual Age","Much older / immortal"],
    ["personaCurrentForm","currentForm","Current Form","Human-presenting, transformed…"]
  ];

  function ensurePhysicalFields(){
    ensurePersonas(vault);
    (vault.personas||[]).forEach(p=>{
      PERSONA_FIELDS.forEach(([,key])=>{if(typeof p[key]!=="string")p[key]=""});
    });
    (vault.characters||[]).forEach(c=>{
      const members=typeof allCastMembers==="function"?allCastMembers(c):(typeof ensureCastMembers==="function"?[c,...ensureCastMembers(c)]:[c]);
      members.forEach(member=>CHARACTER_FIELDS.forEach(([,key])=>{if(typeof member[key]!=="string")member[key]=""}));
    });
  }

  function fieldGrid(fields,prefix){
    const wrap=document.createElement("div");
    wrap.className="physical-canon-grid";
    fields.forEach(([id,key,label,placeholder])=>{
      const lab=document.createElement("label");
      lab.innerHTML=`${label}<input id="${id}" data-physical-key="${key}" data-physical-owner="${prefix}" placeholder="${placeholder}" />`;
      wrap.appendChild(lab);
    });
    return wrap;
  }

  function injectCharacterUI(){
    const view=document.querySelector('[data-view="character"] .panel');
    if(!view || document.getElementById("characterPhysicalCanon"))return;

    const appearanceLike=[...view.querySelectorAll("label")].find(l=>/personality/i.test(l.textContent||""));
    const box=document.createElement("div");
    box.id="characterPhysicalCanon";
    box.className="memory-compact-card physical-canon-card";
    box.innerHTML=`<div class="section-title-row"><div><h2 class="subhead">Physical Canon</h2><p class="hint">Stable facts live here so the model does not have to dig them out of prose.</p></div></div>`;
    box.appendChild(fieldGrid(CHARACTER_FIELDS,"character"));

    if(appearanceLike)view.insertBefore(box,appearanceLike);
    else view.appendChild(box);
  }

  function injectPersonaUI(){
    const view=document.querySelector('[data-view="persona"] .panel');
    if(!view || document.getElementById("personaPhysicalCanon"))return;

    const appearanceLabel=[...view.querySelectorAll("label")].find(l=>/^Appearance \/ Body/i.test((l.firstChild?.textContent||l.textContent||"").trim()));
    const box=document.createElement("div");
    box.id="personaPhysicalCanon";
    box.className="memory-compact-card physical-canon-card";
    box.innerHTML=`<div class="section-title-row"><div><h2 class="subhead">Physical Canon</h2><p class="hint">Height, eyes, hair, age presentation, and other fixed traits stay separate from descriptive prose.</p></div></div>`;
    box.appendChild(fieldGrid(PERSONA_FIELDS,"persona"));

    if(appearanceLabel)view.insertBefore(box,appearanceLabel);
    else view.appendChild(box);
  }

  function renderPhysicalFields(){
    ensurePhysicalFields();
    const c=typeof activeCastMember==="function"?activeCastMember():activeCharacter(),p=activePersona();

    CHARACTER_FIELDS.forEach(([id,key])=>{
      const el=document.getElementById(id);
      if(el)el.value=c?.[key]||"";
    });
    PERSONA_FIELDS.forEach(([id,key])=>{
      const el=document.getElementById(id);
      if(el)el.value=p?.[key]||"";
    });
  }

  function bindPhysicalFields(){
    document.querySelectorAll("[data-physical-key]").forEach(el=>{
      if(el.dataset.boundPhysical==="1")return;
      el.dataset.boundPhysical="1";
      el.addEventListener("input",()=>{
        const owner=el.dataset.physicalOwner,key=el.dataset.physicalKey;
        if(owner==="character"){
          const c=typeof activeCastMember==="function"?activeCastMember():activeCharacter();if(c){c[key]=el.value;c.updatedAt=now();}
        }else{
          const p=activePersona();p[key]=el.value;p.updatedAt=now();
        }
        saveVault();
      });
    });
  }

  function physicalBlock(label,obj,fields){
    const rows=[];
    fields.forEach(([,key,fieldLabel])=>{
      const v=String(obj?.[key]||"").trim();
      if(v)rows.push(`${fieldLabel}: ${v}`);
    });
    return rows.length?`${label}\n${rows.join("\n")}`:"";
  }

  /* Structured canon is appended after normal prose so it is easy for the model
     to retrieve and harder for height/eye/species facts to drift. */
  if(typeof compileSystemPrompt==="function" && !window.__noctisPhysicalPromptPatched){
    const baseCompile=compileSystemPrompt;
    compileSystemPrompt=function(){
      ensurePhysicalFields();
      const cast=(typeof sceneCastMembers==="function"?sceneCastMembers():[(typeof activeCastMember==="function"?activeCastMember():activeCharacter())]).filter(Boolean),p=activePersona();
      const blocks=[
        ...cast.map(member=>physicalBlock(`CHARACTER PHYSICAL CANON — ${member.name||"UNNAMED"} — FIXED FACTS`,member,CHARACTER_FIELDS)),
        physicalBlock("PROTAGONIST PHYSICAL CANON — FIXED FACTS",p,PERSONA_FIELDS)
      ].filter(Boolean);

      if(!blocks.length)return baseCompile();

      return baseCompile()+`\n\n${blocks.join("\n\n")}

PHYSICAL CONTINUITY RULES
- Treat the structured physical canon above as authoritative.
- Never silently change height, eye color, hair color, species/nature, apparent age, or other fixed physical facts.
- Preserve size and height differences accurately in scene blocking, eye level, embraces, kissing, carrying, dancing, seating, and movement.
- If prose description conflicts with a structured field, the structured field wins unless the user explicitly changes canon.
- SKIN TONE / COMPLEXION IS A LOCKED PHYSICAL FACT. If Skin Tone is populated, use that exact complexion and never substitute another.
- Words such as "dark", "gothic", "witchy", "elegant", "shadowy", "black-clad", or similar aesthetic/style language NEVER describe skin color unless the Skin Tone field itself explicitly says so.
- Never infer complexion from hair color, clothing, makeup, genre, ethnicity, supernatural archetype, lighting, mood, or the adjective "dark" used anywhere outside the Skin Tone field.
- If Skin Tone says "Very fair" or "fair", descriptions such as dark-skinned, brown-skinned, tan, olive, dusky, bronze, caramel, or similar contradictory complexions are forbidden and non-canon.
- Weight and current form may change only when story canon explicitly establishes a change.`;
    };
    window.__noctisPhysicalPromptPatched=true;
  }

  /* Add structured fields to persona exports. */
  if(typeof exportActivePersona==="function" && !window.__noctisPersonaPhysicalExportPatched){
    exportActivePersona=function(){
      ensurePhysicalFields();
      const p=activePersona();
      const data={
        name:p.name||"",age:p.age||"",pronouns:p.pronouns||"",species:p.species||"",
        occupation:p.occupation||"",relationshipStyle:p.relationshipStyle||"",
        appearance:p.appearance||"",personality:p.personality||"",powers:p.powers||"",
        canon:p.canon||"",preferences:p.preferences||""
      };
      PERSONA_FIELDS.forEach(([,key])=>data[key]=p[key]||"");
      const payload={
        app:"Noctis Mourning Vale",
        format:"noctis-persona",
        version:BUILD,
        targetSlot:Number(p.slot)||null,
        exportedAt:new Date().toISOString(),
        persona:{slot:Number(p.slot)||null,...data}
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;
      const safe=(p?.name||"persona").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"persona";
      a.download=`${safe}.noctis-persona.json`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    window.__noctisPersonaPhysicalExportPatched=true;
  }

  /* Render hooks */
  const oldRenderAll=renderAll;
  renderAll=function(){
    ensurePhysicalFields();
    oldRenderAll();
    injectCharacterUI();injectPersonaUI();bindPhysicalFields();renderPhysicalFields();
  };

  if(typeof renderPersonaFields==="function"){
    const oldRenderPersonaFields=renderPersonaFields;
    renderPersonaFields=function(){
      oldRenderPersonaFields();
      injectPersonaUI();bindPhysicalFields();renderPhysicalFields();
    };
  }

  ensurePhysicalFields();
  injectCharacterUI();injectPersonaUI();bindPhysicalFields();renderPhysicalFields();
  saveVault();

  const style=document.createElement("style");
  style.textContent=`
    .physical-canon-card{margin:14px 0}
    .physical-canon-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    @media(max-width:700px){.physical-canon-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const badge=document.getElementById("buildBadge");
  if(badge)badge.textContent="v"+BUILD;
})();