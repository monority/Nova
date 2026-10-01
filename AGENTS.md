# AGENTS.md

## 0. Core Principle

Build the smallest coherent system that solves the current problem.

Prefer:

- explicit code over clever abstractions
- composition over duplication
- deterministic behavior over implicit behavior
- local reasoning over global magic
- reusable components over repeated markup
- domain logic separated from presentation
- real browser verification over assumptions
- measured facts over guesses

Do not introduce architecture merely because it is theoretically scalable.

Every abstraction must earn its existence.

---

# 1. Componentize Everything

**Componentize everything that has a meaningful visual identity or can reasonably be reused.**

One-word-named, display-only components are preferred when they represent a distinct visual concept.

Examples:

- `SearchField`
- `Glass`
- `Logo`
- `Masonry`
- `Lightbox`
- `Splash`
- `Sidebar`
- `Gallery`

If an element could appear twice, make it a component with props.

If an element has its own visual identity, make it a component even if it currently appears once.

Prefer:

```tsx
<GalleryItem
  image={image}
  index={index}
  onOpen={handleOpen}
/>
```

over repeating equivalent markup inline.

Prefer:

```tsx
<Glass intensity="medium">
  ...
</Glass>
```

over duplicating the same visual treatment across several files.

Do not create meaningless wrapper components solely to reduce line count.

A component should represent one clear visual or behavioral concept.

---

# 2. Components Are Presentation

UI components should primarily describe **what is rendered**.

They should not become accidental application controllers.

Good:

```tsx
<Gallery
  items={items}
  selectedId={selectedId}
  onSelect={handleSelect}
/>
```

Bad:

```tsx
<Gallery
  fetchImages={...}
  mutateDatabase={...}
  calculateLayout={...}
  manageHistory={...}
  persistState={...}
/>
```

Keep presentation declarative.

When a component starts accumulating:

- complex state
- domain rules
- persistence
- orchestration
- derived business logic
- cross-component coordination

move that logic into the appropriate model/controller/application layer.

---

# 3. Logic and State Live in Models

**Logic/state lives in the model layer.**

For example:

```text
Gallery
  ↓
GalleryModel
  ↓
domain/application logic
```

The UI should consume the model rather than reinventing it.

Prefer:

```tsx
const gallery = GalleryModel(state);

return (
  <Gallery
    items={gallery.items}
    selected={gallery.selected}
    canNavigate={gallery.canNavigate}
  />
);
```

over:

```tsx
const [selected, setSelected] = useState(...);

const canNavigate = ...
const filteredItems = ...
const sortedItems = ...
```

inside the presentation component when those concepts belong to the gallery's behavior.

React state is acceptable for genuinely local presentation state:

- hover state
- temporary animation state
- open/closed UI state
- input draft state
- transient focus state

Do not use component-local state as a substitute for the application's domain model.

---

# 4. One Responsibility Per Component

A component should have one primary responsibility.

Good:

```text
Gallery       → displays the gallery
Masonry       → displays masonry layout
Lightbox      → displays selected media
Sidebar       → displays navigation
SearchField   → displays search input
Logo          → displays branding
Splash        → displays startup/loading presentation
Glass         → displays glass visual treatment
```

Avoid:

```text
GalleryAndSearchAndSidebarAndLightbox.tsx
```

If a component can be described with "and", inspect whether it should be split.

---

# 5. Prefer Composition

Build interfaces from small composable primitives.

Prefer:

```tsx
<Glass>
  <Logo />
  <SearchField />
</Glass>
```

over a monolithic component that knows about all three concepts.

Prefer:

```tsx
<Gallery>
  <Masonry>
    ...
  </Masonry>
</Gallery>
```

when the composition communicates the architecture clearly.

Do not force composition when it makes the API harder to understand.

---

# 6. Props Over Duplication

Repeated UI should normally become a component with props.

Instead of:

```tsx
<div className="card">...</div>
<div className="card">...</div>
<div className="card">...</div>
```

create:

```tsx
<Card {...props} />
```

