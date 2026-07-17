# Optimization Audit — `karmaqq/ciftlik-oyunu`

Scope: full repo (`js/main.js`, `js/state.js`, `js/systems/*`, `js/ui/*`), main game loop runs on `setInterval(1000ms)`.

---

## 1) Optimization Summary

**Current health:** Better than a typical vanilla-JS idle game — the codebase already shows evidence of a prior optimization pass. `header.js` and `field.js` use surgical DOM patching (`updateHeaderTick`, `updateSlotsTick`) instead of full re-renders, `checkLabelOverflow()` correctly batches reads-then-writes to avoid layout thrashing, and `save.js`/`shared.js` debounce writes via `scheduleSave()` (500ms) instead of saving on every mutation. However, two of the four tick-driven panels (**inventory**, **building tab**) were never migrated to the patch pattern and still do a full `innerHTML` teardown/rebuild every single second regardless of whether their data changed or whether the panel is even visible.

**Top 3 highest-impact improvements:**

1. Stop unconditionally rebuilding `#inventory-grid` and `#building-content` every tick — diff-check first (mirrors what `header.js`/`field.js` already do).
2. Gate `renderBuildingTab()` so it doesn't run every second when the buildings panel isn't visible (`anyBuilding` false, or user is on a different middle/right tab).
3. Reduce `syncFeatureTabs()` cost — it runs 6+ `querySelector`/`getElementById` calls every tick even though `state.features` changes maybe a handful of times per playthrough.

**Biggest risk if no changes are made:** None of this crashes anything — it's a CPU/battery tax, not a correctness bug. On low-end devices or laptops on battery, the constant per-second full-grid `innerHTML` rebuild (inventory: up to 25 cells re-parsed + re-styled; building panel: N product cells) plus 6 tabs of DOM querying will show up as visible jank once players unlock more inventory slots/animal products, and it drains battery on always-on idle-game tabs users tend to leave open for hours.

---

## 2) Findings (Prioritized)

### Finding 1 — Inventory panel does a full `innerHTML` rebuild every tick

- **Category:** Frontend / DOM
- **Severity:** High
- **Impact:** CPU per tick, main-thread jank, GC pressure from constant string-building + reparsing
- **Evidence:** `js/ui/index.js` `tickUpdate()` calls `renderInventory()` unconditionally every second; `js/ui/inventory.js` `renderInventory()` rebuilds `#inventory-filters` HTML _and_ rebuilds all `maxSlots` (up to 25) `#inventory-grid` cells via `grid.innerHTML = cells.join("")` on every call, even when no item quantity changed that second.
- **Why it's inefficient:** Every call destroys and recreates every inventory DOM node (with `draggable`, dataset attrs, nested spans), forces the browser to re-parse HTML and rebuild the drag/drop-eligible node tree, and — combined with `checkLabelOverflow()` running right after — forces a fresh `scrollWidth`/`clientWidth` layout pass on every `.label`/`.slot-name` in the DOM (see Finding 4), every second, forever, whether the tab is focused or not.
- **Recommended fix:** Track a lightweight signature of inventory state (e.g. a version counter bumped in `addItem`/`removeItem`/`processQueue`, or a shallow hash of `{itemId: quantity}`) and skip the rebuild when unchanged since the last tick — same approach `header.js` already uses for its queue-count check. For the surviving diffs, patch only the changed `.qty` text nodes (mirrors `updateSlotsTick` in `field.js`) instead of rebuilding the whole grid.
- **Tradeoffs/Risks:** Slightly more state to track (a dirty flag or version number); must remember to bump it on every inventory mutation path (`addItem`, `removeItem`, `processQueue`, quick-sell, crafting consumption). Missing one path means stale UI — needs a grep-for-all-callers pass.
- **Expected impact estimate:** Removes ~95% of inventory-tab DOM churn in the common case (nothing changed that second); noticeable smoothness improvement once players have 15–25 filled slots.
- **Removal Safety:** Needs Verification (must audit all inventory mutation call sites before adding a dirty-flag gate)
- **Reuse Scope:** module (`js/ui/inventory.js`, `js/ui/index.js`)

### Finding 2 — Building panel rebuilt every tick regardless of visibility or change

