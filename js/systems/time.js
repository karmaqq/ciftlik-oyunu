// js/systems/time.js
// Zaman sistemi: 1 gün = 60 gerçek saniye, 1 mevsim = 10 gün (600 sn / 10 dk),
// 1 yıl = 4 mevsim = 40 gün (2400 sn / 40 dk). Ay katmanı yok — kullanıcı isteği ile kaldırıldı.

export const DAY_SECONDS = 60;
export const SEASON_DAYS = 10;
export const YEAR_DAYS = SEASON_DAYS * 4; // 40
export const SEASON_SECONDS = DAY_SECONDS * SEASON_DAYS; // 600 sn = 10 dk
export const YEAR_SECONDS = SEASON_SECONDS * 4; // 2400 sn = 40 dk

export const SEASONS = ["ilkbahar", "yaz", "sonbahar", "kış"];

export function createInitialTime() {
  return {
    year: 1,
    seasonIndex: 0, // 0..3 -> SEASONS
    day: 1, // 1..SEASON_DAYS
    secondsIntoDay: 0,
  };
}

/**
 * Zamanı ileri alır. Mevsim/yıl değiştiğinde true döner (dışarıda hava/pazar
 * gibi sistemlerin tepki vermesi için event listesi döner).
 * @param {object} time state.time
 * @param {number} dtSeconds geçen gerçek saniye
 * @returns {{dayChanged:boolean, seasonChanged:boolean, yearChanged:boolean}}
 */
export function tickTime(time, dtSeconds) {
  const events = { dayChanged: false, seasonChanged: false, yearChanged: false };
  time.secondsIntoDay += dtSeconds;

  while (time.secondsIntoDay >= DAY_SECONDS) {
    time.secondsIntoDay -= DAY_SECONDS;
    time.day += 1;
    events.dayChanged = true;

    if (time.day > SEASON_DAYS) {
      time.day = 1;
      time.seasonIndex += 1;
      events.seasonChanged = true;

      if (time.seasonIndex >= SEASONS.length) {
        time.seasonIndex = 0;
        time.year += 1;
        events.yearChanged = true;
      }
    }
  }

  return events;
}

export function currentSeason(time) {
  return SEASONS[time.seasonIndex];
}

export function formatTime(time) {
  const season = currentSeason(time);
  return `Yıl ${time.year} · ${season} · Gün ${time.day}/${SEASON_DAYS}`;
}

export function daysToSeconds(days) {
  return days * DAY_SECONDS;
}
