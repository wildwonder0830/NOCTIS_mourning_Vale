/* Noctis Mourning Vale v0.17.22 — Build Authority + Relationship Milestone Sync Loader */
(() => {
  'use strict';

  const CURRENT_BUILD = "0.17.22";
  window.NOCTIS_CURRENT_BUILD = CURRENT_BUILD;

  function forceBuildBadge() {
    const badge = document.getElementById("buildBadge");
    if (!badge) return;
    const wanted = "v" + CURRENT_BUILD;
    if (badge.textContent !== wanted) badge.textContent = wanted;
  }

  function removeSyncUI() {
    ["syncBtn", "syncModal", "syncImportInput"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function loadRelationshipMilestones() {
    if (window.NoctisRelationshipMilestones?.version === "1.3.5") return;

    const old = document.querySelector('script[data-noctis-relationship-milestones]');
    if (old) return;

    const script = document.createElement("script");
    script.src = "relationship-milestones.js?v=1.3.5";
    script.async = false;
    script.dataset.noctisRelationshipMilestones = "1";

    script.addEventListener("load", () => {
      console.info("[Noctis] Relationship Milestones v1.2 + Milestone Sync loaded.");
      removeSyncUI();
    });

    script.addEventListener("error", () => {
      script.remove();
      console.error("[Noctis] Could not load relationship-milestones.js v1.2");
    });

    document.body.appendChild(script);
  }

  function boot() {
    forceBuildBadge();
    removeSyncUI();
    loadRelationshipMilestones();
  }

  boot();

  const badge = document.getElementById("buildBadge");
  if (badge) {
    new MutationObserver(forceBuildBadge).observe(
      badge,
      { childList: true, characterData: true, subtree: true }
    );
  }

  document.addEventListener("click", e => {
    if (e.target?.closest?.(".tab")) {
      requestAnimationFrame(() => {
        forceBuildBadge();
        removeSyncUI();
      });
    }
  });

  window.addEventListener("pageshow", boot);

  new MutationObserver(() => {
    forceBuildBadge();
    removeSyncUI();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