- **Category:** Frontend / DOM
- **Severity:** High
- **Impact:** CPU per tick, wasted work when the buildings section is hidden
- **Evidence:** `js/ui/index.js` `tickUpdate()` calls `renderBuildingTab()` unconditionally every second. `js/ui/buildings.js` `renderBuildingTab()` does `document.getElementById("building-content").innerHTML = ...` every time, iterating `Object.entries(building.stored)` and rebuilding all product cells — even when `features.hive/coop/barn` are all `false` and the whole section is `display:none` (per `syncFeatureTabs()`'s `buildingSection.style.display`).
- **Why it's inefficient:** Rendering into a hidden (`display:none`) element every second is pure waste — no pixel ever changes on screen, but the browser still does string concat, innerHTML parsing, and DOM node churn. Even when visible, building `stored` quantities only change on a production tick (`tickBuildings`) or a manual sell/craft, not necessarily every second.
- **Recommended fix:** Early-return from `renderBuildingTab()`/skip the call in `tickUpdate()` when `!anyBuilding` (no building purchased yet — the common early-game state) or when the buildings panel is hidden. When visible, patch only the `population`/`stored` text nodes instead of full `innerHTML`, same pattern as `updateSlotsTick`.
- **Tradeoffs/Risks:** Need to keep the "visible" check in sync with `syncFeatureTabs()`'s own visibility logic to avoid drift between two places deciding visibility.
- **Expected impact estimate:** Eliminates 100% of this cost pre-first-building-purchase (a meaningful chunk of early playtime); ~70-90% reduction once buildings exist but aren't actively producing that tick.
- **Removal Safety:** Likely Safe
- **Reuse Scope:** module (`js/ui/buildings.js`, `js/ui/index.js`)

### Finding 3 — `syncFeatureTabs()` re-queries ~8 DOM elements every second for state that rarely changes

- **Category:** Frontend / DOM
- **Severity:** Medium
- **Impact:** CPU per tick (small per-call cost, but runs 3600×/hour)
- **Evidence:** `js/ui/index.js` `tickUpdate()` calls `syncFeatureTabs()` unconditionally every tick; the function does `document.querySelector`/`getElementById` for `orchardBtn`, `hiveBtn`, `coopBtn`, `barnBtn`, `buildingSection`, `quickSellZone`, `sellTabs`, `inventoryPanel`, `middlePanel` (9 DOM lookups) and writes `style.display`/`classList.toggle` on each, even though `state.features` only flips a handful of times in an entire playthrough (one-time feature purchases).
- **Why it's inefficient:** `state.features` is boolean-flag data that changes on a single user action (buying a feature). Running the full sync pass every second is ~3600 unnecessary DOM query+write cycles per hour of idle play for data that's 99.97% of the time unchanged.
- **Recommended fix:** Call `syncFeatureTabs()` only from `render()` (already happens) and from the specific action handler that flips a feature (`buyFeature` in `js/ui/events.js` already calls `_renderFn()` which triggers a full `render()`) — drop it from `tickUpdate()` entirely, since nothing in the tick loop mutates `state.features`.
- **Tradeoffs/Risks:** None identified — no tick-loop code path (`tickFieldGrowth`, `tickOrchardGrowth`, `tickBuildings`, `tickMarket`, `processQueue`) writes to `state.features`.
- **Expected impact estimate:** Removes ~9 DOM lookups + writes per second (~100% of this function's tick-loop cost); small in isolation but compounds with Findings 1-2 since they all run back-to-back in the same `tickUpdate()`.
- **Removal Safety:** Safe
- **Reuse Scope:** local file (`js/ui/index.js`)

### Finding 4 — `checkLabelOverflow()` scans the entire visible DOM every tick even when nothing rendered

- **Category:** Frontend / DOM
- **Severity:** Medium
- **Impact:** Layout/measurement cost per tick
- **Evidence:** `js/ui/index.js` `tickUpdate()` calls `checkLabelOverflow()` unconditionally at the end of every tick. It does `document.querySelectorAll(".label, .slot-name")` across the whole document and reads `scrollWidth`/`clientWidth` on every match, every second.
- **Why it's inefficient:** The read/write split inside the function is well done (good — avoids thrashing), but it still runs a full-document query + measurement pass every second regardless of whether any label text actually changed. Text/labels only change when items are added/removed/renamed in inventory, field, or building panels — not every tick.
- **Recommended fix:** Only invoke `checkLabelOverflow()` after a render path that could plausibly change label text (full `render()`, inventory diff-update, market refresh) rather than on every `tickUpdate()`. If it must stay in the tick loop for progress-bar-driven layout shifts, throttle it (e.g. every 3–5 ticks) rather than every tick.
- **Tradeoffs/Risks:** If some label text does depend on continuously-changing tick data (unlikely — it's currently just item/crop names), throttling could introduce a 1-4s lag before a scrolling-label animation kicks in. Low risk given current usage.
- **Expected impact estimate:** ~70-100% reduction in overflow-check-related layout reads during ticks where nothing rendered.
- **Removal Safety:** Likely Safe
- **Reuse Scope:** local file (`js/ui/index.js`)

### Finding 5 — Full `render()` triggered on every single user action, rebuilding all panels

- **Category:** Frontend / DOM
- **Severity:** Medium
- **Impact:** CPU per user interaction (click/drop), not tick-driven so lower overall impact, but noticeable on rapid actions (e.g. spam-clicking buy-one, or drag-planting many slots quickly)
- **Evidence:** `js/ui/events.js` — `handlePlotClick`, `handlePlotDrop`, `handleRightPanelAction`, and the quick-sell handler all end with `scheduleSave(); _renderFn();`, where `_renderFn` is `render()` from `js/ui/index.js`. `render()` unconditionally rebuilds header, inventory, the entire field/orchard grid (`fieldGridHTML()`/`orchardGridHTML()` via `innerHTML`), building tab, and the active right-panel tab (market/crafting/upgrades) — even though most single actions (e.g. buying one seed) only change one small piece of state.
- **Why it's inefficient:** e.g. `buyOneSeed` only mutates one market listing's `remaining`/gold — yet triggers a full rebuild of the field grid (up to 25 slots) and inventory grid, none of which changed. This is the single most expensive path in the app per click, and idle-game players tend to click rapidly (bulk-buying, bulk-harvesting).
- **Recommended fix:** Split `render()` into targeted updates per action type — action handlers already know which system they touched (market vs. field vs. crafting), so they can call just the relevant `renderX()` function instead of the omnibus `render()`. This is a larger refactor than Findings 1-4; treat as a "deeper optimization" (see §4).
- **Tradeoffs/Risks:** Higher chance of stale-UI bugs if a per-action render omits a panel that was actually affected by a side effect (e.g. crafting can affect both inventory and unlocked recipe tiers, which affects the upgrades panel). Needs careful mapping of action → affected panels.
- **Expected impact estimate:** Could cut per-click render cost by 60-80% for the common single-panel actions (market buy, harvest, upgrade).
- **Removal Safety:** Needs Verification
- **Reuse Scope:** service-wide (`js/ui/events.js`, `js/ui/index.js`)

### Finding 6 — Market listing shuffle uses biased, and unnecessary, `sort(() => Math.random() - 0.5)`

- **Category:** Algorithm
- **Severity:** Low
- **Impact:** Correctness/quality of randomness, not a performance bottleneck at this array size (≤ ~15 crops/trees)
- **Evidence:** `js/systems/market.js` `generateMarketCycle()`: `const shuffledSeeds = [...seedPool].sort(() => Math.random() - 0.5).slice(0, seedSlots);` and the identical pattern for `shuffledSaplings`.
- **Why it's inefficient:** This is the classic biased-shuffle anti-pattern — `Array.prototype.sort` with a random comparator does not produce a uniform permutation (comparator inconsistency also technically violates the sort contract, which some engines may warn about or optimize differently). At current array sizes (a few dozen crop/tree defs) this is not a perf issue, but it's worth fixing as a code-quality/algorithm-correctness item since it affects which items players actually see offered in the market (silently skews rarer positions).
- **Recommended fix:** Replace with a proper partial Fisher-Yates shuffle (shuffle-and-slice, or reservoir sampling for `seedSlots` items) — O(n) and unbiased.
- **Tradeoffs/Risks:** None — strictly an improvement, same output shape.
- **Expected impact estimate:** Negligible perf change at current data sizes; fixes a subtle fairness/RNG-quality bug.
- **Removal Safety:** Safe
- **Reuse Scope:** local file (`js/systems/market.js`)

### Finding 7 — `refreshOpenTooltip()` unconditionally rebuilds tooltip HTML + forces synchronous layout every tick while any tooltip is open

- **Category:** Frontend / DOM
- **Severity:** Low
- **Impact:** Layout cost while hovering, once per second
- **Evidence:** `js/ui/index.js` `tickUpdate()` calls `refreshOpenTooltip()` every tick; `js/ui/tooltip.js` `refreshOpenTooltip()` calls `resolveTooltipContent(...)`, sets `ttRoot.innerHTML = buildHTML(content)`, and immediately calls `positionTooltip()`, which reads `getBoundingClientRect()`/`offsetWidth`/`offsetHeight` synchronously right after the DOM write (a read-after-write layout-thrash pattern, unlike the batched read/write in `checkLabelOverflow`).
- **Why it's inefficient:** Most tooltip content (item stats, costs) doesn't change second-to-second unless it's a "growing" slot tooltip showing live progress. Rebuilding+repositioning on every tick regardless is wasted work for the (common) case of a static tooltip (e.g. hovering a locked slot or a market listing).
- **Recommended fix:** Only refresh tooltip content when `resolveTooltipContent` output would actually differ (e.g. compare a cheap signature, or only refresh for tooltip types known to show live-changing data like growth progress). For the unavoidable refresh case, defer `positionTooltip()`'s read to the next animation frame (`requestAnimationFrame`) to decouple the write from the read, matching the `checkLabelOverflow` pattern.
- **Tradeoffs/Risks:** Minimal — one-frame lag on tooltip reposition is imperceptible.
- **Expected impact estimate:** Removes a synchronous layout read on most ticks where a static tooltip is open.
- **Removal Safety:** Likely Safe
- **Reuse Scope:** local file (`js/ui/tooltip.js`)

---

## 3) Quick Wins (Do First)

- **Finding 3** — delete the `syncFeatureTabs()` call from `tickUpdate()` (one-line change, zero risk, removes 9 DOM lookups/sec).
- **Finding 2 (partial)** — wrap the existing `renderBuildingTab()` call in `tickUpdate()` with an `if (anyBuilding)` check using the same `features.hive || features.coop || features.barn` condition already computed in `syncFeatureTabs()`. Cheap, immediately kills the pre-first-building-purchase cost.
- **Finding 4** — throttle `checkLabelOverflow()` in `tickUpdate()` to run every 3rd tick instead of every tick (simple counter), as a stop-gap before the fuller "only after relevant renders" fix.
- **Finding 6** — swap the biased sort-shuffle for a proper Fisher-Yates partial shuffle; small, isolated, no behavior risk beyond fixing the bias.

## 4) Deeper Optimizations (Do Next)

- **Finding 1** — add a dirty/version-tracking mechanism for inventory state and convert `renderInventory()`'s tick path to a patch-based update (new quantities/newly-added or removed cells only), mirroring `updateSlotsTick`/`updateHeaderTick`.
- **Finding 2 (full)** — convert `renderBuildingTab()`'s tick path to patch only `population`/`capacity`/`stored` quantities instead of full `innerHTML`, same pattern.
- **Finding 5** — refactor `render()` into composable per-panel render calls, and have each action handler in `events.js` call only the panels its action actually affects. This is the largest-scope change here and should be done after Findings 1-2 land (so the "cheap path" for each panel already exists to call into).
- **Finding 7** — decouple tooltip content-diffing from positioning; only reposition via `requestAnimationFrame`.

## 5) Validation Plan

- **Benchmarks:** Use Chrome DevTools Performance tab, record 60s of idle play (no clicks) at three states: (a) fresh save, no buildings; (b) mid-game, 15+ inventory slots filled, 1 building active; (c) late-game, most slots filled, 3 buildings active. Compare "Scripting" + "Rendering" time per tick before/after.
- **Profiling strategy:** Use `performance.mark`/`performance.measure` around `tickUpdate()` internals (`renderInventory`, `renderBuildingTab`, `syncFeatureTabs`, `checkLabelOverflow`) to get per-function timings pre/post change, logged to console during a dev build.
- **Metrics to compare before/after:** Average `tickUpdate()` duration (ms), count of `innerHTML` writes per minute, count of DOM `querySelector`/`getElementById` calls per minute (instrument temporarily via a wrapper), CPU% in Chrome Task Manager over a 5-minute idle session.
- **Test cases to ensure correctness is preserved:**
  - Inventory: add item (new slot), stack existing item, item depletes to 0 and slot frees, queue drains into a freed slot — grid must reflect all four cases without a stale cell.
  - Buildings: population changes (buy animal, tick-based production), stored product quantity increases (production tick) and decreases (drag-to-sell) — panel must reflect both without manual tab-switch.
  - Feature purchase (`buyFeature`) — tab visibility (`orchardBtn`, `hiveBtn`, etc.) must update immediately, confirming the tick-loop removal in Finding 3 doesn't break the one legitimate trigger (full `render()` on the purchase action itself).
  - Tooltip: hover a growing slot and confirm the progress % in the tooltip still updates each second if it's meant to; hover a static tooltip (locked slot) and confirm no unnecessary rebuild fires (instrument a counter).

## 6) Optimized Code / Patch

Per your instructions, no fixes have been applied — this file is audit-only. Say the word and I'll implement any of the above (quick wins first is the natural order).
