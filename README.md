# Noctis Mourning Vale — v0.4.8

A browser-based personal character/RP vault.

## v0.3 major changes

- Character Library: multiple independent characters or shared casts
- Multiple chats/timelines per character
- Shared character canon separated from timeline-specific memory
- Separate scene state and open story threads per chat
- Full-vault JSON backup/export
- Automatic migration of the existing v0.2 browser state
- Legacy v0.2 JSON import compatibility
- Basic `.txt` transcript archival import
- Stricter anti-invention and protagonist-control rules
- Fixed free-model selector
- Built-in RP quality test using the same Jesse scenario
- API key remains outside backups and remains stored only in browser localStorage

## Current recommended free model test order

1. Google Gemma 4 31B (free)
2. NVIDIA Nemotron 3 Ultra (free)
3. NVIDIA Nemotron 3 Super (free)

Space Bunny Alpha is included as an optional experimental preview. The random OpenRouter free router is retained only as a fallback because it can change the underlying model between requests.

## Important

Replacing GitHub Pages files does not normally clear browser localStorage. On first load, v0.3 reads the old `noctis-mourning-vale-v0.2` state and converts it to the new vault structure automatically. Your existing Jesse data should therefore migrate into the first character entry.

Always make a Backup before large imports or migrations.


## v0.3.1 turn-taking patch

- Hard human-style turn boundary
- Bot controls NPCs/world only
- Bot must stop whenever the user's protagonist needs to respond or act
- No implied protagonist movement, emotions, reactions, acceptance, refusal, or bodily response
- Default reply length tightened to 1–3 focused paragraphs
- RP quality test now explicitly checks whether the model stops at the user's turn


## v0.4 RP Rescue

- New Rescue tab for moving old RP transcripts into Noctis
- Auto-detects common `Speaker: text` transcript formats
- Customizable labels for the user's protagonist and the RP character/cast
- Alternate-turn import modes for transcripts without speaker labels
- Raw archive mode when preserving text exactly matters more than parsing
- Preview before import
- Imports into the currently active character + chat
- Migration Notes field per character/cast
- Imported transcript content is preserved in full-vault backups
- No model/API call is made during transcript import

Recommended rescue workflow:
1. Create/select the correct character or shared cast.
2. Create/select the correct timeline.
3. Paste a manageable chunk of the old transcript into Rescue.
4. Preview the detected speakers.
5. Import.
6. Add confirmed canon to Shared Canon Memory / Lore as needed.
7. Export a full-vault backup.


## v0.4.1 settings migration fix

- Automatically recovers OpenRouter settings stored by v0.2 or v0.2.1
- Moves recovered settings into the current v0.4 settings key
- Full-vault backups still intentionally exclude API keys


## v0.4.2 API-key recovery + Safari cache fix

- Cache-busts `app.js` and `styles.css` so Safari loads the actual new build
- Searches current and legacy Noctis settings keys for the existing OpenRouter API key
- Last-resort local recovery scans this GitHub Pages origin for a stored OpenRouter-formatted key
- Adds a visible **Recover Stored Key** button in Settings
- Recovery remains entirely local; the key is never included in backups


## v0.4.3 model-test cleanup

- Connection test now reports only pass/fail instead of displaying whatever prose the model generated
- Clears stale RP-test errors whenever you switch models
- Requests reasoning output be excluded when the selected OpenRouter model supports that setting
- Cache-bust updated for Safari


## v0.4.4 provider-error fix

- Removed the experimental `reasoning` request option that could upset some free providers
- Nemotron 3 Ultra is the default fixed free model
- Retries one transient provider/network error automatically
- Shows provider/status details instead of only "Provider returned error"
- API key storage key remains unchanged
- Safari cache-bust advanced to v0.4.4


## v0.4.5 Continue / Elaborate controls

- **Continue**: asks the NPC/world to keep going from its side of the current turn, but still hard-stops before the user's protagonist must respond.
- **Elaborate**: adds more dialogue, atmosphere, body language, subtext, or environmental detail to the current moment without advancing or controlling the user's protagonist.
- Neither button stores a fake user message in the transcript.
- Both controls preserve the human-style turn boundary.
- Safari cache-bust advanced to v0.4.5.


## v0.4.6 response watchdog

- Adds a 45-second provider timeout so Noctis cannot hang forever on a dead free-model request
- Automatically retries one timeout/transient failure
- Restores the Send button even after failed requests
- Shows a clear in-chat error instead of silently appearing frozen
- Does not change API-key storage or vault data
- Safari cache-bust advanced to v0.4.6


## v0.4.7 Generate My Turn

- Adds **Generate My Turn** to the chat toolbar.
- The AI drafts the user's protagonist response into the composer instead of sending it automatically.
- The user can edit, rewrite, discard, or send the draft.
- Drafting uses the current character, chat history, memory, lore, and scene continuity.
- Attempts to match the user's established RP writing style from recent user turns.
- Adds a **My-Turn Generator Style** setting for custom instructions.
- The generator writes only the protagonist turn and does not continue into the NPC response.
- API-key storage and vault storage remain unchanged.
- Safari cache-bust advanced to v0.4.7.


## v0.4.8 mobile chat controls

- Moves the high-use RP controls down beside the composer.
- Adds a sticky bottom quick-action row for:
  - Continue
  - Elaborate
  - My Turn
  - Regen
- Keeps management actions (Rename, Clear, Delete Chat) in the upper toolbar.
- Quick-action buttons are intentionally smaller on iPhone/iPad so all four remain reachable without scrolling.
- Bottom dock respects the iPhone safe-area inset.
- API-key and vault storage are unchanged.
- Safari cache-bust advanced to v0.4.8.
