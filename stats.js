/* Noctis Mourning Vale v0.9.0 — Story Stats + RP formatting */
(() => {
  const BUILD = "0.12.0";
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

    const settingsPanel=document.querySelector('[data-view="settings"] .panel');
    if(settingsPanel && !document.getElementById("rpPacingMode")){
      const box=document.createElement("div");
      box.className="memory-compact-card";
      box.innerHTML=`
        <h2 class="subhead">RP Pacing</h2>
        <p class="hint">Controls how aggressively characters re-initiate sex versus moving the story forward.</p>
        <label>Intimacy pacing
          <select id="rpPacingMode">
            <option value="story">Story-first — sex happens, then the plot gets room</option>
            <option value="balanced">Balanced — romantic/sexual, but not an endless loop</option>
            <option value="highheat">High-heat — more frequent, still respects cooldowns</option>
          </select>
        </label>
        <label class="toggle-row">
          <input id="sexNeedsUserLead" type="checkbox" />
          <span>After sex, require the protagonist to clearly re-initiate before another encounter</span>
        </label>`;
      settingsPanel.appendChild(box);
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
      card.querySelector(".minus").addEventListener("click",()=>{ch.storyStats[key]=Math.max(0,Number(ch.storyStats[key]||0)-1);ch.updatedAt=now();saveVault();renderCounters()});
      card.querySelector(".plus").addEventListener("click",()=>{ch.storyStats[key]=Number(ch.storyStats[key]||0)+1;ch.updatedAt=now();saveVault();renderCounters()});
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

  function parseStatsPacket(raw){
    const text=String(raw||"").replace(/\r/g,"").trim();
    if(!text)throw new Error("The model returned an empty stats result.");

    const result={
      increments:{sex:0,kisses:0,dates:0,fights:0,transformations:0,majorInjuries:0},
      participants:[],
      beats:[]
    };

    const count=(key)=>{
      const re=new RegExp(`(?:^|\\n)\\s*${key}\\s*[:=]\\s*(\\d+)\\b`,"i");
      const m=text.match(re);
      return m?Math.max(0,Number(m[1])||0):0;
    };
    result.increments.sex=count("sex");
    result.increments.kisses=count("kisses");
    result.increments.dates=count("dates");
    result.increments.fights=count("fights");
    result.increments.transformations=count("transformations");
    result.increments.majorInjuries=count("majorInjuries");

    // PARTICIPANT|name|species|health|clothing|status|notes
    for(const line of text.split("\n")){
      const trimmed=line.trim();
      if(/^PARTICIPANT\|/i.test(trimmed)){
        const parts=trimmed.split("|").slice(1).map(x=>x.trim());
        while(parts.length<6)parts.push("");
        result.participants.push({
          name:parts[0]||"",
          species:parts[1]||"",
          health:parts[2]||"",
          clothing:parts[3]||"",
          status:parts[4]||"",
          notes:parts.slice(5).join("|")||""
        });
      }else if(/^BEAT\|/i.test(trimmed)){
        const parts=trimmed.split("|").slice(1);
        result.beats.push({
          type:String(parts.shift()||"Story beat").trim(),
          detail:parts.join("|").trim()
        });
      }
    }

    // If the model omitted participant/beat tags but did provide counters,
    // still accept the packet rather than failing the whole scan.
    const hasAnyCounter=COUNTERS.every(([k])=>new RegExp(`(?:^|\\n)\\s*${k}\\s*[:=]\\s*\\d+\\b`,"i").test(text));
    const hasTagged=result.participants.length||result.beats.length;
    if(!hasAnyCounter && !hasTagged){
      throw new Error("The model did not return a recognizable stats packet.");
    }
    return result;
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

Return ONLY this simple line-based stats packet. Do NOT use JSON.

sex=0
kisses=0
dates=0
fights=0
transformations=0
majorInjuries=0

For each person actually present at the END of the new transcript, add one line:
PARTICIPANT|name|species|health|clothing|status|notes

For each durable story beat, add one line:
BEAT|type|detail

Rules:
- Every counter line must appear exactly once.
- Use whole nonnegative integers only.
- Use a blank field when a participant detail is unknown.
- Do not add commentary before or after the packet.
- Do not use markdown fences.

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
      const raw=await openRouterRequest([
        {role:"system",content:"Return only the requested line-based stats packet. No JSON. No prose. No markdown."},
        {role:"user",content:prompt}
      ],700,0.02);

      const data=parseStatsPacket(raw);
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
      status.textContent=`Could not update stats: ${err?.message||String(err)} • Your RP was not changed and nothing was counted. The scanner now uses a non-JSON packet, so if this still fails we can inspect exactly what the model returned.`;
    }finally{btn.disabled=false}
  }



  function sanitizeForbiddenShifterAnatomy(text){
    let s=String(text||"");
    if(!/\bknot(?:ted|ting|s)?\b/i.test(s) && !/\bbulbus glandis\b/i.test(s))return s;

    const sexual=/\b(penis|cock|dick|shaft|glans|head|erection|hard|throb|inside|entered|penetrat|base|swollen|swelled|genital|sex|fucked|fuck|hips|groin|between (?:his|her|their) legs)\b/i;

    s=s.split(/(?<=[.!?])(\s+)|(\n+)/).map(part=>{
      if(!part || !/\bknot(?:ted|ting|s)?\b/i.test(part))return part;
      if(sexual.test(part)){
        return part
          .replace(/\bbulbus glandis\b/gi,"human anatomy")
          .replace(/\bknotting\b/gi,"pressing close")
          .replace(/\bknotted\b/gi,"pressed close")
          .replace(/\bknots\b/gi,"muscles")
          .replace(/\bknot\b/gi,"head");
      }
      return part;
    }).join("");

    /* Catch the most common anatomy constructions even when the sentence
       itself is short and lacks another explicit sexual keyword. */
    s=s
      .replace(/\b(his|her|their|your|my|the)\s+knot\b/gi,"$1 head")
      .replace(/\bknot\s+at\s+the\s+base\b/gi,"base")
      .replace(/\bknot\s+inside\b/gi,"body inside")
      .replace(/\bknotting\s+(her|him|them|you)\b/gi,"holding $1 close");

    return s;
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
      const cleaned=sanitizeForbiddenShifterAnatomy(stripMessySingleStars(msg.text));
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
      if(window.NoctisInlineTexts && /\[\[PHONE:/i.test(txt)){window.NoctisInlineTexts.format(el,txt);return;}
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
    const mode=settings.rpPacingMode||"balanced";
    const needsLead=settings.sexNeedsUserLead!==false;
    const pacingRule=mode==="story"
      ?`PACING MODE: STORY-FIRST. After one completed sexual encounter, do not initiate another for at least 12 assistant turns and until the scene has meaningfully moved forward.`
      :mode==="highheat"
      ?`PACING MODE: HIGH-HEAT. Attraction can stay intense, but after a completed sexual encounter do not re-initiate for at least 4 assistant turns unless the protagonist clearly initiates. Avoid more than two encounters in the same scene.`
      :`PACING MODE: BALANCED. After a completed sexual encounter, do not re-initiate for at least 8 assistant turns unless the protagonist clearly initiates. One encounter per scene is the normal default; two is an exception, not the baseline.`;
    const leadRule=needsLead
      ?`AFTER-SEX LEAD RULE: Once an encounter ends, the CHARACTER must not start another sexual encounter until the protagonist clearly and actively initiates it. Flirting, cuddling, kissing, nudity, bathing, or lying in bed do not count as clear initiation.`
      :`AFTER-SEX LEAD RULE: The character may re-initiate after the pacing cooldown, but should still prioritize story progression.`;
    return baseCompile()+`

SHIFTER / WEREWOLF ANATOMY BOUNDARY — ABSOLUTE
- Werewolves and shifters may have supernatural instincts, mate bonds, scent, marking, heightened senses, possessiveness, transformation, claws, fangs, growling, biting, dominant/primal energy, or other established fantasy traits.
- Sexual anatomy remains HUMAN unless the user explicitly establishes otherwise in canon.
- Human sexual positions are allowed, including doggy style, rear-entry positions, straddling, pinning, carrying, or other consensual human-body positioning.
- Primal or animalistic ENERGY is allowed when all participants remain fully human/humanoid in sexual anatomy and behavior.
- Never introduce canine reproductive anatomy or animal genital mechanics.
- The words "knot", "knotting", "tie", "tied", or "bulbus glandis" MUST NOT be used as sexual-anatomy terms.
- Never call a penis, glans/head, shaft, base, erection, swelling, or any genital structure a "knot".
- Never describe canine-style swelling/locking at the base of the penis.
- Never use canine genital locking, literal dog mating mechanics, or any sexual behavior involving actual animals/non-humanoid animal bodies.
- If earlier transcript text used "knot" sexually, IGNORE that terminology completely. It is a prior model mistake, not canon, and must not be echoed.
- Do not turn supernatural romance into literal animal sex.
- If prior text used canine anatomy terms, treat them as non-canon mistakes and continue with human anatomy from this point forward.

RP PACING — KEEP THE STORY MOVING
${pacingRule}
${leadRule}
- The roleplay is not a continuous sex loop. Sexual scenes are one part of the story, not the entire story.
- After a completed sexual encounter, naturally transition into aftercare, conversation, humor, sleep, food, work, conflict, mystery, errands, relationship development, or another plot beat.
- Do not immediately restart sex just because the characters are still attracted to each other.
- Do not interpret every touch, cuddle, kiss, shower, bed scene, or flirtation as an invitation to begin another sexual encounter.
- Let ordinary roleplay breathe: talking, teasing, planning, arguing, joking, investigating, traveling, domestic scenes, and plot progression should happen regularly.
- The protagonist must have room to initiate, react, and steer events. Do not monopolize the scene with repeated sexual escalation.

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


  /* Final-turn hard boundary: this sits after normal continuity/history so old
     transcript wording cannot override the user's explicit anatomy preference. */
  if(typeof apiMessages==="function" && !window.__noctisAnatomyGuardPatched){
    const baseApiForAnatomy=apiMessages;
    apiMessages=function(extraSystem=""){
      const out=baseApiForAnatomy(extraSystem);
      out.push({
        role:"system",
        content:`FINAL USER BOUNDARY — OVERRIDES PRIOR TRANSCRIPT WORDING
Sexual anatomy is human/humanoid. Never use "knot", "knotting", "tie", "bulbus glandis", canine swelling/locking, or equivalent dog reproductive anatomy as sexual terminology. Doggy style and primal/animalistic energy are allowed, but anatomy remains human. Any earlier sexual use of "knot" was a model error and is NON-CANON. Do not repeat or reference it.`
      });
      return out;
    };
    window.__noctisAnatomyGuardPatched=true;
  }

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
      const out=isMain?sanitizeForbiddenShifterAnatomy(stripMessySingleStars(raw)):raw;
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
    if(!form||!send)return;

    let wrap=document.getElementById("sendStatusColumn");
    if(!wrap){
      wrap=document.createElement("div");
      wrap.id="sendStatusColumn";
      wrap.className="send-status-column";
      send.parentNode.insertBefore(wrap,send);
      wrap.appendChild(send);
    }

    if(!document.getElementById("composerBotStatus")){
      const status=document.createElement("div");
      status.id="composerBotStatus";
      status.className="composer-bot-status waiting";
      status.innerHTML='<span class="bot-status-dot"></span><span class="bot-status-text">Waiting</span>';
      wrap.appendChild(status);
    }
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

  const shifterBoundaryLines=[
    "No canine reproductive anatomy or knotting/tie/bulbus-glandis mechanics",
    "Human sexual positions including doggy style are allowed; primal/animalistic energy is fine as long as anatomy and participants remain human/humanoid",
    "No canine genital locking or literal animal mating mechanics",
    "Werewolf/shifter sexual anatomy stays human unless I explicitly establish otherwise"
  ];
  const currentLimits=String(settings.hardLimits||"");
  let addedBoundary=false;
  shifterBoundaryLines.forEach(line=>{
    if(!currentLimits.toLowerCase().includes(line.toLowerCase())){
      settings.hardLimits=[String(settings.hardLimits||"").trim(),line].filter(Boolean).join("\n");
      addedBoundary=true;
    }
  });
  if(addedBoundary)saveSettings();

  if(!settings.rpPacingMode)settings.rpPacingMode="balanced";
  if(settings.sexNeedsUserLead===undefined)settings.sexNeedsUserLead=true;
  saveSettings();

  ensureStats();injectStatsUI();seedSceneCast();injectComposerStatus();cleanExistingAssistantPosts();

  const pacingSel=document.getElementById("rpPacingMode");
  if(pacingSel){
    pacingSel.value=settings.rpPacingMode||"balanced";
    pacingSel.addEventListener("change",e=>{settings.rpPacingMode=e.target.value;saveSettings()});
  }
  const leadToggle=document.getElementById("sexNeedsUserLead");
  if(leadToggle){
    leadToggle.checked=settings.sexNeedsUserLead!==false;
    leadToggle.addEventListener("change",e=>{settings.sexNeedsUserLead=!!e.target.checked;saveSettings()});
  }

  document.getElementById("scanSceneStatsBtn")?.addEventListener("click",updateFromRP);
  document.getElementById("addScenePersonBtn")?.addEventListener("click",()=>{
    activeChat().sceneCast.push(defaultParticipant());saveVault();renderCast();
  });
  document.getElementById("addBeatBtn")?.addEventListener("click",addBeat);

  renderStats();
  safeBoldActions(document.getElementById("messages"));
})();