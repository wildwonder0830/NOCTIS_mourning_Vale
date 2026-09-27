/* Noctis v0.8.1 — Phone continuity + phone-side contact settings */
(() => {
  const FIX_BUILD = "0.8.1";

  function getRecentPhoneContinuity(limitPerContact = 4) {
    try {
      const c = activeCharacter();
      const ch = activeChat();
      if (!c || !ch || !Array.isArray(c.phoneContacts) || !ch.phoneThreads) return "";

      const chunks = [];
      c.phoneContacts.forEach(p => {
        const arr = Array.isArray(ch.phoneThreads[p.id]) ? ch.phoneThreads[p.id].slice(-limitPerContact) : [];
        if (!arr.length) return;
        const name = p.displayName || p.name || "Contact";
        chunks.push(
          `TEXT THREAD — ${name}\n` +
          arr.map(m => `${m.role === "user" ? "PROTAGONIST" : name}: ${m.text || ""}`).join("\n")
        );
      });
      return chunks.join("\n\n");
    } catch {
      return "";
    }
  }

  /* Put phone continuity at the END of the request as its own system message.
     This is intentionally more explicit than v0.8.0's prompt-only injection. */
  if (typeof apiMessages === "function" && !window.__noctisPhoneApiMessagesPatched) {
    const baseApiMessages = apiMessages;
    apiMessages = function(extraSystem = "") {
      const out = baseApiMessages(extraSystem);
      const recent = getRecentPhoneContinuity(4);
      if (recent) {
        out.push({
          role: "system",
          content:
`PHONE CONTINUITY — CANONICAL AND CURRENT
The following texts happened in this SAME timeline. Treat them as events the character remembers.
Do not pretend these messages did not occur. If the current scene naturally relates to them, preserve that knowledge and continuity.
Do not force a reference when it would be unnatural.

${recent}`
        });
      }
      return out;
    };
    window.__noctisPhoneApiMessagesPatched = true;
  }

  function addPhoneSettingsButton() {
    const header = document.querySelector('[data-view="phone"] .phone-header');
    if (!header || document.getElementById("phoneContactSettingsBtn")) return;

    const btn = document.createElement("button");
    btn.id = "phoneContactSettingsBtn";
    btn.type = "button";
    btn.className = "ghost small phone-contact-settings-btn";
    btn.textContent = "Contact Settings";
    btn.title = "Change contact photo, display name, status, or texting style";
    btn.addEventListener("click", () => {
      if (typeof selectTab === "function") selectTab("character");
      setTimeout(() => {
        const target = document.getElementById("phoneContactEditor");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
    header.appendChild(btn);
  }

  function updateBuildBadge() {
    const badge = document.getElementById("buildBadge");
    if (badge) badge.textContent = "v" + FIX_BUILD;
  }

  function boot() {
    addPhoneSettingsButton();
    updateBuildBadge();
  }

  boot();

  /* The Phone view is injected dynamically by phone.js. This observer makes
     the button survive later re-renders without touching the original file. */
  const observer = new MutationObserver(() => addPhoneSettingsButton());
  observer.observe(document.body, { childList: true, subtree: true });
})();
