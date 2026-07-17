/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tooltip motor: konumlandırma, göster/gizle              */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/tooltip.js — TT Pro v1.0

import { resolveTooltipContent } from "./tooltipContent.js";

const VIEWPORT_PAD = 10;
const GAP = 8;

let ttRoot = null;
let activeTriggerEl = null;

const CONTAINERS = [
  "middle-content",
  "right-panel",
  "inventory-grid",
  "building-content",
  "header",
];

/* ─────────────────── Tooltip sistemini başlat ─────────────────── */
export function initTooltip() {
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
}

/* ─────────────────── Açık tooltip'i tazele (tick kancası) ─────────────────── */
export function refreshOpenTooltip() {
  if (!activeTriggerEl || !ttRoot) return;

  if (!document.contains(activeTriggerEl)) {
    hideTooltip();
    return;
  }

  const content = resolveTooltipContent(activeTriggerEl.dataset);
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

function showTooltip(el) {
  activeTriggerEl = el;
  const content = resolveTooltipContent(el.dataset);
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

/* ─────────────────── Yeni buildHTML — gruplu yapı ─────────────────── */
function buildHTML(content) {
  let html = "";

  // HEADER
  if (content.title) {
    html += `<div class="tt-header">`;
    html += `<span class="tt-header-name">${content.title}</span>`;
    if (content.badge) {
      html += `<span class="tt-badge ${content.badgeClass || ""}">${content.badge}</span>`;
    }
    html += `</div>`;
  }

  // GROUPS
  if (content.groups) {
    for (const group of content.groups) {
      html += `<div class="tt-group">`;
      for (const row of group.rows) {
        if (row === "---") {
          html += `<div class="tt-divider"></div>`;
        } else {
          const icon = row.icon ? `<span class="tt-row-icon">${row.icon}</span>` : "";
          html += `<div class="tt-row">`;
          html += `${icon}<span class="tt-row-label">${row.label}</span>`;
          html += `<span class="tt-row-value">${row.value}</span>`;
          html += `</div>`;
        }
      }
      html += `</div>`;
    }
  }

  // FOOTER
  if (content.footer) {
    html += `<div class="tt-footer">${content.footer}</div>`;
  }

  return html;
}
