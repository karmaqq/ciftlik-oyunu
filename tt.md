# TOOLTIP SİSTEMİ — KAPSAMLI ANALİZ VE TASARIM PLANI

## İçindekiler

1. [Mevcut Sistem Analizi](#1-mevcut-sistem-analizi)
2. [Tespit Edilen Eksiklikler ve Hatalar](#2-tespit-edilen-eksiklikler-ve-hatalar)
3. [Yeni Sistem Tasarım Prensipleri](#3-yeni-sistem-tasarım-prensipleri)
4. [Dosya Yapısı](#4-dosya-yapısı)
5. [TooltipManager Sınıfı](#5-tooltipmanager-sınıfı)
6. [HTML Builder Fonksiyonları](#6-html-builder-fonksiyonları)
7. [Veri Hazırlama Fonksiyonları](#7-veri-hazırlama-fonksiyonları)
8. [Şablon Fonksiyonları](#8-şablon-fonksiyonları)
9. [CSS Yenilikleri](#9-css-yenilikleri)
10. [Entegrasyon Planı](#10-entegrasyon-planı)
11. [Uygulama Sırası](#11-uygulama-sırası)
12. [Önemli Notlar](#12-önemli-notlar)

---

## 1. Mevcut Sistem Analizi

### 1.1 Mimari Özeti

```
┌─────────────────────────────────────────────────────────┐
│  Veri Katmanı                                           │
│  calendarTrade.js, weather.js, items.js                 │
│  → Fiyat/mevsim/hava hesapları                          │
├─────────────────────────────────────────────────────────┤
│  HTML Üretim Katmanı                                    │
│  ui.js → ttTitle/ttRow/ttDivider/ttHint + setTooltip()  │
│  → HTML string oluşturur → ttStore Map'ine kaydeder     │
├─────────────────────────────────────────────────────────┤
│  Gösterim / Tetikleme Katmanı                           │
│  main.js → mouseover/mouseout + #game-tooltip container │
│  → ttStore'dan HTML alır → DOM'a yazar → pozisyonlar   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Mevcut Tooltip Listesi (23 Adet)

| # | Tooltip Türü | Konum (ui.js) | Veri |
|---|---|---|---|
| 1 | Zaman/Mevsim Header | 595-601 | Mevsim, hava, takvim ticaret |
| 2 | Altın Header | 602-607 | Toplam altın, satma ipucu |
| 3 | Market Zamanlayıcı | 610-614 | Yenileme kalan süre |
| 4 | Kuyruk | 617-633 | Bekleyen ürünler listesi |
| 5 | Tohum/Fidan (envanter) | 673-697 | Büyüme, mevsim, ipucu |
| 6 | Kaliteli ürün (envanter) | 698-719 | Fiyat analizi, satış fiyatı |
| 7 | Hasat/Hayvan Ürünü (envanter) | 720-739 | Fiyat analizi, satış fiyatı |
| 8 | Kilitli slot | 979-984 | Maliyet, slot sayısı |
| 9 | Boş slot | 992-998 | Hız bonusu, ipucu |
| 10 | Büyüyen/Hasat slot | 939-1031 | Büyüme%, süre, mevsim, hava |
| 11 | Hız geliştirme butonu | 1044-1049 | Hız%, maliyet |
| 12 | Slot geliştirme row | 773-779 | Durum, maliyet, açıklama |
| 13 | Özellik satın alma | 796-806 | Ad, açıklama, maliyet |
| 14 | Bina geliştirme row | 894-906 | Hayvan, popülasyon, seviye |
| 15 | Bina ana panel | 1069-1104 | Bina detayı, üretim, ürünler |
| 16 | Bina depolanan ürün | 1087-1098 | Ürün adı, miktar, fiyat |
| 17 | Market (satılmış tohum) | 1180-1186 | Mevsim, tükendi uyarısı |
| 18 | Market (satılmış hayvan) | 1172-1177 | Bina, tükendi uyarısı |
| 19 | Market (hayvan, satın alınabilir) | 1189-1198 | Fiyat analizi, kapasite |
| 20 | Market (tohum/fidan, detaylı) | 1215-1226 | 3 katmanlı fiyat analizi |
| 21 | Market (tanımsız) | 1228-1236 | Basit fiyat bilgisi |
| 22 | Tarif (crafting) | 1348-1364 | Ham madde, zincir, kâr/zarar |
| 23 | Görev kartı | 1393-1403 | Tür, ürün, ilerleme, ödül |

### 1.3 Kullanılmayan Fonksiyonlar

| Fonksiyon | Konum | Durum |
|---|---|---|
| `cropTooltip(cropId)` | ui.js:183-197 | Tanımlı, çağrılmıyor — ölü kod |
| `treeTooltip(treeId)` | ui.js:199-211 | Tanımlı, çağrılmıyor — ölü kod |
| `weatherTooltip(w)` | ui.js:167-181 | Tanımlı, çağrılmıyor — ölü kod |

---

## 2. Tespit Edilen Eksiklikler ve Hatalar

### 2.1 KRİTİK HATALAR

| # | Sorun | Konum |
|---|---|---|
| 1 | `cropTooltip()`, `treeTooltip()` tanımlı ama çağrılmıyor | ui.js:183-211 |
| 2 | `weatherTooltip()` tanımlı ama çağrılmıyor | ui.js:167-181 |
| 3 | Emoji kullanımı tutarsız | Tüm tooltip'ler |
| 4 | Header'da tüm bilgi tek tooltip'te, çok kalabalık | ui.js:595-601 |

### 2.2 EKSİK BİLGİLER

| # | Tooltip | Eksik Veri | Önem |
|---|---|---|---|
| 5 | Tohum/Fidan | Satış fiyatı gösterilmiyor | Yüksek |
| 6 | Tohum/Fidan | Tier bilgisi yok | Orta |
| 7 | Tohum/Fidan | Mevsim etkisi (%) gösterilmiyor | Yüksek |
| 8 | Tohum/Fidan | Hava durumu etkisi gösterilmiyor | Yüksek |
| 9 | Tohum/Fidan | Worst season bilgisi yok | Orta |
| 10 | Hasat ürünü | Nadirlik (rarity) gösterilmiyor | Yüksek |
| 11 | Hasat ürünü | Kaynak bilgisi (nereden geldiği) yok | Orta |
| 12 | Hasat ürünü | Hangi tariflerde kullanıldığı yok | Yüksek |
| 13 | Hasat ürünü | Birleştirme bilgisi (3→1 kaliteli) yok | Yüksek |
| 14 | Kaliteli ürün | Kaynak bilgisi (hangi üründen) yok | Yüksek |
| 15 | Tarla/bahçe slot | Emoji yok, slot seviyesi gösterilmiyor | Orta |
| 16 | Bina paneli | Seviye, nadir ürün şansı, ikincil ürün şansı yok | Yüksek |
| 17 | Market (tohum/fidan) | Satış fiyatı, kâr hesabı, toplu alım indirimi yok | Yüksek |
| 18 | Görev kartı | Kalan süre, açıklama yetersiz | Orta |

---

## 3. Yeni Sistem Tasarım Prensipleri

- **Yaklaşım:** Sıfırdan yeniden yazma (TooltipManager sınıfı)
- **Header:** Ayrı section'lar halinde (Mevsim, Hava, Takvim Ticaret)
- **Görseller:** Hem yüzde hem progress bar

### Renk Paleti

| Renk | Anlam | Kullanım |
|---|---|---|
| `gold` | Altın/değer | Fiyatlar, maliyetler, kâr |
| `green` | Olumlu/pozitif | İyi mevsim, kâr, tamamlandı |
| `red` | Olumsuz/negatif | Kötü mevsim, zarar, eksik |
| `blue` | Bilgi/nötr | Zincirler, nadirlik, tarifler |
| `purple` | Özel/nadir | Kaliteli ürünler |

### Bilgi Hiyerarşisi Sırası

```
1. BAŞLIK     → Emoji + İsim
2. KİMLİK     → Tier rozeti + Kategori badge'i
3. TEMEL BİLGİ→ Büyüme/İlerleme temel verisi
4. FİYAT      → Alış/Satış/Kâr
5. ETKİLER    → Mevsim/Hava/Piyasa
6. BAĞLANTILAR→ Tarif zincirleri, kullanım alanları
7. İPUÇLARI   → Alt bilgi, rehber
```

---

## 4. Dosya Yapısı

```
js/
├── tooltip/
│   ├── index.js          # TooltipManager sınıfı
│   ├── builders.js       # HTML builder fonksiyonları
│   ├── data.js           # Veri hazırlama fonksiyonları
│   └── templates.js      # Şablon fonksiyonları (16 şablon)
```

---

## 5. TooltipManager Sınıfı

**Dosya:** `js/tooltip/index.js`

### API

| Metot | Görev |
|---|---|
| `constructor()` | Store, DOM referansları, sayaç |
| `init()` | Event listener'ları bağla |
| `register(html)` | ttStore'a kaydet, ID dön |
| `show(target)` | Tooltip'i göster |
| `hide()` | Tooltip'i gizle |
| `update(id, html)` | Mevcut tooltip'i güncelle (canlı süre için) |
| `clear()` | Tüm store'u temizle (her render'da) |
| `_position(target)` | Pozisyon hesaplama |

---

## 6. HTML Builder Fonksiyonları

**Dosya:** `js/tooltip/builders.js`

| Fonksiyon | Görev |
|---|---|
| `ttTitle(text)` | Başlık HTML'i |
| `ttRow(icon, label, value, colorClass?)` | Bilgi satırı |
| `ttDivider()` | Ayraç çizgisi |
| `ttHint(text)` | İtalic ipucu |
| `ttSection(title)` | Bölüm başlığı |
| `ttBadge(text, colorClass)` | Rozet (Tier, Nadirlik) |
| `ttProgressBar(pct, colorClass?)` | İlerleme çubuğu |
| `ttInfo(text)` | Düz bilgi metni |
| `seasonEmoji(s)` | Mevsim emojisi |
| `weatherEmoji(w)` | Hava emojisi |
| `capitalize(str)` | Büyük harfle başlayan string |
| `diffLabel(val)` | `(+X%)` veya `(−X%)` |
| `diffColor(val)` | Renk seçimi |
| `tierBadge(tier)` | Tier rozeti |
| `tierName(tier)` | Tier adı |

---

## 7. Veri Hazırlama Fonksiyonları

**Dosya:** `js/tooltip/data.js`

### 7.1 `prepareSeedData(itemId, state)` — Tohum/Fidan

```javascript
{
  name, emoji, tier, favoriteSeason, worstSeason,
  growthDays, harvestCycle, recurringIntervalDays,
  buyPrice, sellPrice, seasonPct, weatherPct, weatherName,
  isFavorite, isWorst, harvestText,
  usedInRecipes, inventoryQty
}
```

### 7.2 `prepareHarvestData(itemId, state)` — Hasat Ürünü

```javascript
{
  name, emoji, tier, source, rarity,
  basePrice, seasonPct, weatherPct, weatherName, marketPrice,
  usedInRecipes, inventoryQty, qualityPrice
}
```

### 7.3 `prepareQualityData(itemId, state)` — Kaliteli Ürün

```javascript
{
  name, emoji, tier, sourceItem, sourceEmoji,
  basePrice, qualityPrice, seasonPct, weatherName, marketPrice,
  usedInRecipes, inventoryQty
}
```

### 7.4 `prepareSlotData(slot, kind, state)` — Tarla/Bahçe Slot

```javascript
{
  name, emoji, tier, pct, remainingMin, remainSec, remainingSec,
  harvestsLeft, maxHarvests, ready, speedPct,
  seasonPct, weatherPct, weatherName, growInfo,
  slotLevel, kind, kindName
}
```

### 7.5 `prepareRecipeData(recipeId, state)` — Tarif

```javascript
{
  name, emoji, tier, learned,
  inputs: [{ id, name, emoji, required, have, sufficient }],
  outputPrice, inputCost, profit, maxQty,
  usedInRecipes, chainInputs
}
```

### 7.6 `prepareBuildingData(type, state)` — Bina

```javascript
{
  name, animalName, level, maxLevel, population, capacity, maxed,
  upgradeCost, productId, productName, productEmoji,
  baseProductionDays, dailyOutput,
  secondaryProductId, secondaryProductName, secondaryProductEmoji, secondaryChance,
  fieldBonusCropIds, fieldBonusNames,
  storedProducts: [{ id, name, emoji, qty, price }]
}
```

### 7.7 `prepareQuestData(quest, state)` — Görev

```javascript
{
  questId, type, typeLabel, typeEmoji,
  itemId, itemName, itemEmoji,
  progress, requiredQty, pct, done,
  rewardGold, rewardXp
}
```

### 7.8 `prepareHeaderData(state)` — Header

```javascript
{
  year, day, monthName, season, seasonEmoji,
  weather, weatherName, weatherEmoji,
  gold, marketDays, marketSeconds,
  queueCount, queueItems,
  calendarInfo, buyMult, sellMult
}
```

### 7.9 `prepareMarketListingData(listing, state)` — Market

```javascript
{
  name, emoji, category, soldOut, remaining, unitPrice,
  capacityFull, capacityInfo, crop,
  priceBreakdown: { base, seasonDiff, weatherDiff, marketDiff, final },
  sellPrice, profit, isAnimal
}
```

---

## 8. Şablon Fonksiyonları

**Dosya:** `js/tooltip/templates.js`

| # | Fonksiyon | Kullanıldığı Yer | Görünüm Özeti |
|---|---|---|---|
| 1 | `seedTemplate(d)` | Envanter tohum/fidan | Emoji+İsim, Tier+Mevsim, Büyüme, Fiyat, Tarifler, Birleştirme |
| 2 | `harvestTemplate(d)` | Envanter hasat/hayvan/üretim | Emoji+İsim, Tier+Kaynak, Fiyat, Tarifler, Birleştirme |
| 3 | `qualityTemplate(d)` | Envanter kaliteli ürün | Emoji+İsim, Tier+Kaliteli, Kaynak, Fiyat |
| 4 | `slotTemplate(d)` | Tarla/bahçe slotları | Emoji+İsim, Büyüme bar, Süre, Mevsim/Hava, Hız |
| 5 | `recipeTemplate(d)` | Üretim kartları | Emoji+İsim, Tier, Gereksinimler, Kâr, Öğrenme |
| 6 | `buildingTemplate(d)` | Bina paneli | Üretim, Nadir ürün, Bonus, Geliştirme |
| 7 | `questTemplate(d)` | Görev kartları | Tür+Ürün, İlerleme bar, Ödül |
| 8 | `timeHeaderTemplate(d)` | Header zaman | Mevsim Section, Hava Section, Takvim Ticaret Section |
| 9 | `goldHeaderTemplate(d)` | Header altın | Altın miktarı, İpucu |
| 10 | `marketTimerTemplate(s)` | Header market | Kalan süre |
| 11 | `queueTemplate(d)` | Header kuyruk | Ürün listesi |
| 12 | `lockedSlotTemplate(cost, count)` | Kilitli slot | Maliyet, slot sayısı |
| 13 | `emptySlotTemplate(name, speed)` | Boş slot | İsim, hız bonusu |
| 14 | `speedUpgradeTemplate(d)` | Hız geliştirme butonu | Hız%, maliyet |
| 15 | `marketListingTemplate(d)` | Market satırları | Fiyat kırılımı, Kâr, Toplu alım |
| 16 | `featureTemplate(e,n,d,c)` | Özellik satın alma | Emoji, açıklama, maliyet |
| 17 | `upgradeRowTemplate(...)` | Slot/geliştirme row | Durum, maliyet |
| 18 | `buildingUpgradeRowTemplate(d)` | Bina geliştirme row | Hayvan, seviye, maliyet |
| 19 | `storedProductTemplate(d)` | Bina depolanan ürün | Miktar, fiyat |

---

## 9. CSS Yenilikleri

**Dosya:** `css/style.css` — Mevcut tooltip bloğuna eklenecek:

```css
#game-tooltip { max-width: 300px; }  /* 260→300 */

.tt-section    { font-weight:700; margin:4px 0 2px; }
.tt-badge      { display:inline-block; padding:1px 6px; border-radius:4px; font-size:10px; }
.tt-badge.tier-1 { background:#4caf5020; color:#4caf50; }
.tt-badge.tier-2 { background:#2196f320; color:#2196f3; }
.tt-badge.tier-3 { background:#9c27b020; color:#9c27b0; }
.tt-badge.tier-4 { background:#ff980020; color:#ff9800; }
.tt-badge.purple  { background:#9c27b020; color:#9c27b0; }
.tt-progress   { width:100%; height:4px; background:var(--border-subtle); border-radius:2px; }
.tt-progress-fill { height:100%; border-radius:2px; transition:width 0.3s; }
.tt-progress-fill.green { background:#4caf50; }
.tt-progress-fill.gold  { background:var(--gold); }
.tt-info       { color:var(--text-muted); font-size:11px; margin:2px 0; }
.tt-flex       { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
```

---

## 10. Entegrasyon Planı

### 10.1 `main.js` Değişiklikleri

**Kaldırılacak (satır 87-240):** ttStore, ttIdCounter, showTooltip, hideTooltip, positionTooltip, event listener'lar

**Eklenecek:**
```javascript
import { TooltipManager } from "./tooltip/index.js";
const tooltip = new TooltipManager();
tooltip.init();
window._tooltip = tooltip;
window._ttStore = tooltip.store;
window._ttNextId = () => `tt${tooltip.nextId++}`;
```

### 10.2 `ui.js` Değişiklikleri

**Kaldırılacak:** ttTitle, ttRow, ttDivider, ttHint, weatherTooltip, cropTooltip, treeTooltip, buildSlotTooltip

**Eklenecek:** template ve data import'ları, her tooltip bölgesinde `xxxTemplate(prepareXxxData(...))` kullanımı

### 10.3 `tickUpdate()` Değişiklikleri

**Eski:** `buildSlotTooltip(...)` ile HTML oluşturup ttStore'da güncelle
**Yeni:** `slotTemplate(prepareSlotData(...))` + `tooltip.update(id, html)`

---

## 11. Uygulama Sırası

| # | İş | Süre |
|---|---|---|
| 1 | CSS yeniliklerini ekle | 30 dk |
| 2 | main.js'i güncelle | 30 dk |
| 3 | ui.js header tooltip'lerini güncelle | 1.5 saat |
| 4 | ui.js envanter tooltip'lerini güncelle | 2 saat |
| 5 | ui.js slot tooltip'lerini güncelle | 1.5 saat |
| 6 | ui.js market tooltip'lerini güncelle | 1.5 saat |
| 7 | ui.js tarif/görev/bina tooltip'lerini güncelle | 1.5 saat |
| 8 | tickUpdate() güncelle | 30 dk |
| 9 | Eski ölü kodları temizle | 30 dk |
| 10 | Test ve doğrulama | 1 saat |
| **TOPLAM** | | **~11 saat** |

---

## 12. Önemli Notlar

1. **Geriye Uyumluluk:** `window._ttStore`, `window._ttNextId`, `window._currentTooltipTarget` korunacak
2. **Canlı Güncelleme:** Büyüyen slot tooltip'leri her 1000ms'de `tooltip.update()` ile güncellenecek
3. **HighlightRecipes:** Envanter hover'da tarif vurgulama aynen korunacak
4. **Performans:** Tooltip'ler render'da bir kez oluşturulup store'da saklanacak
5. **Temizlik:** cropTooltip, treeTooltip, weatherTooltip, buildSlotTooltip kaldırılacak
