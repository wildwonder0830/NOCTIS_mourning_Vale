# Noctis v0.15.4 — GitHub Ready

You only need to replace/upload **two files** in the root of:

`wildwonder0830/NOCTIS_mourning_Vale`

1. `build-version.js`
2. `relationship-milestones.js`

No `index.html` editing is required for this build.

## What happens after upload

- `build-version.js` changes the header to **v0.15.4**
- It removes the visible Sync UI
- It automatically loads `relationship-milestones.js`
- Chat gets a **🖤 Milestones** button
- The milestone panel includes **✨ Test Popup**
- The ceremonial emoji popup works independently of sync
- Relationship milestone history remains stored in the active chat's existing `milestones` array

## Test

After GitHub Pages deploys:

1. Refresh Noctis.
2. Confirm the header says **v0.15.4**.
3. Open **Chat**.
4. Tap **🖤 Milestones**.
5. Tap **✨ Test Popup**.

You should get the full ceremonial popup immediately.
