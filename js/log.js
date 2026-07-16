/* ═══════════════════════════════════════════════════════════════════════════ */
/*                   Merkezi loglama servisi                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/log.js
// Merkezi loglama servisi. Sistem dosyaları window._gameLog yerine bu modülü kullanır.

let _logFn = null;

/* ─────────────────── Logger'ı ayarla ─────────────────── */
export function setLogger(fn) { _logFn = fn; }

/* ─────────────────── Oyun logu ─────────────────── */
export function gameLog(message, type = "info") {
  if (_logFn) _logFn(message, type);
}
