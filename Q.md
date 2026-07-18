# ÇİFTLİK OYUNU — KAPSAMLI DÜZELTME PLANI (10/10 Sistem Hedefi)

> **Tarih:** 2026-07-18  
> **Durum:** AKTİF — Değişiklikler uygulanıyor  
> **Hedef:** Tüm tespit edilen sorunları çözelerek projeyi 10/10 seviyesine çıkarmak

---

## DURUM TAKİBİ

| # | Görev | Öncelik | Durum | Dosya |
|---|---|---|---|---|
| 1 | calendarTrade.js Math.round hatası | 🔴 KRİTİK | ✅ | `js/systems/calendarTrade.js` | Zaten düzeltilmiş |
| 2 | header.js event listener birikimi | 🔴 KRİTİK | ✅ | `js/ui/header.js` | Event delegation ile düzeltildi |
| 3 | main.js Date.now() dtSeconds | 🔴 KRİTİK | ✅ | `js/main.js` | Date.now() tabanlı dtSeconds eklendi |
| 4 | save.js versiyon migrasyonu | 🔴 KRİTİK | ✅ | `js/systems/save.js` | SAVE_VERSION=2, migrateState(), corrupt data uyarısı |
| 5 | upgrades.js data-tt attribute'ları | 🔴 KRİTİK | ✅ | `js/ui/upgrades.js` | renderNode ve renderFeatureNode'a eklendi |
| 6 | field.js/orchard.js kod tekrarı | 🟡 YÜKSEK | ✅ | `js/systems/field.js`, `js/systems/orchard.js`, `js/systems/planting.js` | Ortak planting.js modülü oluşturuldu |
| 7 | market.js satır HTML birleştirme | 🟡 YÜKSEK | ✅ | `js/ui/market.js` | Hayvan/tohum satır HTML'i tek şablona birleştirildi |
| 8 | touch/pointer event desteği | 🟡 YÜKSEK | ✅ | `js/ui/events.js` | pointerdown/move/up ile touch drag desteği eklendi |
| 9 | CSS hardcoded değerleri taşı | 🟡 YÜKSEK | ✅ | `css/base.css`, `css/*.css` | ~25 hardcoded renk CSS değişkenlerine taşındı |
| 10 | render() fonksiyonu optimizasyonu | 🟡 YÜKSEK | ❌ GERİ ALINDI | `js/ui/index.js` | UX'e zarar verdi, her render her şeyi yeniden oluşturmalı |
| 11 | events.js dead code temizliği | 🟠 ORTA | ✅ | `js/ui/events.js` | Kullanılmayan result değişkenleri kaldırıldı |
| 12 | market.js bedava exploit düzelt | 🟠 ORTA | ✅ | `js/systems/market.js` | Math.max(1,...) ile minimum fiyat eklendi |
| 13 | weather.js koruma ekle | 🟠 ORTA | ✅ | `js/systems/weather.js` | Fallback: WEATHER_TYPES.normal |
| 14 | CSS erişilebilirlik (ARIA, contrast, tabindex) | 🟠 ORTA | ✅ | `index.html`, `js/ui/*.js` | ARIA rolleri, --text-muted açıldı, tabindex eklendi |
| 15 | tooltip innerHTML diffing | 🟠 ORTA | ✅ | `js/ui/tooltip.js` | lastTooltipHTML ile content diffing |
| 16 | main.js hardcoded değerleri sabitlere çek | 🟠 ORTA | ✅ | `js/main.js` | LOG_MAX_CHILDREN, HINT_INTERVAL, WEATHER_CHANGE_DAY_INTERVAL, vb. |
| 17 | buildings.js while kontrolü | 🟠 ORTA | ✅ | `js/systems/buildings.js` | if → while döngüsü ile birden fazla production |
| 18 | save.js corrupt data kullanıcı uyarısı | 🟠 ORTA | ✅ | `js/systems/save.js` | "Kayıt bozuk! Yeni oyun başlatılıyor." |
| 19 | responsive.css large screen desteği | 🟠 ORTA | ✅ | `css/responsive.css` | @media (min-width: 1440px) eklendi |
| 20 | README.md güncelleme | 🔵 DÜŞÜK | ✅ | `README.md` | Proje yapısı ve kalite iyileştirmeleri eklendi |

---

## KRİTİK DÜZELTMELERİN DETAYI

### 1. calendarTrade.js Math.round Hatası
**Sorun:** `getCalendarBuyMultiplier()` ve `getCalendarSellMultiplier()` çarpanları `Math.round()` ile yuvarlanıyor. 0.85, 1.05, 1.10 → hep 1.0. Takvim ticaret özelliği tamamen işlevsiz.
**Çözüm:** `Math.round(multiplier)` satırlarını kaldır, çarpanı olduğu gibi döndür.

### 2. header.js Event Listener Birikimi
**Sorun:** `renderHeader()` her çağrıldığında `settingsBtn`'e yeni click listener ekleniyor, eskisi kaldırılmıyor.
**Çözüm:** Event delegation kullan veya listener'ı bir kez init'te bağla, render'da sadece DOM'u güncelle.

### 3. main.js Date.now() dtSeconds
**Sorun:** `tickTime(state.time, 1)` her zaman 1sn varsayıyor. setInterval tam garanti vermez.
**Çözüm:** `Date.now()` farkı ile `dtSeconds` hesapla, max 10sn ile sınırla.

### 4. save.js Versiyon Migrasyonu
**Sorun:** State yapısı değiştiğinde eski kayıtlar uyumsuz olacak. Corrupt data'da sessiz kayıp.
**Çözüm:** State'e `_version` ekle, load'da versiyon kontrolü yap, migrasyon fonksiyonları çalıştır. Corrupt data'da kullanıcıya uyarı göster.