and map data:

```tsx
items.map(item => (
  <Card key={item.id} {...item} />
))
```

Do not duplicate JSX merely because two instances currently differ slightly.

If differences are meaningful, expose explicit props.

Prefer:

```tsx
<Button variant="secondary" size="sm" />
```

over:

```tsx
<Button className="..." />
```

when the difference represents a real semantic variant.

---

# 7. Avoid Prop Explosion

Componentization does not mean creating components with 25 props.

If a component requires many unrelated props, reconsider its responsibility.

Bad:

```tsx
<Gallery
  items={...}
  user={...}
  theme={...}
  database={...}
  router={...}
  analytics={...}
  permissions={...}
  filters={...}
  search={...}
  layout={...}
  ...
/>
```

Prefer smaller components and focused models.

---

# 8. No God Components

Avoid components that:

- fetch data
- transform domain data
- manage global state
- calculate layout
- render the entire page
- handle navigation
- manage dialogs
- contain dozens of event handlers

all at once.

A page should primarily compose systems.

Example:

```tsx
export function GalleryPage() {
  return (
    <>
      <Sidebar />
      <Gallery />
      <Lightbox />
    </>
  );
}
```

The page should not become the application's central brain.

---

# 9. File Naming

Use descriptive PascalCase names for React components.

Examples:

```text
Gallery.tsx
GalleryItem.tsx
GalleryModel.ts
SearchField.tsx
Lightbox.tsx
Sidebar.tsx
Masonry.tsx
```

Avoid vague names:

```text
Thing.tsx
Stuff.tsx
Helper.tsx
Utils.tsx
Component.tsx
Manager.tsx
Misc.tsx
```

One-word component names are encouraged when the concept is naturally one word:

```text
Logo
Sidebar
Gallery
Masonry
Lightbox
Splash
Glass
```

Do not artificially create awkward names.

---

# 10. Keep Files Focused

A file should have a clear purpose.

Avoid files containing:

- unrelated components
- unrelated utilities
- domain logic
- UI constants
- API clients
- state management

all together.

If a file becomes difficult to scan, split it.

Do not split tiny code into dozens of microscopic files without a meaningful architectural reason.

---

# 11. Domain Logic Must Be Testable Without the UI

Core logic should not require React rendering.

Prefer:

```ts
const result = GalleryModel(state);
```

over:

```ts
render(<Gallery />);
```

for testing domain behavior.

Domain tests should be:

- deterministic
- fast
- isolated
- independent from browser rendering

Browser tests should verify integration and actual user behavior.

---

# 12. Never Hide Business Logic in JSX

Avoid:

```tsx
{items
  .filter(...)
  .sort(...)
  .map(...)
}
```

when the filtering/sorting represents application behavior.

Prefer:

```tsx
const visibleItems = GalleryModel.getVisibleItems(state);
```

then:

```tsx
{visibleItems.map(...)}
```

JSX should remain readable.

Small presentation-only expressions are fine.

---

# 13. Derived State Should Be Derived

Do not persist values that can be deterministically derived.

Bad:

```ts
state.items
state.filteredItems
state.filteredItemCount
```

when the latter two can be derived from `items` and the filter.

Prefer:

```ts
const filteredItems = getFilteredItems(state);
```

Persist the source of truth.

Derive everything else.

---

# 14. Single Source of Truth

Every important piece of state should have one authoritative owner.

Do not synchronize the same state manually across:

```text
React state
localStorage
URL
model
context
database
```

unless synchronization is explicitly part of the architecture.

Define:

```text
source of truth
↓
derived state
↓
presentation
```

before implementing complex state.

---

# 15. State Ownership

State should live at the lowest layer that needs to own it.

Use local component state for genuinely local UI concerns.

Use models/application state for shared behavior.

Use URL state when the URL is intentionally the source of truth.

Use persistent storage only when persistence is required.

Do not promote local state to global state without a concrete reason.

---

# 16. No Premature Abstraction

Do not create an abstraction because:

