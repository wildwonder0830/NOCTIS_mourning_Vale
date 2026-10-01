# Noctis v0.15.7 reliability audit

Reviewed every script loaded by index.html, the dynamically loaded relationship milestone module, and the CSS cascade. Verified the complete app with synthetic local vaults and simulated model replies. Tests block network calls and never use a real API key.

## Corrected behavior

- One import router handles files by content. Renamed vault backups merge, character replacement runs once and respects cancellation, and both persona import entry points preserve the requested slot and full profile. Physical character fields no longer rely on a delayed handler that could write to the wrong character.
- Device merges retain newer message edits and reconcile persona IDs by slot instead of truncating imported personas. Structurally invalid backups are rejected before modifying the vault.
- Replies remain in their original timeline. Main chat generation cannot overlap. Typed Continue/Elaborate ignore command markers. Failed regeneration keeps the existing reply, and an assistant-only opening cannot be accidentally removed by Regen. Generated drafts preserve text the user typed while waiting.
- Milestone memory blocks replace cleanly instead of accumulating duplicates. Editing or rewinding summarized messages invalidates the affected compact memory.
- Milestone review is bound to the scanned timeline and transcript. Failed/incomplete scans cannot be marked reviewed, and the checkpoint does not skip messages added after the scan began.
- Zero-event stats results are valid. A formatting replacement no longer emits a literal capture placeholder.
- Group-thread clearing targets the group, switching to a contact exits group mode, and repeated phone submissions cannot overlap. Phone recovery stops if the active timeline changes; contact deduplication preserves other timelines and group membership. Unknown-contact phone markers are retained for later recovery.
- Social refresh failures produce a visible status. Background phone/social requests reserve their next scheduled time before waiting on the model, preventing duplicate timer requests. Social reactions preserve the user's own likes and exclude names outside the contact roster.
- Settings without an API key survive reload. The milestone loader avoids duplicate initialization during page-show events.

## Verification

Run `npm ci` then `npm test`. The suite covers full startup and all tabs, import cancellation and routing, merges, memory, asynchronous chat switching, commands, regeneration failure/success, drafts, stats, milestone review, phone routing, social errors, and the v0.15.6 scrolling checks. JavaScript syntax and git whitespace checks also run before publication.

## Limits

DOM tests do not measure Safari layout, touch momentum, keyboard behavior, or actual provider responses. Those still require device/live-model checks. The existing backup merge remains additive: deletions from one device are not synchronized as deletions to another device. No new deletion-sync policy was introduced in this maintenance update.
