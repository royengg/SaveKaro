# AGENTS.md instructions for F:\Code\nodejs\SaveKaro

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills
- savekaro-frontend-ui-design: SaveKaro frontend UI, interaction, and design-judgment guidance for home feed surfaces, navigation, cards, filters, carousels, motion, hierarchy, and restraint. Use when adding, redesigning, or polishing frontend UI in this product, or when deciding whether a UI idea is good enough to implement, so layouts, spacing, motion, and interaction quality stay consistent, deliberate, and high taste. (file: F:\Code\nodejs\SaveKaro\.codex\skills\savekaro-frontend-ui-design\SKILL.md)

### How to use skills
- Discovery: The list above is the skills available in this repo context (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1. After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2. When `SKILL.md` references relative paths, resolve them relative to the skill directory listed above first.
  3. If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4. If `scripts/` exist, prefer running or patching them instead of retyping large blocks.
  5. If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why in one short line.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless blocked.
- Safety and fallback: If a skill can't be applied cleanly, state the issue, pick the next-best approach, and continue.
