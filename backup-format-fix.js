/* Noctis Mourning Vale v0.13.6 — Canonical Backup Format Guard */
(() => {
  const BUILD = "0.13.6";
  const VAULT_SCHEMA = "0.7";

  window.NOCTIS_SCHEMA_VERSION = VAULT_SCHEMA;

  const deepCopy = value => JSON.parse(JSON.stringify(value));
  const isoDate = () => new Date().toISOString();

  function canonicalVaultSnapshot() {
    /*
      Important: do NOT mutate the live vault just to create a backup.
      Feature modules (Story Stats historically did this) may stamp their own
      feature version onto vault.version. Backups always use the canonical
      vault schema version that the importer understands.
    */
    const snapshot = deepCopy(vault);
    snapshot.version = VAULT_SCHEMA;
    snapshot.exportedAt = isoDate();
    snapshot.settingsExcluded = true;
    return snapshot;
  }

  function backupFilename() {
    return `noctis-vault-backup-v${VAULT_SCHEMA}-${isoDate().slice(0,10)}.json`;
  }

  function downloadCanonicalBackup() {
    try {
      if (typeof saveVault === "function") saveVault();
      const snapshot = canonicalVaultSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(`Backup failed: ${err?.message || String(err)}`);
    }
  }

  /*
    app.js already attached its own Backup click listener. Capture phase runs
    first, so stop that older exporter and use the canonical one instead.
  */
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("#exportBtn");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    downloadCanonicalBackup();
  }, true);

  window.NoctisBackup = {
    schemaVersion: VAULT_SCHEMA,
    canonicalVaultSnapshot,
    download: downloadCanonicalBackup
  };

  const badge = document.getElementById("buildBadge");
  if (badge) badge.textContent = "v" + BUILD;
})();
