# Noctis v0.8.0 Living Worlds — ready-to-upload patch

You do **not** need to type the two HTML lines manually in this package.

This folder now includes a replacement `index.html` with both additions already made:
- `phone.css?v=0.8.0`
- `phone.js?v=0.8.0` (loaded after the existing `app.js`)

## Install
1. In Noctis, make a Backup first.
2. Upload/replace these three files in the same GitHub Pages folder as your current Noctis files:
   - `index.html`
   - `phone.js`
   - `phone.css`
3. Do **not** replace `app.js` or `styles.css` for this patch.
4. Wait for GitHub Pages to deploy.
5. Fully close/reopen the Noctis page on iPhone/iPad if Safari shows the old build.
6. The build badge should change to `v0.8.0` after `phone.js` loads.

Your browser vault remains in localStorage; this patch does not intentionally clear existing characters, timelines, personas, chats, lore, or API-key storage.
