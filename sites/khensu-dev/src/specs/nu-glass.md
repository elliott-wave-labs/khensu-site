---
title: 'nu.glass'
source: 'design/nu-glass.md'
---

# nu.glass — Quantum × Liquid Glass

**Decided 15 October 2026.** Shown as **nu.glass**. Host: `design.quantumglass.khensu.nu` (display `design.quantumGlass.khensu.nu`). Code, paths and data keys stay `nu.glass` / `quantumglass`.

A design collab between **Apple Liquid Glass** (iOS / SwiftUI translucent chrome, [Menu](https://developer.apple.com/documentation/swiftui/menu), material blur) and **khėnsu.ñü** site language — Inter, JetBrains Mono, dark stage, and **nu.aura** as the primary energy.

## 1. What it is

| Layer | Source | What we keep |
| --- | --- | --- |
| Liquid Glass | iOS materials | Frosted panels, hairline edges, inset highlight, soft elevation, Menu-style dropdowns |
| Quantum | khėnsu.ñü | Post-quantum product truth in copy; depth and “field” motion, never purple-on-white AI default |
| nu.aura | First Attempt / waves | Cyan → green → blue → purple flowing gradient on text, progress, selected chrome |

nu.glass is the shared material system for waves mini-players, room menus, skill pages, and future product chrome. It is not a separate product — it is how glass surfaces look on khėnsu.ñü.

## 2. Tokens (code)

```css
--nu-glass: rgba(22, 24, 30, 0.55);
--nu-glass-strong: rgba(18, 20, 26, 0.72);
--nu-glass-edge: rgba(255, 255, 255, 0.18);
--nu-glass-inset: inset 0 1px 0 rgba(255, 255, 255, 0.22);
--nu-glass-blur: blur(28px) saturate(190%);
/* nu.aura stays the site globals: --aura, --aura-flow-dur */
```

Selected controls and progress use `var(--aura)` with `background-size: 300% 100%` and `aura-flow`. Never replace aura with a flat brand purple.

## 3. Patterns

1. **Glass card** — compact floating surfaces (mini player), not full-bleed bars.
2. **Menu** — SwiftUI Menu shape: summary + elevated glass panel, checkmark / aura dot on selected item.
3. **Tabs & chips** — glass track; selected state may use solid white or aura fill.
4. **Dialogs** — glass panel over blurred backdrop.

## 4. Where it ships

- Spec: this file · live: `design.quantumglass.khensu.nu` (apex `/design-quantumglass` until Hover A + own cert).
- First consumer: nu.waves floating player + room Menu.
- Skills hosts stay separate (`skills.agent.harness`, `skills.agent.weeklyupdates`).
