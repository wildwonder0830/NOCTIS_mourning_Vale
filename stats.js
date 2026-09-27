/* Noctis Mourning Vale v0.9.0 — Story Stats + RP formatting */
(() => {
  const BUILD = "0.9.3";
  const COUNTERS = [
    ["sex","Sex"],
    ["kisses","Kisses"],
    ["dates","Dates"],
    ["fights","Fights"],
    ["transformations","Transformations"],
    ["majorInjuries","Major injuries"]
  ];

  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

  function ensureStats(){
    (vault.characters||[]).forEach(c=>{
      (c.chats||[]).forEach(ch=>{
        if(!ch.storyStats || typeof ch.storyStats!=="object") ch.storyStats={};
        COUNTERS.forEach(([k])=>{if(!Number.isFinite(Number(ch.storyStats[k])))ch.storyStats[k]=0;});
        if(!Array.isArray(ch.sceneCast)) ch.sceneCast=[];
        if(!Array.isArray(ch.beatLog)) ch.beatLog=[];
        if(!("statsScanThroughMessageId" in ch)) ch.statsScanThroughMessageId=null;
      });
    });
    vault.version="0.9";
  }

  function defaultParticipant(name="",species=""){
    return {id:uid(),name,species,health:"",clothing:"",status:"",notes:"",updatedAt:now()};
  }

  function seedSceneCast(){
    ensureStats();
    const ch=activeChat();
    if(ch.sceneCast.length)return;
    const p=activePersona();
    const c=activeCharacter();
    if(p?.name) ch.sceneCast.push(defaultParticipant(p.name,p.species||""));
    if(c?.name && !ch.sceneCast.some(x=>x.name.toLowerCase()===c.name.toLowerCase())){
      ch.sceneCast.push(defaultParticipant(c.name,""));
    }
    saveVault();
  }

  function injectStatsUI(){
    const tabs=document.querySelector(".tabs");
    if(tabs && !tabs.querySelector('[data-tab="stats"]')){
      const memoryTab=tabs.querySelector('[data-tab="memory"]');
      const b=document.createElement("button");b.dataset.tab="stats";b.className="tab";b.textContent="Stats";
      tabs.insertBefore(b,memoryTab);
      b.addEventListener("click",()=>{selectTab("stats");renderStats();});
    }
    const main=document.querySelector("main.app");
    if(main && !document.querySelector('[data-view="stats"]')){
      const memoryView=document.querySelector('[data-view="memory"]');
      const section=document.createElement("section");
      section.className="view";section.dataset.view="stats";
      section.innerHTML=`
        <div class="panel">
          <div class="section-title-row">
            <div>
              <h2>Story Stats</h2>
              <p class="hint">Timeline-specific beat counters and current-scene continuity. Everything here travels with backups.</p>
            </div>
            <button id="scanSceneStatsBtn" class="send small" type="button">Update From RP</button>
          </div>
          <div id="statsScanStatus" class="test-result"></div>

          <div id="storyCounterGrid" class="story-counter-grid"></div>

          <div class="section-title-row stats-section-head">
            <div><h2 class="subhead">Who Is In This Scene</h2><p class="hint">Species, health, clothing, position/status, and notes for whoever is currently present.</p></div>
            <button id="addScenePersonBtn" class="small" type="button">+ Person</button>
          </div>
          <div id="sceneCastList" class="scene-cast-list"></div>

          <div class="section-title-row stats-section-head">
            <div><h2 class="subhead">Story Beat Log</h2><p class="hint">Major beats stay chronological so you can see the shape of the story.</p></div>
            <button id="addBeatBtn" class="small" type="button">+ Beat</button>
          </div>
          <div id="beatLog" class="beat-log"></div>
        </div>`;
      main.insertBefore(section,memoryView);
    }
  }

  function renderCounters(){
    const host=document.getElementById("storyCounterGrid");if(!host)return;
    const ch=activeChat();host.innerHTML="";
    COUNTERS.forEach(([key,label])=>{
      const card=document.createElement("div");card.className="story-counter";
      card.innerHTML=`<div class="counter-label">${esc(label)}</div>
        <div class="counter-row"><button class="ghost small minus" type="button">−</button>
        <strong>${Number(ch.storyStats[key]||0)}</strong>
        <button class="ghost small plus" type="button">+</button></div>`;
      card.querySelector(".minus").addEventListener("click",()=>{ch.storyStats[key]=Math.max(0,Number(ch.storyStats[key]||0)-1);saveVault();renderCounters()});
      card.querySelector(".plus").addEventListener("click",()=>{ch.storyStats[key]=Number(ch.storyStats[key]||0)+1;saveVault();renderCounters()});
      host.appendChild(card);
    });
  }

  function renderCast(){
    const host=document.getElementById("sceneCastList");if(!host)return;
    const ch=activeChat();host.innerHTML="";
    if(!ch.sceneCast.length){
      const empty=document.createElement("div");empty.className="hint";empty.textContent="No one is listed in the current scene yet.";host.appendChild(empty);return;
    }
    ch.sceneCast.forEach(person=>{
      const card=document.createElement("div");card.className="scene-person";
      card.innerHTML=`
        <div class="scene-person-head"><strong>${esc(person.name||"Unnamed")}</strong><button class="ghost danger small remove" type="button">Remove</button></div>
        <div class="field-grid">
          <label>Name<input class="sp-name" value="${esc(person.name)}" /></label>
          <label>Species<input class="sp-species" value="${esc(person.species)}" placeholder="Human, werewolf, vampire…" /></label>
          <label>Health status<input class="sp-health" value="${esc(person.health)}" placeholder="Healthy, injured, healing…" /></label>
          <label>Clothing worn<input class="sp-clothing" value="${esc(person.clothing)}" placeholder="Current outfit / state of dress" /></label>
        </div>
        <label>Scene status / position<input class="sp-status" value="${esc(person.status)}" placeholder="At table, across room, asleep, shifted…" /></label>
        <label>Notes<textarea class="sp-notes" rows="3">${esc(person.notes)}</textarea></label>`;
      const map={".sp-name":"name",".sp-species":"species",".sp-health":"health",".sp-clothing":"clothing",".sp-status":"status",".sp-notes":"notes"};
      Object.entries(map).forEach(([sel,key])=>card.querySelector(sel).addEventListener("input",e=>{person[key]=e.target.value;person.updatedAt=now();saveVault();if(key==="name")card.querySelector("strong").textContent=e.target.value||"Unnamed";}));
      card.querySelector(".remove").addEventListener("click",()=>{ch.sceneCast=ch.sceneCast.filter(x=>x.id!==person.id);saveVault();renderCast()});
      host.appendChild(card);
    });
  }

  function renderBeatLog(){
    const host=document.getElementById("beatLog");if(!host)return;
    const ch=activeChat();host.innerHTML="";
    if(!ch.beatLog.length){const e=document.createElement("div");e.className="hint";e.textContent="No logged beats yet.";host.appendChild(e);return}
    ch.beatLog.slice().reverse().forEach(beat=>{
      const row=document.createElement("div");row.className="beat-item";
      const when=beat.createdAt?new Date(beat.createdAt).toLocaleString():"";
      row.innerHTML=`<div class="beat-main"><strong>${esc(beat.type||"Beat")}</strong><span>${esc(beat.detail||"")}</span><small>${esc(when)}</small></div><button class="ghost danger small" type="button">Delete</button>`;
      row.querySelector("button").addEventListener("click",()=>{ch.beatLog=ch.beatLog.filter(x=>x.id!==beat.id);saveVault();renderBeatLog()});
      host.appendChild(row);
    });
  }

  function renderStats(){
    ensureStats();seedSceneCast();renderCounters();renderCast();renderBeatLog();
    const badge=document.getElementById("buildBadge");if(badge)badge.textContent="v"+BUILD;
  }

  function addBeat(){
    const type=prompt("Beat type:","Story beat");if(type===null)return;
    const detail=prompt("What happened?","");if(detail===null)return;
    activeChat().beatLog.push({id:uid(),type:type.trim()||"Story beat",detail:detail.trim(),createdAt:now(),source:"manual"});
    saveVault();renderBeatLog();
  }

  function normalizeJson(raw){
    const original=String(raw||"").trim();
    if(!original)throw new Error("The model returned an empty stats result.");

    const candidates=[];
    candidates.push(original);

    /* Strip markdown fences if the model ignored the instruction. */
    candidates.push(
      original
        .replace(/^```(?:json)?\s*/i,"")
        .replace(/\s*```$/,"")
        .trim()
    );

    /* Most common failure: valid JSON followed or preceded by commentary.
       Pull out the widest object and try that independently. */
    const first=original.indexOf("{"),last=original.lastIndexOf("}");
    if(first>=0 && last>first)candidates.push(original.slice(first,last+1));

    /* Also inspect fenced blocks anywhere in the reply. */
    const fenced=[...original.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
    fenced.forEach(m=>candidates.push(String(m[1]||"").trim()));

    let lastErr=null;
    for(const c of [...new Set(candidates.filter(Boolean))]){
      try{return JSON.parse(c)}
      catch(err){lastErr=err}
    }

    throw new Error(`Stats response was not valid JSON${lastErr?.message?`: ${lastErr.message}`:""}.`);
  }

  async function updateFromRP(){
    const ch=activeChat();
    const msgs=getConversationMessages(ch);
    if(!msgs.length){document.getElementById("statsScanStatus").textContent="There is no RP transcript to scan yet.";return}

    let start=0;
    if(ch.statsScanThroughMessageId){
      const i=msgs.findIndex(m=>m.id===ch.statsScanThroughMessageId);
      if(i>=0)start=i+1;
    }
    const newMsgs=msgs.slice(start);
    if(!newMsgs.length){document.getElementById("statsScanStatus").textContent="Stats are already caught up with the current transcript.";return}

    /* Give the model a little prior context, but only count events in NEW TRANSCRIPT. */
    const prior=msgs.slice(Math.max(0,start-6),start);
    const status=document.getElementById("statsScanStatus"),btn=document.getElementById("scanSceneStatsBtn");
    status.textContent=`Reading ${newMsgs.length} new RP message${newMsgs.length===1?"":"s"}…`;btn.disabled=true;

    const transcript=a=>a.map(m=>`${m.role==="user"?"PROTAGONIST":"CHARACTER"}: ${m.text}`).join("\n\n");
    const existing=ch.sceneCast.map(p=>({name:p.name,species:p.species,health:p.health,clothing:p.clothing,status:p.status,notes:p.notes}));

    const prompt=`You are updating structured continuity stats for a fictional roleplay.

PRIOR CONTEXT is only for understanding. NEVER count events from PRIOR CONTEXT.
Only count a beat if it actually occurs in NEW TRANSCRIPT. Do not count references, plans, fantasies, jokes, memories, or repeated descriptions of an event that already happened.

Return ONLY strict JSON in exactly this shape:
{
  "increments":{"sex":0,"kisses":0,"dates":0,"fights":0,"transformations":0,"majorInjuries":0},
  "participants":[
    {"name":"","species":"","health":"","clothing":"","status":"","notes":""}
  ],
  "beats":[{"type":"","detail":""}]
}

Tracking definitions:
- sex: a completed sexual encounter, counted once per encounter, not once per act or orgasm.
- kisses: a new kiss event. A continuous make-out session counts once.
- dates: an actual date that occurs, not a plan for a future date.
- fights: a meaningful physical fight or major relationship argument, not playful teasing.
- transformations: a completed supernatural transformation/shift.
- majorInjuries: a new injury significant enough to matter to later continuity.
- participants: only people actually present in the CURRENT scene at the end of NEW TRANSCRIPT. Preserve established species. Health and clothing should describe current state only when supported. Use empty string when unknown.
- beats: only durable story beats worth seeing in a timeline log. Keep detail concise.
- Do not invent facts.

EXISTING SCENE PARTICIPANTS:
${JSON.stringify(existing)}

PRIOR CONTEXT:
${transcript(prior)||"(none)"}

NEW TRANSCRIPT TO TRACK:
${transcript(newMsgs)}`;

    try{
      let raw=await openRouterRequest([
        {role:"system",content:"Return one strict JSON object only. The first character must be { and the final character must be }. No markdown, prose, headings, or explanation."},
        {role:"user",content:prompt}
      ],700,0.02);

      let data;
      try{
        data=normalizeJson(raw);
      }catch(firstParseError){
        status.textContent="The model answered in the wrong format • repairing stats response…";
        raw=await openRouterRequest([
          {role:"system",content:"Convert the supplied text into the exact JSON schema requested. Return ONE valid JSON object only. No prose. No markdown. Do not add facts."},
          {role:"user",content:`REQUIRED SCHEMA:
{"increments":{"sex":0,"kisses":0,"dates":0,"fights":0,"transformations":0,"majorInjuries":0},"participants":[{"name":"","species":"","health":"","clothing":"","status":"","notes":""}],"beats":[{"type":"","detail":""}]}

ORIGINAL STATS TASK:
${prompt}

INVALID MODEL RESPONSE:
${raw}`}
        ],700,0);
        data=normalizeJson(raw);
      }

      const inc=data?.increments||{};
      COUNTERS.forEach(([k])=>{ch.storyStats[k]=Math.max(0,Number(ch.storyStats[k]||0)+Math.max(0,Number(inc[k]||0)))});

      if(Array.isArray(data?.participants)){
        const old=ch.sceneCast;
        ch.sceneCast=data.participants.filter(x=>x&&x.name).map(x=>{
          const prev=old.find(p=>p.name.trim().toLowerCase()===String(x.name).trim().toLowerCase());
          return {
            id:prev?.id||uid(),
            name:String(x.name||prev?.name||""),
            species:String(x.species||prev?.species||""),
            health:String(x.health||prev?.health||""),
            clothing:String(x.clothing||prev?.clothing||""),
            status:String(x.status||prev?.status||""),
            notes:String(x.notes||prev?.notes||""),
            updatedAt:now()
          };
        });
      }

      if(Array.isArray(data?.beats)){
        data.beats.filter(x=>x&&(x.type||x.detail)).forEach(x=>ch.beatLog.push({
          id:uid(),type:String(x.type||"Story beat"),detail:String(x.detail||""),createdAt:now(),source:"scan"
        }));
      }

      ch.statsScanThroughMessageId=msgs.at(-1)?.id||null;
      ch.updatedAt=now();saveVault();renderStats();
      status.textContent=`Stats updated from ${newMsgs.length} new RP message${newMsgs.length===1?"":"s"}. You can correct any counter with +/−.`;
    }catch(err){
      status.textContent=`Could not update stats: ${err?.message||String(err)} • Your RP was not changed and nothing was counted.`;
    }finally{btn.disabled=false}
  }


  function stripMessySingleStars(text){
    let s=String(text||"");
    if(!s.includes("*")) return s;

    /* Protect legitimate **whole action blocks**. */
    const blocks=[];
    s=s.replace(/\*\*([\s\S]*?)\*\*/g,(m,body)=>{
      const token=`@@NOCTIS_BLOCK_${blocks.length}@@`;
      blocks.push(body);
      return token;
    });

    /* Remove ALL remaining star emphasis, including *word* *word* soup. */
    s=s.replace(/\*+([^*\n]+?)\*+/g,"$1");
    s=s.replace(/\*/g,"");

    /* Restore the legitimate blocks. */
    blocks.forEach((body,i)=>{
      s=s.replace(`@@NOCTIS_BLOCK_${i}@@`,`**${body}**`);
    });
    return s;
  }

  function cleanExistingAssistantPosts(){
    const ch=activeChat();
    let changed=false;
    (ch.messages||[]).forEach(msg=>{
      if(msg?.role!=="assistant" || typeof msg.text!=="string") return;
      const cleaned=stripMessySingleStars(msg.text);
      if(cleaned!==msg.text){
        msg.text=cleaned;
        msg.cleanedFormatting=true;
        changed=true;
      }
    });
    if(changed){ ch.updatedAt=now(); saveVault(); }
  }

  function safeBoldActions(root){
    if(!root)return;
    root.querySelectorAll(".message-body").forEach(el=>{
      const txt=el.textContent||"";
      if(!txt.includes("**"))return;
      const frag=document.createDocumentFragment();
      const parts=txt.split(/(\*\*[\s\S]*?\*\*)/g);
      parts.forEach(part=>{
        if(part.startsWith("**")&&part.endsWith("**")&&part.length>=4){
          const strong=document.createElement("strong");strong.textContent=part.slice(2,-2);frag.appendChild(strong);
        }else frag.appendChild(document.createTextNode(part));
      });
      el.replaceChildren(frag);
    });
  }

  /* Main-scene formatting: dialogue in curly quotes, actions/narration in ** **.
     Phone mode explicitly stays plain text. */
  const baseCompile=compileSystemPrompt;
  compileSystemPrompt=function(){
    return baseCompile()+`

MAIN-SCENE RP FORMAT — MANDATORY
- This formatting rule applies to normal RP and Generate My Turn. Phone/text-message mode is exempt.
- Spoken dialogue must use curly double quotation marks: “Like this.”
- Actions/narration may use ONE pair of double asterisks around a complete action sentence or complete action paragraph: **Jesse leans against the counter and watches her.**
- NEVER put asterisks around individual words.
- NEVER use single-asterisk italics.
- NEVER produce *word* *word* *word* emphasis.
- NEVER use stars merely for dramatic emphasis.
- Do not put dialogue inside action asterisks.
- Clean example:
  **Jesse crosses the room and stops beside her.**
  “Come here, Cricket.”
- If you cannot maintain this clean format, use plain narration rather than scattered asterisks.`;
  };

  const baseRenderMessages=renderMessages;
  renderMessages=function(){cleanExistingAssistantPosts();baseRenderMessages();safeBoldActions(document.getElementById("messages"));};


  /* Sanitize main-RP model output before it is saved, so star-soup cannot
     keep reappearing even if the model ignores the formatting instruction. */
  const baseOpenRouterForFormat=openRouterRequest;
  openRouterRequest=async function(messages,maxTokens=settings.maxTokens,temperature=settings.temperature){
    const sys=Array.isArray(messages)?messages.map(m=>String(m?.content||"")).join("\n"):"";
    const isPhone=/PHONE\s*\/\s*TEXT MESSAGE MODE/i.test(sys);
    const isJson=/strict JSON|Return ONLY valid JSON|Return strict JSON/i.test(sys);
    const isMain=/NOCTIS CORE CONTINUITY RULES|MAIN-SCENE RP FORMAT/i.test(sys) && !isPhone && !isJson;

    setComposerState("thinking","Thinking…");
    try{
      const raw=await baseOpenRouterForFormat(messages,maxTokens,temperature);
      setComposerState("replying","Replying…");
      const out=isMain?stripMessySingleStars(raw):raw;
      setTimeout(()=>setComposerState("waiting","Waiting"),260);
      return out;
    }catch(err){
      setComposerState("error","Error");
      throw err;
    }
  };

  function injectComposerStatus(){
    const form=document.getElementById("chatForm");
    const send=document.getElementById("sendBtn");
    if(!form||!send||document.getElementById("composerBotStatus"))return;
    const wrap=document.createElement("div");
    wrap.className="send-status-row";
    send.parentNode.insertBefore(wrap,send);
    wrap.appendChild(send);
    const status=document.createElement("div");
    status.id="composerBotStatus";
    status.className="composer-bot-status waiting";
    status.innerHTML='<span class="bot-status-dot"></span><span class="bot-status-text">Waiting</span>';
    wrap.appendChild(status);
  }

  function setComposerState(state,label){
    injectComposerStatus();
    const el=document.getElementById("composerBotStatus");
    if(!el)return;
    el.className=`composer-bot-status ${state}`;
    const text=el.querySelector(".bot-status-text");
    if(text)text.textContent=label;
  }

  /* Mirror Noctis's existing activity messages for actions that do not pass
     through the normal reply wrapper. */
  const connection=document.getElementById("connectionStatus");
  if(connection){
    const obs=new MutationObserver(()=>{
      const t=(connection.textContent||"").toLowerCase();
      if(t.includes("drafting"))setComposerState("thinking","Drafting…");
      else if(t.includes("continuing"))setComposerState("thinking","Continuing…");
      else if(t.includes("elaborating"))setComposerState("thinking","Elaborating…");
      else if(t.includes("thinking"))setComposerState("thinking","Thinking…");
      else if(t.includes("hiccup")||t.includes("failed")||t.includes("error")||t.includes("limit"))setComposerState("error","Needs attention");
      else if(t.includes("connected")||t.includes("ready")||t.includes("local"))setComposerState("waiting","Waiting");
    });
    obs.observe(connection,{childList:true,subtree:true,characterData:true});
  }

  const baseRenderAll=renderAll;
  renderAll=function(){ensureStats();baseRenderAll();injectStatsUI();renderStats();};

  ensureStats();injectStatsUI();seedSceneCast();injectComposerStatus();cleanExistingAssistantPosts();

  document.getElementById("scanSceneStatsBtn")?.addEventListener("click",updateFromRP);
  document.getElementById("addScenePersonBtn")?.addEventListener("click",()=>{
    activeChat().sceneCast.push(defaultParticipant());saveVault();renderCast();
  });
  document.getElementById("addBeatBtn")?.addEventListener("click",addBeat);

  renderStats();
  safeBoldActions(document.getElementById("messages"));
})();