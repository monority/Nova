# NOVA — UX & Interface

## 1. UX Principle

The city is the primary interface.

Controls should occupy as little permanent space as possible.

## 2. Persistent UI

The MVP persistent bar exposes year, population, food, energy and speed. Materials and water access are available in the inspector or resource detail view; research and policies remain disabled until their systems exist.

Top bar:

```text
Year
Population
Energy
Food
Speed
```

Left tool rail:

```text
Build
Zones
Infrastructure
Research (post-MVP)
Policies (post-MVP)
```

Bottom:

```text
Timeline + simulation controls
```

## 3. Context Inspector

Selecting an object opens a contextual panel.

Examples:

### Building

- type;
- population;
- energy;
- status;
- upgrade.

### Road

- traffic;
- capacity;
- connections.

### District

- population;
- dominant activity;
- satisfaction;
- growth.

## 4. Progressive Disclosure

Show the minimum required information first.

Advanced data is one interaction away.

## 5. Construction UX

Flow:

```text
Choose tool
→ preview
→ place/draw
→ validate
→ confirm
```

For roads, the preview should update continuously.

## 6. Selection

Selection must be obvious but subtle.

Use:

- contrast;
- local illumination;
- thin geometry;
- contextual panel.

Do not cover the city with selection markers.

## 7. Notifications

Use a compact event stream.

Only important events interrupt the player.

## 8. Empty State

A new world should communicate what the player can do without a tutorial wall.

Example:

```text
Establish your first settlement.
Choose a location and begin.
```

## 9. Keyboard

Minimum shortcuts:

```text
Space — pause
1/2/3/4/5 — speed
Esc — cancel
WASD / arrows — pan
+/- — zoom
```

The MVP speed mapping is `Space` for pause and `1` through `5` for pause, 1x, 2x, 5x and 20x. Every control also has a visible focus target.

## 10. Responsive Strategy

Desktop is the primary target.

Tablet receives a simplified control layout.

Mobile is not an MVP target.

## 11. Accessibility

All important information must have non-color representations.

Support:

- reduced motion;
- keyboard navigation;
- readable contrast;
- pause;
- scalable UI text.
