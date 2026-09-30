# Noctis Relationship Milestones v1.0

This is an additive module designed to sit on top of the current Noctis build without changing the vault schema.

## Add these files to the repository root
- `relationship-milestones.js`
- `relationship-milestones.css`

## Add this stylesheet in `<head>` after the other Noctis styles
```html
<link rel="stylesheet" href="relationship-milestones.css?v=1.0.0" />
```

## Add this script near the bottom of `index.html`
Load it after feature/runtime modules and before `compatibility-core.js`, `merge-sync.js`, `backup-format-fix.js`, and `build-version.js`.

```html
<script src="relationship-milestones.js?v=1.0.0"></script>
```

If your current build does not include `compatibility-core.js`, load the milestone script after `runtime-fixes.js` and before `merge-sync.js`.

## What it does
- Adds a `🖤 Milestones` button to the Chat toolbar.
- Includes standard and supernatural relationship milestones.
- Allows fully custom milestone title, emoji/symbol string, ceremonial line, and private note.
- Shows an animated ceremonial popup with `Continue` and `View History`.
- Saves relationship events inside the active chat's existing `milestones` array using `type: "relationship"`.
- Keeps a separate `relationshipState` current-state pointer on the chat.
- Does not change `vault.version`.
- Existing full-vault backups retain these fields because they are additive.
- Existing milestone merge behavior can carry the events between devices.

## Built-in examples
Interested, Courting, Dating, Committed, Bonded, Marked, Mated, Fated, Blood-Bound, Chosen, Engaged, Married, Crowned, Immortal Consort.

Custom example: `Soul-Oathed` + `🕯️♾️🖤`.
