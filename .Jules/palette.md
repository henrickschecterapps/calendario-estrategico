## 2026-04-15 - [Add ARIA labels to calendar navigation]
**Learning:** Found multiple icon-only navigation buttons in the custom calendar components lacking accessible names. Since the interface is in Portuguese, standardizing on PT-BR ARIA labels for component navigation ensures local screen reader compatibility.
**Action:** Always verify icon buttons in custom interactive components (like calendars and modals) have appropriate `aria-label`s matching the interface language.

## 2026-04-15 - [Enhance Card Hover States]
**Learning:** Found linear transition states and missing variable interpolation in card elements, causing visually abrupt and inconsistent interactions on hover.
**Action:** Used `cubic-bezier` timing functions alongside `transform: scale` properties and strict CSS variable usage (e.g. `var(--accent)`) to enforce smoother, token-based hover interaction states in static HTML interfaces.
## 2026-04-15 - [Improve Animation Easing Curves]
**Learning:** Across the application, numerous UI elements (`.btn-icon`, `.mini-day`, `.view-tab`, etc.) utilized standard linear `0.2s` or `0.3s` transitions which lack organic interaction feel.
**Action:** Replaced linear transitions with `cubic-bezier(0.16, 1, 0.3, 1)` easing curves globally across interactive elements in static HTML files to create snappier, more professional micro-interactions. Added subtle transform rules (`scale`, `translate`) and mapped active states to primary CSS variables.

## 2026-04-15 - [Modernize Primary Components]
**Learning:** Evaluated the `.btn-primary` and `::-webkit-scrollbar` components for visual coherence.
**Action:** Replaced static colors with inner box-shadow highlights, added consistent text-shadows, and increased scrollbar thumb width/radius to establish a distinct, modern identity aligned with standard UI/UX heuristics across static views.

## 2026-04-15 - [Refine Structural UI Component Styling]
**Learning:** Found static and somewhat cramped configurations in major structural components like `.admin-card`, `.modal`, and global form inputs (`.auth-input`, `.admin-input`), which detracted from the modern aesthetic.
**Action:** Applied comprehensive CSS updates to inputs, cards, and modals: increased paddings for better breathing room, standardized all transitions to the `cubic-bezier(0.16, 1, 0.3, 1)` easing curve, and implemented layered, modern `box-shadow` values to ensure sufficient depth and focus state clarity.

## 2026-04-15 - [Refine UI Easing & Gestão Operacional]
**Learning:** The previously applied `cubic-bezier` easing curve felt unnatural for standard web UI interactions on this project. Furthermore, the "Gestão Operacional" table and tab components appeared cramped compared to the modernized cards.
**Action:** Reverted `cubic-bezier` usage globally to the more standard and predictable `ease-out` timing function. Upgraded `.gestao-tabs` and `.gestao-table` with larger padding, stronger typography (larger `font-size`, more `letter-spacing`), layered box-shadows, and strict CSS variable usage to align with the rest of the modernized UI.