> "We might need this later."

Create it because there is a current, demonstrated need.

Before introducing an abstraction ask:

1. Is this repeated?
2. Is the repetition meaningful?
3. Does the abstraction reduce complexity?
4. Does it make the API clearer?
5. Is it easier to test?
6. Does it preserve current behavior?

If not, keep the code simple.

---

# 17. No Duplicate Implementations

Before implementing functionality, search the repository.

Look for:

- existing components
- existing utilities
- existing models
- existing hooks
- existing API clients
- existing types
- existing tests

Do not create a second implementation of something that already exists.

If an existing implementation is inadequate, improve it when appropriate instead of silently creating another one.

---

# 18. Read Before Editing

Before changing code:

1. inspect the repository structure
2. locate the relevant files
3. read surrounding code
4. inspect existing tests
5. inspect existing conventions
6. inspect git status
7. understand the current architecture

Do not start coding from the task description alone.

The repository is the source of truth.

---

# 19. Preserve Existing Architecture

Do not rewrite architecture simply because another approach appears cleaner.

Existing boundaries are intentional until proven otherwise.

Before changing an architectural boundary:

- identify why it exists
- identify consumers
- identify tests
- identify persistence/API contracts
- identify migration impact

Prefer incremental evolution.

---

# 20. No Unrequested Feature Creep

Implement the requested behavior.

Do not silently add:

- extra features
- redesigns
- new dependencies
- new abstractions
- unrelated refactors
- additional persistence
- speculative APIs

A task should remain scoped.

If an improvement is valuable but outside the task, mention it in the final report instead of silently implementing it.

---

# 21. Dependencies

Do not add a dependency for trivial functionality.

Before adding a package:

1. check whether the repository already has an equivalent
2. check whether the platform/runtime already provides the functionality
3. check bundle/runtime implications
4. check maintenance quality
5. verify compatibility with the existing stack

Prefer fewer dependencies.

---

# 22. Type Safety

Use TypeScript strictly.

Avoid:

```ts
any
```

unless there is a documented and justified boundary.

Prefer:

```ts
unknown
```

with explicit narrowing.

Do not silence the compiler merely to make a task pass.

Avoid unnecessary type assertions:

```ts
foo as Whatever
```

Prefer types that make invalid states difficult to represent.

---

# 23. Error Handling

Errors must be explicit.

Do not silently swallow errors:

```ts
try {
  ...
} catch {}
```

If an error is intentionally ignored, document why.

User-facing errors should be understandable.

Developer-facing errors should contain enough context to diagnose the failure.

---

# 24. Async Boundaries

Handle loading, success, empty, and error states deliberately.

Do not assume an async operation succeeds.

For UI data:

```text
loading
↓
success
↓
empty / populated
↓
error
```

should be considered explicitly where relevant.

---

# 25. Accessibility Is Part of Correctness

Interactive elements must be accessible.

Prefer semantic HTML:

```html
<button>
<a>
<nav>
<main>
<aside>
<header>
<footer>
```

over clickable generic containers.

Provide:

- accessible names
- keyboard interaction
- visible focus states
- correct ARIA only when necessary
- appropriate semantic structure

Do not use ARIA to compensate for incorrect HTML.

---

# 26. Responsive Design

Do not implement desktop first and "fix mobile later" by default.

Consider:

- narrow viewport
- touch interaction
- keyboard interaction
- large text
- reduced motion
- dynamic viewport height
- overflow behavior

A responsive interface should remain structurally coherent across sizes.

---

# 27. Visual Consistency

Reuse existing design tokens and primitives.

Before adding:

```css
padding: 17px;
color: #123456;
border-radius: 13px;
```

check whether the project already defines equivalent tokens.

Avoid arbitrary one-off values when a design system exists.

---

# 28. CSS

Prefer simple, predictable CSS.

Avoid deeply nested selectors.

Avoid excessive specificity.

Avoid `!important` unless there is a documented reason.

Avoid duplicating identical styles.

Prefer component-level styling conventions already established by the project.

