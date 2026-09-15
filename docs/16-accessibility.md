# NOVA — Accessibility

## 1. Principles

Accessibility must coexist with the visual identity.

## 2. Reduced Motion

Provide a reduced-motion mode that lowers:

- camera animation;
- traffic animation;
- particle motion;
- UI transitions;
- bloom intensity where appropriate.

Simulation speed remains controllable.

## 3. Color

Never encode a critical state using color alone.

Examples:

```text
Energy shortage
→ color + icon + text

Selected building
→ contrast + outline/geometry + panel
```

## 4. Keyboard

All essential controls must be keyboard reachable.

Focus order should follow the visual hierarchy.

## 5. Text

Avoid tiny permanent labels.

Use readable sizes and sufficient contrast.

## 6. Pause

Pause must always be available.

The game should never force time progression.

## 7. Audio

If audio is introduced:

- never make it required for gameplay;
- provide independent volume controls;
- respect reduced-motion/system preferences where relevant.

## 8. Screen Readers

UI panels and controls should have semantic labels.

The 3D scene itself should have a textual summary for selected objects and key city metrics.

## 9. Accessibility Testing

Test:

- keyboard-only navigation;
- reduced motion;
- contrast;
- focus visibility;
- zoomed UI;
- screen-reader semantics for core controls.

The MVP gate additionally requires a throttled textual canvas summary containing stage, population, resource balances and the selected object. Meaningful events may be announced; per-tick announcements are prohibited. Measurable accessibility requirements are collected in [20-product-contract.md](./20-product-contract.md).
