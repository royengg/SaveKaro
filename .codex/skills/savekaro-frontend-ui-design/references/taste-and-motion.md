# Taste And Motion

Use this reference before implementing a meaningful UI change. It exists to raise design judgment, not to justify visual flourish.

## Core Position

- Treat taste as trained judgment under constraints.
- Favor clarity, restraint, and care over novelty.
- Use Apple's design discipline as a reference point for decision quality, not as a mandate to imitate Apple's look.
- Preserve SaveKaro's product language unless the user explicitly asks for a redesign.

## What Good Taste Means In Practice

- Show what matters first.
- Reduce reading effort through hierarchy.
- Remove weak accents, weak labels, and weak containers.
- Make actions feel obvious and dependable.
- Use motion to explain, not decorate.
- Make the screen feel calm, not empty; rich, not crowded.

## Apple-Like Design Discipline

Infer these principles from Apple HIG and design talks:

- Orient people quickly.
  A user should understand where they are, what matters, and what they can do without scanning the whole screen.

- Let content and task lead.
  UI should support the experience, not compete with it.

- Preserve spatial continuity.
  Open, close, enter, and back actions should feel physically related.

- Keep interactions lightweight.
  Small input should produce satisfying response without feeling heavy or delayed.

- Make motion interruptible.
  Do not trap the user inside a long transition.

- Respect comfort.
  Avoid disorienting motion, noisy animation, and excessive simultaneous movement.

- Sweat invisible details.
  Users sense care and carelessness even when they cannot explain why.

## Taste Gate

Run this check before coding. If the answer to any question is weak, simplify first.

1. What is the primary action or piece of information on this surface?
2. What can be removed without hurting comprehension?
3. Is the hierarchy obvious in under 3 seconds?
4. Are interactive elements visually interactive?
5. Does motion explain state, origin, or feedback?
6. Is there any accent, border, badge, label, or shadow that exists only because it looked empty without it?
7. Does this follow established platform and product patterns unless there is a clear reason not to?
8. Does this feel more humane and easier to use, not just more styled?

## Hierarchy Rules

- Use position, spacing, size, and contrast before adding decoration.
- Keep one dominant focal point per section.
- Avoid equal visual weight across multiple cards or actions.
- Use muted treatments for supportive content so primary content can lead.
- Prefer fewer text sizes and fewer surface styles.

## Motion Rules

- Animate state changes, not idle decoration.
- Prefer transform and opacity for performance and clarity.
- Keep motion short enough to feel responsive.
- Match direction to intent:
  - upward or outward for reveal and promotion
  - downward or inward for dismissal and settling
  - lateral movement only when the information architecture suggests lateral movement
- Preserve origin. Expanded content should feel connected to its trigger.
- Respect `prefers-reduced-motion`.

## Common Failure Modes

- Minimalism that hides affordances.
- Too many pills, badges, chips, and labels competing for attention.
- Decorative gradients or shadows that muddy hierarchy.
- Motion that is unrelated to user intent.
- Over-designed empty states and under-designed core workflows.
- Multiple primary actions inside one local region.
- Brand color used so often that nothing feels important.

## SaveKaro-Specific Guidance

- Keep the white-first, editorial-commerce feel.
- Let red remain the strongest brand signal.
- Use soft tints for discovery and categorization, not for every component.
- Keep home feed interactions fast, airy, and easy to scan.
- Preserve stable navigation anchors unless explicitly asked to redesign them.
- When in doubt, make the UI simpler and more legible before making it more expressive.
