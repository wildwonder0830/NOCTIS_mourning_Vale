/* Local presentation only: saved message text and prompts remain unchanged. */
(() => {
  'use strict';
  function prose(parent, text) {
    // Complete delimiters only; unmatched quotes/asterisks stay readable as typed.
    const re = /\*\*([\s\S]+?)\*\*|\*([^*\n]+)\*|“([^”]+)”|"([^"\n]+)"/g;
    let end=0, match;
    while ((match=re.exec(text))) {
      parent.append(document.createTextNode(text.slice(end,match.index)));
      const action=match[1]!==undefined || match[2]!==undefined;
      const span=document.createElement(action?'strong':'span');
      span.className=action?'story-action':'story-dialogue';
      span.textContent=action?(match[1]??match[2]):match[0];
      parent.append(span);end=re.lastIndex;
    }
    parent.append(document.createTextNode(text.slice(end)));
  }
  function format(body,text) {
    const frag=document.createDocumentFragment();
    const re=/\[\[PHONE:([^\]\n]+)\]\]([\s\S]*?)\[\[\/PHONE\]\]/gi;
    let end=0,match;
    while((match=re.exec(text))){
      prose(frag,text.slice(end,match.index));
      const card=document.createElement('aside');card.className='inline-story-text';
      const label=document.createElement('strong');label.className='inline-text-sender';label.textContent=`Text · ${match[1].trim()}`;
      const content=document.createElement('div');content.textContent=match[2].trim();
      card.append(label,content);frag.append(card);end=re.lastIndex;
    }
    prose(frag,text.slice(end));body.replaceChildren(frag);body.dataset.storyFormatted='true';
  }
  function decorate(root,chat){
    root.querySelectorAll('.message:not(.error) .message-body').forEach(body=>format(body,body.textContent||''));
    const anchors=new Map([...root.querySelectorAll('[data-message-id]')].map(el=>[el.dataset.messageId,el]));
    const tails=new Map();
    for(const item of chat.milestones||[]){
      if(item.type!=='relationship')continue;
      const card=document.createElement('article');card.className='story-milestone-card';
      const kicker=document.createElement('div');kicker.className='story-milestone-kicker';kicker.textContent='Relationship milestone';
      const title=document.createElement('h3');title.textContent=item.title||'A new chapter';
      const names=document.createElement('p');names.className='story-milestone-names';names.textContent=(item.participants||[]).join(' & ');
      const line=document.createElement('p');line.className='story-milestone-line';line.textContent=item.line||item.note||'A new chapter has begun.';
      const replay=document.createElement('button');replay.type='button';replay.className='ghost small';replay.textContent='Replay celebration';
      replay.addEventListener('click',()=>window.NoctisRelationshipMilestones?.show(item));
      card.append(kicker,title,names,line,replay);
      const anchor=tails.get(item.sourceMessageId)||anchors.get(item.sourceMessageId);
      if(anchor){anchor.after(card);tails.set(item.sourceMessageId,card);}else root.append(card);
    }
  }
  window.NoctisStoryPresentation={decorate,format};
  const style=document.createElement('style');style.textContent=`
#messages .message.assistant{background:transparent;border-color:transparent;box-shadow:none;max-width:100%;padding:14px 4px}
#messages .message-body{white-space:pre-wrap;overflow-wrap:anywhere}
#messages .story-action{color:#f5effa;font-weight:650}
#messages .story-dialogue{display:block;width:fit-content;max-width:100%;box-sizing:border-box;margin:14px 0;padding:14px 18px;border-radius:4px 18px 18px 18px;background:#402d51;color:#fff7ff;white-space:pre-wrap;line-height:1.65}
#messages .story-milestone-card{box-sizing:border-box;max-width:620px;margin:22px auto;padding:24px;border:1px solid #b49a60;border-radius:18px;background:#201724;text-align:center;overflow-wrap:anywhere}
.story-milestone-kicker{color:#cfb979;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.story-milestone-card h3{font-family:Georgia,serif;color:#e6cc88;font-size:28px;line-height:1.2;margin:14px 0}
.story-milestone-names{color:#decbed;font-size:14px}.story-milestone-line{font-family:Georgia,serif;font-size:19px;line-height:1.6;font-style:italic;padding:16px 0;border-top:1px solid #654c6c}
#relationshipMilestoneCeremony{overflow:auto}
#relationshipMilestoneCeremony .rm-ceremony-card{max-height:calc(100dvh - 48px);overflow:auto;box-sizing:border-box;border:1px solid #b49a60;border-radius:22px;background:#201724;padding:28px 22px}
#relationshipMilestoneCeremony .rm-ceremony-title{font-family:Georgia,serif;color:#e6cc88;font-size:clamp(28px,7vw,44px);line-height:1.15;overflow-wrap:anywhere}
#relationshipMilestoneCeremony .rm-ceremony-line{font-family:Georgia,serif;font-size:20px;border-top:1px solid #654c6c;padding-top:20px;color:#f2e4ef}
#relationshipMilestoneCeremony .rm-ceremony-emoji{font-size:40px;margin:14px 0}
@media(max-width:600px){#messages .story-milestone-card{padding:20px 16px;margin:18px 0}.story-milestone-card h3{font-size:26px}#messages .story-dialogue{padding:12px 14px}}
`;
  document.head.append(style);
  renderMessages();
})();
