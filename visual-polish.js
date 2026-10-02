/* Presentation-only enhancements. No model requests or vault changes. */
(() => {
  'use strict';
  const actions = document.querySelector('.top-actions');
  const menu = document.createElement('details');
  menu.className = 'vault-tools';
  const summary = document.createElement('summary');
  summary.textContent = 'Vault tools';
  menu.append(summary);
  actions.before(menu);
  menu.append(actions);
  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      summary.focus();
    }
  });

  const settings = document.querySelector('[data-view="settings"] .panel');
  const about = document.createElement('p');
  about.className = 'hint app-version';
  about.append('Noctis Mourning Vale · ');
  about.append(document.getElementById('buildBadge'));
  settings.append(about);

  const toolbar = document.querySelector('.chat-toolbar');
  const chatTools = document.createElement('details');
  chatTools.className = 'story-tools';
  const toolsLabel = document.createElement('summary');
  toolsLabel.textContent = 'Story tools';
  chatTools.append(toolsLabel);
  toolbar.before(chatTools);
  chatTools.append(toolbar);

  const reading = document.createElement('div');
  reading.className = 'reading-controls';
  const label = document.createElement('label');
  label.textContent = 'Story text size';
  const select = document.createElement('select');
  select.id = 'readingSize';
  for (const [value, title] of [['standard', 'Standard'], ['large', 'Large'], ['larger', 'Extra large']]) {
    const option = document.createElement('option');
    option.value = value; option.textContent = title; select.append(option);
  }
  let saved;
  try { saved = localStorage.getItem('noctis.readingSize'); } catch (_) {}
  select.value = ['large', 'larger'].includes(saved) ? saved : 'standard';
  function applySize() { document.documentElement.dataset.readingSize = select.value; }
  applySize();
  select.addEventListener('change', () => {
    applySize();
    try { localStorage.setItem('noctis.readingSize', select.value); } catch (_) {}
  });
  label.append(select); reading.append(label); chatTools.append(reading);

  const titles = {library:'Library', character:'Character', persona:'Personas', chat:'Your story', memory:'Memory', milestones:'Milestones', lore:'Lorebook', rescue:'RP Rescue', settings:'Settings', stats:'Story stats'};
  const heading = document.querySelector('#topbar h1');
  function refresh() {
    const view = document.querySelector('.view.active')?.dataset.view;
    const title = titles[view] || 'Noctis';
    if (heading.textContent !== title) heading.textContent = title;
    document.querySelectorAll('#characterList .character-card').forEach(card => {
      if (card.querySelector('.card-continue')) return;
      const cue = document.createElement('span');
      cue.className = 'card-continue'; cue.textContent = 'Open story →';
      card.append(cue);
    });
  }
  new MutationObserver(refresh).observe(document.querySelector('main'), {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  refresh();
})();