Do not introduce a new styling system without explicit justification.

---

# 29. Performance

Optimize real bottlenecks, not hypothetical ones.

Priorities:

1. correct architecture
2. correct rendering behavior
3. network efficiency
4. unnecessary work
5. bundle size
6. rendering performance

Do not introduce memoization everywhere.

Do not use:

```ts
useMemo
useCallback
memo
```

without a reason.

Measure before optimizing when practical.

---

# 30. Images and Media

Images should be handled deliberately.

Consider:

- dimensions
- aspect ratio
- loading strategy
- decoding
- responsive sizing
- lazy loading
- object positioning
- accessibility

Do not allow layout shift when dimensions can be known.

---

# 31. Browser Verification Is Mandatory

If the task affects UI, **verify the real application in a real browser**.

Do not consider:

```text
TypeScript passes
tests pass
```

sufficient evidence for a visual/UI task.

Verify:

- page loads
- expected elements exist
- interactions work
- layout is correct
- responsive behavior works
- scrolling behaves correctly
- overlays behave correctly
- keyboard interaction works where relevant
- console has no unexpected errors
- network failures are investigated

---

# 32. Test at the Right Level

Use the smallest test level that proves the behavior.

### Unit tests

For:

- pure functions
- domain logic
- models
- deterministic transformations

### Integration tests

For:

- multiple modules interacting
- application workflows
- state transitions

### Browser/E2E tests

For:

- real navigation
- real interactions
- critical user flows
- visual/layout behavior
- browser-specific behavior

Do not replace domain tests with E2E tests.

Do not replace browser verification with unit tests.

---

# 33. Every Bug Fix Gets a Regression Test

When fixing a reproducible bug:

1. reproduce it
2. add a regression test
3. implement the fix
4. verify the test fails before the fix when practical
5. verify it passes after the fix
6. verify adjacent behavior

Do not fix the symptom without protecting against recurrence.

---

# 34. Test Existing Behavior

Before changing behavior, identify relevant existing tests.

After changing behavior:

```text
targeted tests
↓
related tests
↓
full suite
```

Do not only run the newly created test.

---

# 35. Browser QA

For UI tasks, perform an explicit QA pass.

Check:

### Functional

- interactions
- navigation
- forms
- dialogs
- keyboard behavior
- state transitions

### Visual

- spacing
- alignment
- typography
- overflow
- responsive behavior
- z-index
- overlays
- empty states

### Technical

- console errors
- failed network requests
- hydration errors
- runtime exceptions
- accessibility warnings where available

---

# 36. Do Not Trust Screenshots Alone

A screenshot proves appearance at one moment.

It does not prove:

- interaction
- keyboard behavior
- responsive behavior
- state transitions
- persistence
- runtime stability

Use screenshots as visual evidence, not as the only verification method.

---

# 37. Git Discipline

Before work:

```bash
git status
```

After work:

```bash
git status
git diff
```

Review the actual diff.

Do not commit:

- generated garbage
- secrets
- unrelated changes
- temporary debugging code
- local environment files

Keep commits focused.

Use meaningful commit messages.

---

# 38. Never Destroy User Work

Do not:

```bash
git reset --hard
git clean -fd
```

or equivalent destructive commands unless explicitly instructed.

Do not overwrite existing user changes.

If the working tree is dirty, understand what the changes are before modifying affected files.

---

# 39. Documentation

Documentation should describe the current system.

When architecture changes, update relevant documentation.

Do not maintain fictional roadmaps or obsolete architectural descriptions.

Prefer concise documentation containing:

- current behavior
- important constraints
- invariants
- public APIs
- known limitations

---

# 40. Comments

Write comments explaining **why**, not what.

Bad:

```ts
// Increment i
i++;
```

Good:

```ts
// Keep the selected index stable when filtering removes items before it.
```

Delete comments that are no longer true.

Never leave misleading comments.

---

# 41. No Dead Code

Do not leave:

- unused imports
- unused variables
- unreachable branches
- abandoned components
- obsolete utilities
- commented-out implementations

