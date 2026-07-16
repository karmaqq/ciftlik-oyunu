/* ═══════════════════════════════════════════════════════════════════════════ */
/*                     Zaman ve mevsim sistemi                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/time.js
// Zaman sistemi: 1 gün = 12 gerçek saniye, 1 yıl = 365 gün = 12 ay.
// Mevsimler aylara bağlı: Kış(Oca-Şub-Mar), İlkbahar(Nis-May-Haz), Yaz(Tem-Ağu-Eyl), Sonbahar(Eki-Kas-Ara).

/* ─────────────────── Gün saniye süresi ─────────────────── */
export const DAY_SECONDS = 10;

/* ─────────────────── Aylar tanımları ─────────────────── */
export const MONTHS = [
  { name: "Ocak",    days: 31, season: "kış" },
  { name: "Şubat",   days: 28, season: "kış" },
  { name: "Mart",    days: 31, season: "ilkbahar" },
  { name: "Nisan",   days: 30, season: "ilkbahar" },
  { name: "Mayıs",   days: 31, season: "ilkbahar" },
  { name: "Haziran", days: 30, season: "yaz" },
  { name: "Temmuz",  days: 31, season: "yaz" },
  { name: "Ağustos", days: 31, season: "yaz" },
  { name: "Eylül",   days: 30, season: "sonbahar" },
  { name: "Ekim",    days: 31, season: "sonbahar" },
  { name: "Kasım",   days: 30, season: "sonbahar" },
  { name: "Aralık",  days: 31, season: "kış" },
];

/* ─────────────────── Mevsimler tanımları ─────────────────── */
export const SEASONS = ["ilkbahar", "yaz", "sonbahar", "kış"];
/* ─────────────────── Yıl gün sayısı ─────────────────── */
export const YEAR_DAYS = MONTHS.reduce((sum, m) => sum + m.days, 0); // 365
/* ─────────────────── Yıl başına ay sayısı ─────────────────── */
export const MONTHS_PER_YEAR = 12;

/* ─────────────────── İlk zamanı oluştur ─────────────────── */
export function createInitialTime() {
  return {
    year: 1,
    month: 0,
    day: 1,
    secondsIntoDay: 0,
  };
}

/**
 * Zamanı ileri alır. Ay/yıl/sevsim değiştiğinde event objesi döner.
 * @param {object} time state.time
 * @param {number} dtSeconds geçen gerçek saniye
 * @returns {{dayChanged:boolean, monthChanged:boolean, seasonChanged:boolean, yearChanged:boolean}}
 */
/* ─────────────────── Zamanı ilerlet ─────────────────── */
export function tickTime(time, dtSeconds) {
  const events = { dayChanged: false, monthChanged: false, seasonChanged: false, yearChanged: false };
  time.secondsIntoDay += dtSeconds;

  while (time.secondsIntoDay >= DAY_SECONDS) {
    time.secondsIntoDay -= DAY_SECONDS;
    time.day += 1;
    events.dayChanged = true;

    const currentMonthData = MONTHS[time.month];
    if (time.day > currentMonthData.days) {
      time.day = 1;
      const oldMonth = time.month;
      time.month += 1;
      events.monthChanged = true;

      if (time.month >= MONTHS_PER_YEAR) {
        time.month = 0;
        time.year += 1;
        events.yearChanged = true;
      }

      const newSeason = MONTHS[time.month].season;
      const oldSeason = MONTHS[oldMonth].season;
      if (newSeason !== oldSeason) {
        events.seasonChanged = true;
      }
    }
  }

  return events;
}

/* ─────────────────── Mevcut mevsimi al ─────────────────── */
export function currentSeason(time) {
  return MONTHS[time.month].season;
}

/* ─────────────────── Günü saniyeye çevir ─────────────────── */
export function daysToSeconds(days) {
  return days * DAY_SECONDS;
}
