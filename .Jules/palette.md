## 2026-04-15 - [Add ARIA labels to calendar navigation]
**Learning:** Found multiple icon-only navigation buttons in the custom calendar components lacking accessible names. Since the interface is in Portuguese, standardizing on PT-BR ARIA labels for component navigation ensures local screen reader compatibility.
**Action:** Always verify icon buttons in custom interactive components (like calendars and modals) have appropriate `aria-label`s matching the interface language.## 2026-04-15 - [Enhance Card Hover States]
**Learning:** Found linear transition states and missing variable interpolation in card elements, causing visually abrupt and inconsistent interactions on hover.
**Action:** Used `cubic-bezier` timing functions alongside `transform: scale` properties and strict CSS variable usage (e.g. `var(--accent)`) to enforce smoother, token-based hover interaction states in static HTML interfaces.
## 2026-04-15 - [Improve Animation Easing Curves]
**Learning:** Across the application, numerous UI elements (`.btn-icon`, `.mini-day`, `.view-tab`, etc.) utilized standard linear `0.2s` or `0.3s` transitions which lack organic interaction feel.
**Action:** Replaced linear transitions with `cubic-bezier(0.16, 1, 0.3, 1)` easing curves globally across interactive elements in static HTML files to create snappier, more professional micro-interactions. Added subtle transform rules (`scale`, `translate`) and mapped active states to primary CSS variables.
