## 2026-04-15 - Debouncing Search Inputs

**Learning:** Running heavy filtering and DOM rendering on every keystroke (`oninput`) blocks the main thread noticeably on a large static UI application rendering lists of items. The absence of a Virtual DOM or optimized rendering cycle means raw JS DOM manipulation happens synchronously on each key press.

**Action:** Wrap search input handlers with a standard debounce function (e.g., waiting 300ms) to significantly improve application responsiveness and reduce main thread blockings without adding overhead.
To optimize performance, parsed responsibility arrays are cached on event objects in the global EVENTS array using _respArray and _respRawStr properties to prevent redundant string splitting.
## 2026-04-15 - Heatmap Caching Optimization\n\n**Learning:** Running  repeatedly inside a tight loop like  adds significant CPU overhead. Lazy-caching these values directly on the event objects drastically improves speed during frequent re-renders.\n\n**Action:** Lazily attach  and  Date instances to objects inside the  array so parsing only happens once per event object, cutting down render time substantially.\n
## 2026-04-15 - Heatmap Caching Optimization

**Learning:** Running `parseDate` repeatedly inside a tight loop like `renderHeatmap` adds significant CPU overhead. Lazy-caching these values directly on the event objects drastically improves speed during frequent re-renders.

**Action:** Lazily attach `_parsed_ini` and `_parsed_fim` Date instances to objects inside the `EVENTS` array so parsing only happens once per event object, cutting down render time substantially.
