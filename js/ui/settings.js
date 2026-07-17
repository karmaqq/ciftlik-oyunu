/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Ayarlar paneli: modal, toggle, buton                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/settings.js

let _onNewGame = null;
let _overlayEl = null;

const SETTINGS = [
  {
    key: "newGame",
    type: "button",
    label: "Yeni Oyun",
    desc: "Tüm ilerlemeyi sıfırla ve yeni oyun başlat",
    danger: true,
  },
];

/* ─────────────────── Yeni oyun callback'ini ayarla ─────────────────── */
export function setNewGameCallback(cb) {
  _onNewGame = cb;
}

/* ─────────────────── Ayarlar modalını oluştur ─────────────────── */
export function initSettings() {
  _overlayEl = document.createElement("div");
  _overlayEl.id = "settings-overlay";
  _overlayEl.innerHTML = '<div id="settings-modal"></div>';
  document.body.appendChild(_overlayEl);

  _overlayEl.addEventListener("click", (e) => {
    if (e.target === _overlayEl) closeSettings();
  });

  renderModal();
}

/* ─────────────────── Modalı aç ─────────────────── */
export function openSettings() {
  if (!_overlayEl) return;
  renderModal();
  _overlayEl.classList.add("open");
}

/* ─────────────────── Modalı kapat ─────────────────── */
export function closeSettings() {
  if (!_overlayEl) return;
  _overlayEl.classList.remove("open");
}

function renderModal() {
  if (!_overlayEl) return;
  const modalEl = _overlayEl.querySelector("#settings-modal");
  if (!modalEl) return;

  let bodyHTML = "";

  for (const item of SETTINGS) {
    if (item.type === "divider") {
      bodyHTML += '<div class="settings-divider"></div>';
      continue;
    }

    if (item.type === "button") {
      const dangerClass = item.danger ? " danger" : "";
      bodyHTML += `<button class="settings-btn${dangerClass}" data-setting-btn="${item.key}">${item.label}</button>`;
    }
  }

  modalEl.innerHTML = `<div class="settings-header">
      <h2>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Ayarlar
      </h2>
      <button class="settings-close">&times;</button>
    </div>
    <div class="settings-body">${bodyHTML}</div>`;

  modalEl.querySelector(".settings-close").addEventListener("click", closeSettings);

  modalEl.querySelectorAll("button[data-setting-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.settingBtn;
      if (key === "newGame") {
        closeSettings();
        if (_onNewGame) _onNewGame();
      }
    });
  });
}
