# Noctis v0.15.5 — Milestone Sync

Replace these two files in the ROOT of `wildwonder0830/NOCTIS_mourning_Vale`:

- `build-version.js`
- `relationship-milestones.js`

No index.html editing is required.

## New feature: Milestone Sync
Open a story chat → tap `🖤 Milestones` → tap `🔄 Milestone Sync`.

On the first run, Noctis scans the full active story in chunks and suggests relationship milestones it finds. Suggestions are NOT saved automatically.

Review the list:
- uncheck anything that is wrong
- tap `🖤 Add Selected` to add canon milestones
- tap `Mark Reviewed` if there is nothing you want to add
- use `↺ Rescan All` whenever you want Noctis to reread the entire timeline

After a reviewed scan, future normal syncs scan only newer story messages.

Historical sync items store:
- the detected milestone
- evidence summary
- approximate source message
- original message date when available
- `Story Sync` as the source

The scanner is deliberately conservative around permanent states such as mating, marking, bonding, engagement, marriage, claiming, and pregnancy-related decisions. It requires explicit story evidence rather than inferring them from possessive dialogue or chemistry.
