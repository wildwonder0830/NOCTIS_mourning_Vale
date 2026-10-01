/* Noctis 0.16.3 — Inline story texts and a read-only legacy archive. */
(() => {
  'use strict';
  function appendProse(parent,text){
    String(text).split(/(\*\*[\s\S]*?\*\*)/g).forEach(part=>{
      if(part.startsWith('**')&&part.endsWith('**')&&part.length>4){const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);parent.append(strong);}
      else parent.append(document.createTextNode(part));
    });
  }
  function format(el,text){
    const fragment=document.createDocumentFragment(),re=/\[\[PHONE:([^\]\n]+)\]\]([\s\S]*?)\[\[\/PHONE\]\]/gi;
    let end=0,match;
    while((match=re.exec(text))){
      appendProse(fragment,text.slice(end,match.index));
      const card=document.createElement('aside');card.className='inline-story-text';
      const label=document.createElement('strong');label.className='inline-text-sender';label.textContent=`📱 Text · ${match[1].trim()}`;
      const body=document.createElement('div');body.textContent=match[2].trim();
      card.append(label,body);fragment.append(card);end=re.lastIndex;
    }
    appendProse(fragment,text.slice(end));el.replaceChildren(fragment);
  }
  window.NoctisInlineTexts={format};
  const basePrompt=compileSystemPrompt;
  compileSystemPrompt=function(){
    const roster=(activeCharacter().phoneContacts||[]).map(p=>`${p.displayName||p.name}: ${p.relationship||'established contact'}`).join('\n');
    return basePrompt()+`\n\nSTORY TEXT MESSAGES\nTexting happens within normal story turns. When an NPC actually sends a text, display it once as [[PHONE:Sender name]]message[[/PHONE]]. Surrounding narration stays outside the marker. Use occasional incoming texts only when natural; not every turn. Never write the protagonist's texts, replies, reactions or decisions. The user may text through their normal chat message. Stop when their response is needed. Each sender knows only what they witnessed or learned, never private scenes automatically. These texts are part of this timeline's story history.\nKnown contacts:\n${roster||'(use established story characters)'}`;
  };
  function renderArchive(){
    const host=document.getElementById('legacyPhoneArchiveBody');if(!host)return;host.replaceChildren();
    const c=activeCharacter(),ch=activeChat();let count=0;
    for(const [kind,threads] of [['contact',ch.phoneThreads||{}],['group',ch.groupThreads||{}]]){
      for(const [id,messages] of Object.entries(threads)){
        if(!Array.isArray(messages)||!messages.length)continue;
        const name=kind==='contact'?(c.phoneContacts||[]).find(p=>p.id===id):(ch.phoneGroups||[]).find(p=>p.id===id);
        const section=document.createElement('details'),title=document.createElement('summary');title.textContent=`${name?.displayName||name?.name||'Archived conversation'} · ${messages.length} messages`;section.append(title);
        for(const msg of messages){const p=document.createElement('p');p.className='archived-text';p.textContent=`${msg.role==='user'?'You':msg.author||name?.displayName||name?.name||'Contact'}: ${msg.text||''}`;section.append(p);count++;}
        host.append(section);
      }
    }
    if(!count)host.textContent='No archived phone messages in this timeline.';
  }
  function archiveUI(){
    const memory=document.querySelector('[data-view="memory"] .panel');if(!memory||document.getElementById('legacyPhoneArchive'))return;
    const section=document.createElement('details');section.id='legacyPhoneArchive';section.className='daily-usage-panel';
    section.innerHTML='<summary>Archived phone conversations</summary><p class="hint">Read-only messages from this timeline. New texts appear in the story. Old threads stay in backups but are no longer sent with every reply. Copy any important old facts into timeline memory if needed.</p><div id="legacyPhoneArchiveBody"></div>';
    section.addEventListener('toggle',()=>{if(section.open)renderArchive();});memory.append(section);
  }
  const baseRender=renderMessages;
  renderMessages=function(){baseRender();document.querySelectorAll('#messages .message-body').forEach(el=>{if(/\[\[PHONE:/i.test(el.textContent||''))format(el,el.textContent);});};
  const baseAll=renderAll;
  renderAll=function(){baseAll();archiveUI();if(document.getElementById('legacyPhoneArchive')?.open)renderArchive();};
  const baseTab=selectTab;
  selectTab=function(name){return baseTab(name==='phone'?'memory':name);};
  settings.ambientTextsEnabled=false;saveSettings();
  const style=document.createElement('style');style.textContent=`[data-tab="phone"],[data-view="phone"]{display:none!important}.inline-story-text{display:block;margin:12px 0;padding:12px 14px;border:1px solid #ad78ef;border-left:4px solid #ad78ef;border-radius:12px;background:rgba(144,75,218,.13);white-space:pre-wrap;overflow-wrap:anywhere}.inline-text-sender{display:block;color:#d9b9ff;margin-bottom:6px;font-size:.9em}.archived-text{white-space:pre-wrap;overflow-wrap:anywhere;border-bottom:1px solid var(--line,#49354f);padding:8px 0}`;document.head.append(style);
  archiveUI();renderMessages();
})();
