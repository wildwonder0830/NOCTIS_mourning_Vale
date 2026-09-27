/* Noctis Mourning Vale v0.11.0 — Social feed */
(() => {
  const BUILD="0.11.0";
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  const fmt=iso=>{try{return new Date(iso||Date.now()).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}catch{return ""}};

  function ensureSocialData(){
    (vault.characters||[]).forEach(c=>(c.chats||[]).forEach(ch=>{
      if(!Array.isArray(ch.socialPosts))ch.socialPosts=[];
      if(!Number.isFinite(Number(ch.socialUnread)))ch.socialUnread=0;
    }));
  }

  function injectSocialUI(){
    const tabs=document.querySelector(".tabs");
    if(tabs&&!tabs.querySelector('[data-tab="social"]')){
      const phone=tabs.querySelector('[data-tab="phone"]');
      const b=document.createElement("button");
      b.dataset.tab="social";b.className="tab";b.innerHTML='Social <span id="socialTabDot" class="social-dot hidden"></span>';
      tabs.insertBefore(b,phone||tabs.querySelector('[data-tab="memory"]'));
      b.addEventListener("click",()=>{selectTab("social");activeChat().socialUnread=0;saveVault();renderSocial()});
    }
    const main=document.querySelector("main.app");
    if(main&&!document.querySelector('[data-view="social"]')){
      const phone=document.querySelector('[data-view="phone"]');
      const memory=document.querySelector('[data-view="memory"]');
      const section=document.createElement("section");
      section.className="view";section.dataset.view="social";
      section.innerHTML=`
        <div class="social-shell">
          <div class="social-head">
            <div><h2>Social</h2><p class="hint">Status updates visible to story contacts who follow this timeline.</p></div>
          </div>
          <form id="socialForm" class="social-composer">
            <textarea id="socialInput" rows="3" maxlength="500" placeholder="What’s happening?"></textarea>
            <div class="social-compose-bottom">
              <span id="socialStatus" class="hint social-status"></span>
              <button id="socialPostBtn" class="send" type="submit">Post</button>
            </div>
          </form>
          <div id="socialFeed" class="social-feed"></div>
        </div>`;
      main.insertBefore(section,phone||memory);
    }
  }

  function personaCard(){
    const p=activePersona();
    return {name:p?.name||"Protagonist",avatar:"",handle:"@"+String(p?.name||"protagonist").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,18)};
  }

  function contactByName(name){
    const key=String(name||"").trim().toLowerCase();
    return (activeCharacter().phoneContacts||[]).find(p=>String(p.name||p.displayName||"").trim().toLowerCase()===key);
  }

  function avatarMarkup(contact,name,cls="social-avatar"){
    if(contact?.avatar)return `<img class="${cls}" src="${esc(contact.avatar)}" alt="">`;
    const letter=String(contact?.displayName||contact?.name||name||"?").trim().slice(0,1).toUpperCase()||"?";
    return `<div class="${cls} social-avatar-fallback">${esc(letter)}</div>`;
  }

  function renderSocial(){
    ensureSocialData();
    const host=document.getElementById("socialFeed");if(!host)return;
    const ch=activeChat(),me=personaCard();host.innerHTML="";
    if(!ch.socialPosts.length){
      host.innerHTML='<div class="social-empty">No posts yet. Be the first problem on everyone’s timeline.</div>';
    }
    ch.socialPosts.slice().reverse().forEach(post=>{
      const mine=post.role==="user";
      const contact=mine?null:contactByName(post.author);
      const card=document.createElement("article");card.className="social-post";
      const name=mine?me.name:(contact?.displayName||post.author||"Contact");
      const handle=mine?me.handle:"@"+String(name).toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,18);
      card.innerHTML=`
        <div class="social-post-top">
          ${avatarMarkup(contact,name)}
          <div class="social-ident"><strong>${esc(name)}</strong><span>${esc(handle)} · ${esc(fmt(post.createdAt))}</span></div>
          ${mine?'<button class="ghost danger small social-delete" type="button">Delete</button>':""}
        </div>
        <div class="social-post-text">${esc(post.text)}</div>
        <div class="social-reactions"></div>
        <div class="social-comments"></div>`;
      const react=card.querySelector(".social-reactions");
      (post.reactions||[]).forEach(r=>{
        const chip=document.createElement("span");chip.className="social-reaction-chip";chip.textContent=`${r.emoji||"♥"} ${r.name||""}`;react.appendChild(chip);
      });
      const comments=card.querySelector(".social-comments");
      (post.comments||[]).forEach(c=>{
        const p=contactByName(c.name);
        const row=document.createElement("div");row.className="social-comment";
        row.innerHTML=`${avatarMarkup(p,c.name,"social-comment-avatar")}<div><strong>${esc(p?.displayName||c.name||"Contact")}</strong><span>${esc(c.text||"")}</span></div>`;
        comments.appendChild(row);
      });
      card.querySelector(".social-delete")?.addEventListener("click",()=>{
        if(!confirm("Delete this status update?"))return;
        ch.socialPosts=ch.socialPosts.filter(x=>x.id!==post.id);saveVault();renderSocial();
      });
      host.appendChild(card);
    });
    updateSocialDot();
  }

  function parseSocialPacket(raw){
    const out={reactions:[],comments:[]};
    String(raw||"").split(/\r?\n/).forEach(line=>{
      const t=line.trim();
      if(/^REACTION\|/i.test(t)){
        const parts=t.split("|").slice(1);
        out.reactions.push({name:String(parts.shift()||"").trim(),emoji:String(parts.join("|")||"♥").trim()||"♥"});
      }else if(/^COMMENT\|/i.test(t)){
        const parts=t.split("|").slice(1);
        out.comments.push({name:String(parts.shift()||"").trim(),text:parts.join("|").trim()});
      }
    });
    return out;
  }

  function followerSummary(){
    return (activeCharacter().phoneContacts||[])
      .filter(p=>p.followsSocial!==false)
      .map(p=>`${p.name} | role=${p.relationship||"unknown"} | status=${p.status||"available"} | style=${p.textingStyle||"established voice"}`)
      .join("\n");
  }

  async function generateImmediateReactions(post){
    const followers=(activeCharacter().phoneContacts||[]).filter(p=>p.followsSocial!==false);
    if(!followers.length)return;
    const ch=activeChat();
    const recentMain=getConversationMessages(ch).slice(-6).map(m=>`${m.role==="user"?"PROTAGONIST":"CHARACTER"}: ${m.text}`).join("\n\n");
    const prompt=`SOCIAL FEED REACTIONS
The protagonist just posted this public status:
${post.text}

Followers who can see it:
${followerSummary()}

Generate 0-4 natural reactions/comments from followers who would realistically respond.
Return ONLY lines in these forms:
REACTION|Exact Contact Name|emoji
COMMENT|Exact Contact Name|comment text

Rules:
- Use only contacts listed above.
- A contact may react, comment, both, or ignore it.
- Keep each voice consistent with relationship/canon.
- Do not invent new contacts.
- Do not narrate.
- Do not control the protagonist.
- Avoid everyone responding every time.
- Respect all hard limits.

RECENT STORY CONTEXT:
${recentMain||"(none)"}`;

    const raw=await openRouterRequest([
      {role:"system",content:compileSystemPrompt()+"\n\n"+prompt}
    ],420,0.75);
    const packet=parseSocialPacket(raw);
    post.reactions=packet.reactions;
    post.comments=packet.comments;
    if(packet.reactions.length||packet.comments.length){
      ch.socialUnread=Number(ch.socialUnread||0)+packet.reactions.length+packet.comments.length;
    }
    saveVault();renderSocial();
  }

  async function postStatus(text){
    const clean=String(text||"").trim();if(!clean)return;
    const ch=activeChat(),me=personaCard();
    const post={id:uid(),role:"user",author:me.name,text:clean,createdAt:now(),reactions:[],comments:[]};
    ch.socialPosts.push(post);ch.updatedAt=now();saveVault();renderSocial();
    const status=document.getElementById("socialStatus"),btn=document.getElementById("socialPostBtn");
    if(btn)btn.disabled=true;if(status)status.textContent="Contacts are seeing it…";
    try{
      await generateImmediateReactions(post);
      if(status)status.textContent="";
    }catch(err){
      if(status)status.textContent="Posted. Reactions could not load.";
    }finally{if(btn)btn.disabled=false}
  }

  function updateSocialDot(){
    const dot=document.getElementById("socialTabDot"),n=Number(activeChat()?.socialUnread||0);
    if(!dot)return;
    dot.classList.toggle("hidden",n<=0);
    dot.textContent=n>9?"9+":(n?String(n):"");
  }

  function bindSocial(){
    document.getElementById("socialForm")?.addEventListener("submit",async e=>{
      e.preventDefault();const input=document.getElementById("socialInput");const text=input?.value||"";
      if(input)input.value="";await postStatus(text);
    });
  }

  const baseRenderAll=renderAll;
  renderAll=function(){ensureSocialData();baseRenderAll();injectSocialUI();renderSocial();updateSocialDot()};

  ensureSocialData();injectSocialUI();bindSocial();renderSocial();updateSocialDot();
  const badge=document.getElementById("buildBadge");if(badge)badge.textContent="v"+BUILD;
})();