If code is no longer needed, remove it.

Do not preserve dead code "just in case" when version control already provides history.

---

# 42. No Fake Implementations

Never implement fake behavior merely to satisfy a test or UI.

Avoid:

```ts
return true;
```

when the real condition has not been implemented.

Avoid:

```ts
// TODO: real implementation
```

unless explicitly requested as scaffolding.

If a feature cannot honestly be implemented with current data or architecture, stop and report the limitation.

---

# 43. Determinism

Prefer deterministic behavior.

Given the same:

```text
input
+
state
+
configuration
```

the system should produce the same result.

Avoid hidden dependencies on:

- current time
- random values
- iteration order
- network timing
- browser-specific incidental behavior

unless those are explicitly part of the feature.

---

# 44. Data Flow Must Be Obvious

Prefer:

```text
input
 ↓
model
 ↓
derived state
 ↓
component
 ↓
DOM
```

Avoid circular data flow.

Avoid components mutating state owned by unrelated components.

---

# 45. UI Must Not Invent Domain Behavior

A visual component should not silently decide application rules.

For example, a `Gallery` should not decide:

- authorization
- persistence
- database mutations
- domain classification
- business rules

unless those responsibilities are explicitly part of its contract.

The model/application layer decides.

The UI renders the result.

---

# 46. Keep Public APIs Small

Expose only what consumers actually need.

Prefer:

```ts
gallery.select(id)
gallery.next()
gallery.previous()
```

over exposing internal implementation details.

Do not expose mutable internal state unnecessarily.

---

# 47. Preserve Backwards Compatibility

When modifying a public API:

1. identify consumers
2. identify tests
3. assess migration impact
4. prefer compatible changes when practical
5. update all consumers deliberately

Do not casually rename or remove public APIs.

---

# 48. Refactoring Rule

Refactor when it directly improves the task.

Do not combine a feature implementation with a repository-wide cleanup unless requested.

Good:

```text
feature
+
small necessary refactor
```

Avoid:

```text
feature
+
new architecture
+
new design system
+
dependency migration
+
folder restructuring
+
unrelated cleanup
```

---

# 49. Agent Execution Protocol

For every non-trivial task:

## Phase 1 — Understand

Inspect:

```text
repository
architecture
relevant files
tests
git state
existing implementation
```

## Phase 2 — Plan

Define:

```text
what changes
what does not change
where logic belongs
which tests prove correctness
which browser checks are required
```

Do not begin implementation until the plan is coherent.

## Phase 3 — Implement

Make the smallest coherent implementation.

Follow existing conventions unless they conflict with the task.

## Phase 4 — Test

Run targeted tests first.

Then related tests.

Then the full relevant suite.

## Phase 5 — Browser Verification

If UI is affected:

```text
start application
open browser
exercise feature
inspect console
inspect network
verify responsive behavior
verify important states
```

## Phase 6 — Review

Inspect:

```bash
git diff
git status
```

Check for:

- accidental changes
- dead code
- duplicated logic
- missing tests
- architecture drift
- accessibility issues

## Phase 7 — Report

The final report must state:

```text
Implemented
Tests
Browser verification
Files changed
Known limitations
Commit
```

Never claim something was verified if it was not actually verified.

---

# 50. Definition of Done

A task is not done merely because the code compiles.

A task is done when:

- implementation is complete
- architecture remains coherent
- types pass
- relevant tests pass
- regression coverage exists where appropriate
- UI is verified in the browser when applicable
- no unexpected console/runtime errors remain
- diff has been reviewed
- documentation is updated when necessary
- known limitations are explicitly reported

---

# 51. Final Principle

**Build like the code will be maintained by someone who did not write it.**

Make the architecture visible.

Make the data flow obvious.

Make components small.

Make models responsible for behavior.

Make tests prove behavior.

Make browser verification prove the UI.

Make every abstraction justify itself.

When uncertain:

**prefer the simpler design that preserves a clear path to future change.**
