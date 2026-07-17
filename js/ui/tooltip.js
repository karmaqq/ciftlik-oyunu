/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tooltip motor: konumlandırma, göster/gizle, Z modu      */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/tooltip.js

import { resolveTooltipContent } from "./tooltipContent.js";
import { getSetting } from "./shared.js";

const VIEWPORT_PAD = 10;
const GAP = 8;

let ttRoot = null;
let activeTriggerEl = null;
let pinnedDetail = false;
let heldDetail = false;

const CONTAINERS = [
  "middle-content",
  "right-panel",
  "inventory-grid",
  "building-content",
  "header",
];

/* ─────────────────── Efektif detay modu ─────────────────── */
function isDetail() {
  return pinnedDetail !== heldDetail;
}

/* ─────────────────── Ayar panelinden çağrılır ─────────────────── */
export function setPinnedDetail(val) {
  pinnedDetail = !!val;
  if (activeTriggerEl) refreshOpenTooltip();
}

/* ─────────────────── Tooltip sistemini başlat ─────────────────── */
export function initTooltip() {
  pinnedDetail = getSetting("detailTooltip", false);

  ttRoot = document.createElement("div");
  ttRoot.id = "tt-root";
  document.body.appendChild(ttRoot);

  for (const id of CONTAINERS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("mouseover", handleMouseOver);
    el.addEventListener("mouseout", handleMouseOut);
    el.addEventListener("focusin", handleFocusIn);
    el.addEventListener("focusout", handleFocusOut);
  }

  window.addEventListener("scroll", handleScrollOrResize, true);
  window.addEventListener("resize", handleScrollOrResize);

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}

/* ─────────────────── Açık tooltip'i tazele (tick kancası) ─────────────────── */
export function refreshOpenTooltip() {
  if (!activeTriggerEl || !ttRoot) return;

  if (!document.contains(activeTriggerEl)) {
    hideTooltip();
    return;
  }

  const content = resolveTooltipContent(activeTriggerEl.dataset, isDetail());
  if (!content) {
    hideTooltip();
    return;
  }

  ttRoot.innerHTML = buildHTML(content);
  requestAnimationFrame(() => positionTooltip(activeTriggerEl));
}

function handleMouseOver(e) {
  const trigger = e.target.closest("[data-tt]");
  if (!trigger) return;
  if (trigger === activeTriggerEl) return;
  showTooltip(trigger);
}

function handleMouseOut(e) {
  const trigger = e.target.closest("[data-tt]");
  if (!trigger) return;
  const related = e.relatedTarget;
  if (related && trigger.contains(related)) return;
  if (trigger === activeTriggerEl) hideTooltip();
}

function handleFocusIn(e) {
  const trigger = e.target.closest("[data-tt]");
  if (!trigger) return;
  showTooltip(trigger);
}

function handleFocusOut(e) {
  const trigger = e.target.closest("[data-tt]");
  if (!trigger) return;
  if (trigger === activeTriggerEl) hideTooltip();
}

function handleScrollOrResize() {
  if (!activeTriggerEl) return;
  if (!document.contains(activeTriggerEl)) {
    hideTooltip();
    return;
  }
  positionTooltip(activeTriggerEl);
}

function handleKeyDown(e) {
  if (e.key !== "z" && e.key !== "Z") return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
  if (heldDetail) return;
  heldDetail = true;
  if (activeTriggerEl) refreshOpenTooltip();
}

function handleKeyUp(e) {
  if (e.key !== "z" && e.key !== "Z") return;
  if (!heldDetail) return;
  heldDetail = false;
  if (activeTriggerEl) refreshOpenTooltip();
}

function showTooltip(el) {
  activeTriggerEl = el;
  const content = resolveTooltipContent(el.dataset, isDetail());
  if (!content) {
    activeTriggerEl = null;
    return;
  }

  ttRoot.innerHTML = buildHTML(content);
  ttRoot.style.visibility = "hidden";
  ttRoot.style.left = "-9999px";
  ttRoot.style.top = "-9999px";
  ttRoot.classList.add("visible");

  requestAnimationFrame(() => {
    positionTooltip(el);
    ttRoot.style.visibility = "";
  });
}

function hideTooltip() {
  activeTriggerEl = null;
  if (ttRoot) {
    ttRoot.classList.remove("visible");
  }
}

function positionTooltip(el) {
  if (!ttRoot || !el) return;

  const triggerRect = el.getBoundingClientRect();
  const ttW = ttRoot.offsetWidth;
  const ttH = ttRoot.offsetHeight;

  let x = triggerRect.left;
  let y = triggerRect.bottom + GAP;

  if (x + ttW > window.innerWidth - VIEWPORT_PAD) {
    x = triggerRect.right - ttW;
  }

  if (x < VIEWPORT_PAD) x = VIEWPORT_PAD;

  if (y + ttH > window.innerHeight - VIEWPORT_PAD) {
    y = triggerRect.top - ttH - GAP;
  }

  if (y < VIEWPORT_PAD) y = VIEWPORT_PAD;

  ttRoot.style.left = `${x}px`;
  ttRoot.style.top = `${y}px`;
}

function buildHTML(content) {
  let html = "";
  if (content.title) {
    html += `<div class="tt-title">${content.title}</div>`;
  }
  if (content.rows && content.rows.length > 0) {
    for (const row of content.rows) {
      if (row === "---") {
        html += `<div class="tt-divider"></div>`;
      } else {
        html += `<div class="tt-row"><span class="tt-row-label">${row.label}</span><span>${row.value}</span></div>`;
      }
    }
  }
  if (content.footer) {
    html += `<div class="tt-footer">${content.footer}</div>`;
  }
  return html;
}
