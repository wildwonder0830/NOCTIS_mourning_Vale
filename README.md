# Noctis Mourning Vale — v0.3.1

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
