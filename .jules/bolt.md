## 2026-04-15 - Debouncing Search Inputs

**Learning:** Running heavy filtering and DOM rendering on every keystroke (`oninput`) blocks the main thread noticeably on a large static UI application rendering lists of items. The absence of a Virtual DOM or optimized rendering cycle means raw JS DOM manipulation happens synchronously on each key press.

**Action:** Wrap search input handlers with a standard debounce function (e.g., waiting 300ms) to significantly improve application responsiveness and reduce main thread blockings without adding overhead.
To optimize performance, parsed responsibility arrays are cached on event objects in the global EVENTS array using _respArray and _respRawStr properties to prevent redundant string splitting.
Performance Optimization: Cached parsed date values using  and  on  to avoid redundant date string parsing during calendar rendering loop.
Performance Optimization: Cached parsed date values using `_parsed_ini` and `_parsed_fim` on `EVENTS` to avoid redundant date string parsing during calendar rendering loop.
