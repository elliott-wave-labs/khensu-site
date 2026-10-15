---
title: 'nu.glass'
source: 'design/nu-glass.md'
---

# nu.glass — Quantum × Liquid Glass

**Decided 15 October 2026.** Shown as **nu.glass**. Host: `design.quantumglass.khensu.nu` (display `design.quantumGlass.khensu.nu`). Code, paths and data keys stay `nu.glass` / `quantumglass`.

A design collab between **Apple Liquid Glass** (iOS / SwiftUI translucent chrome, [Menu](https://developer.apple.com/documentation/swiftui/menu), [Menu beyond a button list](https://levelup.gitconnected.com/swiftui-menu-a-little-more-than-just-a-list-of-buttons-dd143ba9f6cf)) and **khėnsu.ñü** — but the material is **not** a solid frosted sheet.

## 1. The material: clear number-light bubble explosion

Surfaces use the **clear** version of the creators / nu.Fi / nu.bi **Burst** scene — the number-light bubble explosion in `components/creators/Burst.astro` + `scripts/burst.ts`. Soft luminous orbs, additive aura cores (`#22f59a` / `#1e8fff` / `#8b5cff`), soap-bubble rims, almost-nothing fill. You see *through* the chrome; light does the work.

That language is part of **nu.aura**: fashion and design styles (not only the First Attempt track control or the flowing gradient). Aura = how light dresses the product.

| Layer | Source | What we keep |
| --- | --- | --- |
| Liquid Glass | iOS materials | Translucency, Menu shape, soft elevation — **clear**, not milky slab |
| Quantum | khėnsu.ñü | Depth, field motion, post-quantum truth in copy |
| nu.aura | Burst + fashion | Light-bubble explosion, aura cores/glows, flowing spectrum on selected chrome |

## 2. Tokens (code)

```css
/* Clear bubble — barely there film */
--nu-glass: rgba(255, 255, 255, 0.04);
--nu-glass-strong: rgba(255, 255, 255, 0.07);
/* Aura fashion (burst.ts) */
--aura-glow-g / -b / -p
--aura-core-g / -b / -p
```

Never replace aura with a flat brand purple. Never paint a solid dark sheet and call it glass.

## 3. Patterns

1. **Clear bubble card** — floating mini player: soft ellipse highlights, aura rim glow, see-through body.
2. **Menu** — SwiftUI Menu shape with clear bubble panel (not opaque `#12141a`).
3. **Selected chrome** — `var(--aura)` flow on progress / play / picks.
4. **Burst kinship** — same particle glow family as the number scene; chrome is the quiet cousin of that explosion.

## 4. Where it ships

- Spec: this file · live: `design.quantumglass.khensu.nu` (apex `/design-quantumglass` until Hover A + own cert).
- First consumer: nu.waves floating player + room Menu.
- Skills hosts stay separate (`skills.agent.harness`, `skills.agent.weeklyupdates`).
