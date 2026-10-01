/* Keep existing editors and handlers intact inside two navigation groups. */
(() => {
  'use strict';
  const groups={library:[['library','Characters'],['character','Edit character'],['persona','Personas']],memory:[['memory','Memory'],['lore','Lore'],['rescue','Rescue']]};
  const parentOf=name=>Object.keys(groups).find(group=>groups[group].some(([key])=>key===name))||name;
  for(const [group,items] of Object.entries(groups)){
    for(const [view] of items){
      const host=document.querySelector(`[data-view="${view}"]`);if(!host)continue;
      const nav=document.createElement('nav');nav.className='section-navigation';nav.setAttribute('aria-label',`${group==='library'?'Library':'Memory'} sections`);
      for(const [key,label] of items){
        const b=document.createElement('button');b.type='button';b.className='section-button';b.dataset.section=key;b.textContent=label;
        b.addEventListener('click',()=>selectTab(key));nav.append(b);
      }
      host.prepend(nav);
    }
  }
  function sync(name){
    const parent=parentOf(name);
    document.querySelectorAll('.tabs [data-tab]').forEach(b=>{const active=b.dataset.tab===parent;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.querySelectorAll('.section-button').forEach(b=>{const active=b.dataset.section===name;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  }
  const base=selectTab;
  selectTab=function(name){const target=name==='phone'?'memory':name;base(target);sync(target);};
  const style=document.createElement('style');style.textContent=`.section-navigation{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;padding:6px 0}.section-button{flex:1 1 auto;min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--text);font:inherit;font-weight:650}.section-button.active{background:rgba(154,86,238,.18);border-color:#ad78ef;color:#e4ceff}.section-button:focus-visible{outline:2px solid #d9b9ff;outline-offset:3px}.tabs .tab{flex:1 0 auto;text-align:center}@media(max-width:620px){.tabs{gap:5px}.tabs .tab{padding:9px 8px;font-size:13px;min-height:44px}}`;document.head.append(style);
  sync(document.querySelector('.view.active')?.dataset.view||'library');
})();