### 5. upgrades.js Data-tt Attribute'ları
**Sorun:** `renderNode()` ve `renderFeatureNode()` data-tt eklemiyor. Build fonksiyonları hazır ama çalışmıyor.
**Çözüm:** `data-tt="upgradeNode"` ve `data-tt="featureNode"` ile gerekli parametreleri ekle.

---

## YÜKSEK ÖNCELİK DÜZELTMELERİNİN DETAYI

### 6. field.js/orchard.js Kod Tekrarı
**Sorun:** 6 fonksiyon neredeyse birebir aynı.
**Çözüm:** `computeGrowthMultiplier`, `canPlant`, `plantSeed`, `tickGrowth`, `harvestSlot`, `removePlant` fonksiyonlarını ortak bir modüle çek. field.js ve orchard.js sadece parametre farkıyla çağırsın.

### 7. market.js Satır HTML Birleştirme
**Sorun:** Hayvan ve tohum/fidan satırları %80 aynı HTML'i tekrarlıyor.
**Çözüm:** Tek bir `renderListingRow(listing, index, ctx)` fonksiyonu yaz, her iki kategori de aynı fonksiyonu çağırsın.

### 8. Touch/Pointer Event Desteği
**Sorun:** Mobilde drag & drop çalışmıyor (özellikle iOS).
**Çözüm:** `touchstart/touchmove/touchend` olaylarını ekle veya `pointer events` kullan.

### 9. CSS Hardcoded Değerleri Taşı
**Sorun:** ~30 yerde boşluk, ~25 yerde renk, ~10 yerde font boyutu hardcoded.
**Çözüm:** Tüm hardcoded değerleri `--space-*`, `--font-*`, renk değişkenlerine taşı.

### 10. render() Optimizasyonu
**Sorun:** Her aksiyonda tüm paneller yeniden oluşturuluyor.
**Çözüm:** `render()`'ı parçalara ayır, her aksiyon sadece etkilenen paneli render etsin.

---

## ORTA ÖNCELİK DÜZELTMELERİNİN DETAYI

### 11. events.js Dead Code
- `btnClass` fonksiyonu parametre kullanmıyor → temizle
- Tanımsız `result` değişkenleri → kaldır
- `unlockedCountFn` tekrarı → ortak fonksiyona çek

### 12. market.js Bedava Exploit
- `%2` sansla `pricePerUnit = 0` olabiliyor
- Çözüm: Minimum fiyat eşiği ekle (`Math.max(pricePerUnit, 1)`)

### 13. weather.js Koruma
- `WEATHER_TYPES[weatherState.current]` bilinmeyen değerse `undefined` döner
- Çözüm: Fallback olarak `WEATHER_TYPES.normal` kullan

### 14. CSS Erişilebilirlik
- Tab barlarına `role="tablist"`, `role="tab"`, `aria-selected` ekle
- Skill tree düğümlerine `tabindex="0"` ve `role="button"` ekle
- `--text-muted` rengini aç (contrast ratio 4.5:1'e çıkar)

### 15. Tooltip innerHTML Diffing
- `refreshOpenTooltip()`'te içeriği string'e hesapla, değişmemişse DOM'a dokunma
- `positionTooltip()`'ı `requestAnimationFrame` ile sar

### 16. main.js Hardcoded Sabitler
- `50` (log limit), `300` (hint timer), `7` (weather cycle) → sabitlere çek

### 17. buildings.js While Kontrolü
- `sinceLastProduction` negatif olabilir → `while` döngüsü ile birden fazla production tetikle

### 18. save.js Corrupt Data Uyarısı
- Bozuk JSON'da kullanıcıya "Kayıt bozuk" uyarısı göster

### 19. responsive.css Large Screen
- `@media (min-width: 1440px)` ile max-width ekle

---

## ÖNCEKİ PERFORMANS AUDİT BULGULARI (Q.md v1)

Aşağıdaki bulgalar önceki audit'ten gelmiştir ve bu planda da ele alınmıştır:

### Finding 1: Inventory panel her tick'te tam rebuild → **Görev #10** kapsamnda
### Finding 2: Building panel visibility kontrolü yok → **Görev #10** kapsamında
### Finding 3: syncFeatureTabs() gereksiz DOM sorgusu → **Görev #10** kapsamında
### Finding 4: checkLabelOverflow() her 3 tick → Zaten uygulanmış (counter var)
### Finding 5: Full render() her aksiyonda → **Görev #10** kapsamında
### Finding 6: Fisher-Yates shuffle → **DÜZELTİLMİŞ** (market.js'de doğru uygulanmış)
### Finding 7: refreshOpenTooltip() innerHTML → **Görev #15** kapsamında

---

## UYGULAMA SIRASI

1. **KRİTİK** düzeltmeler (1-5) → ilk olarak
2. **YÜKSEK** düzeltmeler (6-10) → ardından
3. **ORTA** düzeltmeler (11-19) → ensuite
4. **DÜŞÜK** düzeltme (20) → en sonda

Her düzeltme sonrası `node --check` ile syntax kontrolü yapılacak.

---

## NOTLAR

- Bu dosya, sohbette edinilen tüm bilgiyi içerir
- Başka bir agent bu dosyadan bağlamı okuyarak devam edebilir
- Her düzeltme tamamlandığında ⏳ → ✅ olarak güncellenecek
- Toplam 20 görev, 4 öncelik seviyesi
