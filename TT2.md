# TT PRO — Tooltip Sistemi Yeniden Tasarım Rehberi

> **Sürüm:** TT Pro v1.0  
> **Tarih:** 2026-07-17  
> **Durum:** Uygulama için hazır plan  
> **Hedef:** Her 18 tooltip için sabit, tam, tutarlı, görsel olarak mükemmel içerik sistemi

---

## BÖLÜM 1 — MEVCUT DURUM VE SORUNLAR

### 1.1 Şu Anki Sistem Nasıl Çalışıyor?

```
[Hover] → tooltip.js (motor) → tooltipContent.js (içerik) → buildHTML() → #tt-root DOM
```

- `data-tt="product"` attribute'u ile tooltip tipi belirlenir
- `data-tt-item="domates"` gibi attribute'lar ile parametre传递 edilir
- `resolveTooltipContent(dataset, detail)` fonksiyonu çağrılır
- `detail` parametresi Z tuşu ile değişir (normal/detay modu)
- `buildHTML(content)` fonksiyonu `{ title, rows, footer }` nesnesini HTML'e çevirir

### 1.2 Sorunlar

| # | Sorun | Etkisi |
|---|---|---|
| 1 | **Z tuşu detay modu** | Kullanıcı bilmiyor, kullanmıyor, gereksiz karmaşıklık |
| 2 | **Normal mod çok sade** | "Satış fiyatı: 5 🪙" — bağlam yok, çarpanlar yok |
| 3 | **Tutarlı olmayan hiyerarşi** | Bir tooltip'de fiyat başta, diğerinde sonda |
| 4 | **CSS çok minimal** | Sadece flex row, grup desteği yok, ikon desteği yok |
| 5 | **Veri israfı** | Mevsim etkisi, hava bonusu, kâr/zarar hesapları var ama gösterilmiyor |
| 6 | **Grup desteği yok** | İlgili bilgiler (fiyat analizi, hız detayı) bir arada gruplanamıyor |

### 1.3 Amaç

Her tooltip'e hover yapan kullanıcı:
- **1 saniyede** o öğeyi tanısın (emoji + isim + durum)
- **3 saniyede** temel bilgileri okusun (fiyat, süre, miktar)
- **5 saniyede** tam hakimiyet kursun (çarpanlar, etkiler, bağlantılar)

---

## BÖLÜM 2 — YENİ SİSTEM MİMARİSİ

### 2.1 Temel Prensipler

| Prensip | Açıklama |
|---|---|
| **Sabit içerik** | Her tooltip her zaman tam bilgiyi gösterir, mod yok |
| **Tutarlı hiyerarşi** | Tüm tooltip'lerde aynı sıra: Başlık → Temel → Etki → Detay → İpucu |
| **Grup desteği** | İlgili bilgiler visual olarak bir arada |
| **Bağlam bilinci** | Tohum → büyüme bilgisi, Hayvan → bina bilgisi, Tarif → zincir bilgisi |
| **Renk dili** | Yeşil = iyi/kâr, Kırmızı = kötü/zarar/yetersiz, Mavi = nötr/bilgi |

### 2.2 Yeni İçerik Yapısı

Her `build*` fonksiyonu artık şu tiplerden oluşan bir dizi döndürecek:

```javascript
{
  title: string,           // Emoji + İsim (+ badge varsa)
  badge: string | null,    // Küçük renkli etiket (ör: "Nadir", "Max")
  badgeClass: string,      // badge için CSS class
  groups: [                // Gruplar dizisi (her biri visual olarak ayrılır)
    {
      rows: [
        { label: string, value: string, icon?: string } | "---"
      ]
    }
  ],
  footer: string | null    // İpucu / aksiyon yönlendirmesi
}
```

### 2.3 Yeni CSS Sınıf Haritası

```
#tt-root                  → Ana kutu (max-width: 320px, padding, border, shadow)
├── .tt-header            → Başlık satırı (flex, align-center, gap)
│   ├── .tt-header-icon   → Emoji (font-size: 1.1em)
│   ├── .tt-header-name   → İsim (font-weight: 700)
│   └── .tt-badge         → Durum etiketi (küçük, renkli, rounded)
├── .tt-group             → Grup container (ilgili satırlar bir arada)
│   ├── .tt-row           → Flex satır (justify-content: space-between)
│   │   ├── .tt-row-icon  → Sol ikon (optional, min-width)
│   │   ├── .tt-row-label → Sol etiket (text-secondary)
│   │   └── .tt-row-value → Sağ değer (text-primary, font-weight: 600)
│   └── .tt-divider       → İnce ayırıcı çizgi
├── .tt-group + .tt-group → Gruplar arası daha kalın ayırıcı
└── .tt-footer            → İpucu metni (text-muted, italic, border-top)
```

### 2.4 Motor Değişiklikleri (tooltip.js)

| Mevcut | Yeni |
|---|---|
| `resolveTooltipContent(dataset, detail)` | `resolveTooltipContent(dataset)` — detail parametresi gider |
| `pinnedDetail`, `heldDetail`, `isDetail()` | Tamamen kaldırılır |
| `handleKeyDown` (Z tuşu) | Kaldırılır |
| `handleKeyUp` (Z tuşu) | Kaldırılır |
| `setPinnedDetail(val)` | Kaldırılır |
| `buildHTML(content)` | Yeni: `tt-header`, `tt-group`, `tt-badge`, `tt-footer` desteği |
| `max-width: 280px` | `max-width: 320px` (daha fazla bilgi için) |

---

## BÖLÜM 3 — HER TOOLTIP İÇİN AYRINTILI İÇERİK PLANI

### Genel Sıralama Kuralı

Tüm tooltip'lerde bu sıra **kesin olarak** korunacak:

```
[1] HEADER    →  Emoji + İsim + Badge (varsa)
[2] GROUP 1   →  Temel bilgiler (fiyat, süre, miktar, durum)
[3] GROUP 2   →  Etki/çarpan bilgileri (mevsim, hava, nadirlik)
[4] GROUP 3   →  Detay/bağlantı bilgileri (formül, zincir, kâr analizi)
[5] FOOTER    →  İpucu / aksiyon yönlendirmesi
```

Her grup arasında `.tt-group` class'ı ile visual ayrım olacak.

---

### TOOLTIP 1: `product` — Envanter Ürünü

**Bağlam:** Envanter hücresine hover.  
**Kullanıcı sorusu:** "Bu nedir? Kaça satar? Ne işe yarar?"

#### Veri Kaynakları
- `resolveItem(baseId)` → name, sellPrice, buyPrice, emoji
- `ctx.state.inventory.items[itemId]` → quantity, meta (rarity, sellPriceOverride)
- `getCalendarSellMultiplier(state, rarity)` → final price multiplier
- `getCrop(baseId)` / `getTree(baseId)` → plant bilgileri (tohum/fidan için)
- `SEASON_SELL_MULTIPLIER[season]` → mevsim satış etkisi
- `getWeather(state.weather)` → hava durumu etkisi

#### İçerik Planı

```
HEADER: {emoji} {isim}
  └─ Badge: "Nadir" / "Efsanevi" / "Gizemli" (varsa, renkli)

GROUP 1 — Fiyat:
  Satış fiyatı       →  {finalPrice} 🪙
  Toplam ({qty}x)    →  {totalValue} 🪙          (qty > 1 ise)

GROUP 2 — Etkiler (takvim açıksa):
  Nadirlik bonusu    →  +%-X                       (rarity != normal, yeşil/kırmızı)
  Mevsim ({mevsim})  →  +%-X                       (sıfır değilse, yeşil/kırmızı)
  Hava ({hava})      →  -%20                       (sadece gökkuşağı + nadir, kırmızı)

GROUP 3 — Tohum/Fidan bilgisi (isSeedLike ise):
  Sezon              →  🌸 İlkbahar ☀️ Yaz
  Büyüme             →  {gün} gün
  Hasat              →  Tekrarlı ({gün}g) / Tek hasat
  Alış fiyatı        →  {buyPrice} 🪙

GROUP 4 — Kaliteli bilgisi (isKaliteli ise):
  (boş — sadece ipucu gösterilir)

FOOTER: "Sürükle ve ek" (tohum/fidan) / "4x fiyatına satılır" (kaliteli)
```

#### Kod Yapısı (psöodo)
```javascript
function buildProduct(ds) {
  // ... veri toplama ...
  
  return {
    title: `${emoji} ${resolved.name}`,
    badge: rarity !== "normal" ? rarityLabel[rarity] : null,
    badgeClass: rarityClass[rarity] || "",
    groups: [
      // GROUP 1: Fiyat
      { rows: [
        { label: "Satış fiyatı", value: `${finalPrice} 🪙` },
        qty > 1 ? { label: `Toplam (${qty}x)`, value: `${totalValue} 🪙` } : null,
      ].filter(Boolean) },
      
      // GROUP 2: Etkiler (varsa)
      ...(etkilerVar ? [{ rows: etkilerSatirlari }] : []),
      
      // GROUP 3: Tohum/Fidan (varsa)
      ...(isSeedLike ? [{ rows: tohumSatirlari }] : []),
    ],
    footer: ipucuMetni,
  };
}
```

---

### TOOLTIP 2: `marketBuy` — Market Alım Butonu

**Bağlam:** 1x veya Nx butonuna hover.  
**Kullanıcı sorusu:** "Ne kadar ödeyeceğim? Uygun mu?"

#### Veri Kaynakları
- `ctx.state.market.listings[index]` → listing (pricePerUnit, basePrice, priceMultiplier, remaining)
- `getBulkDiscountPercent()` → toplu indirim
- `getCalendarBuyMultiplier(state, category)` → takvim alış çarpanı
- `SEASON_BUY_MULTIPLIER[season]` / `SEASON_SAPLING_MULTIPLIER[season]` → mevsim etkisi
- `WEATHER_BUY_MULTIPLIER[weather.id]` → hava etkisi

#### İçerik Planı

```
HEADER: {emoji} {isim}

GROUP 1 — Alım:
  1 adet             →  {unitPrice} 🪙              (single modda)
  {n} adet           →  {bulkCost} 🪙               (bulk modda)
  Toplu indirim      →  %10                         (bulk modda, yeşil)

GROUP 2 — Fiyat Analizi:
  Taban fiyat        →  {basePrice} 🪙
  Piyasa             →  +%-X                        (dalgalanma, renkli)
  Mevsim ({mevsim})  →  +%-X                        (tohum/fidan, renkli)
  Hava ({hava})      →  +%-X                        (renkli)

GROUP 3 — Sonuç:
  Kâr                →  +{x} 🪙                     (yeşil, fiyat > taban)
  Zarar              →  -{x} 🪙                     (kırmızı, fiyat < taban)
  Fiyat ideal        →  (nötr, fiyat = taban)
```

---

### TOOLTIP 3: `marketInfo` — Market Ürün Bilgisi

**Bağlam:** Market satırının sol tarafına (isim/fotoğraf) hover.  
**Kullanıcı sorusu:** "Bu ürün nedir? Değeri nedir?"

#### Veri Kaynakları
- `getCrop(listing.itemId)` / `getTree(listing.itemId)` → crop/tree detayları
- `BUILDING_TYPES[listing.buildingType]` → bina detayları (hayvan için)
- `listing.pricePerUnit`, `listing.basePrice` → fiyat analizi

#### İçerik Planı

```
HEADER: {emoji} {isim}

GROUP 1 — Ürün Detayı (tohum/fidan):
  Tier               →  {n}
  Büyüme             →  {gün} gün
  Satış              →  {sellPrice} 🪙
  Hasat              →  Tekrarlı ({gün}g) / Tek hasat

GROUP 1 — Ürün Detayı (hayvan):
  Bina               →  {binaAdı}
  Üretim             →  {günde} günde 1 {ürün}
  Nadiren            →  {ikincilÜrün}               (varsa)

GROUP 2 — Fiyat Analizi:
  Birim fiyat        →  {pricePerUnit} 🪙
  Kâr                →  +{x} 🪙                     (yeşil/kırmızı)
```

---

### TOOLTIP 4: `soldOut` — Tükenmiş Ürün

**İçerik:**
```
HEADER: Tükendi

GROUP 1:
  Yenilenme          →  {saniye}s

FOOTER: "Bu döngüde gelmeyecek"
```

---

### TOOLTIP 5: `bulkDiscount` — Toplu İndirim

**İçerik:**
```
HEADER: Toplu Alım

GROUP 1:
  İndirim            →  %10 (yeşil)

FOOTER: "Tüm kalan stoğu tek seferde indirimli alırsın."
```

---

### TOOLTIP 6: `emptySlot` — Boş Slot

**Bağlam:** Boş tarla/bahçe slotuna hover.  
**Kullanıcı sorusu:** "Bu slot ne işe yarar?"

#### İçerik Planı

```
HEADER: {Tarla/Bahçe} Slot #{n}

GROUP 1:
  Durum              →  Boş
  Hız bonusu         →  +%X                         (yeşil, slot.level > 0)

FOOTER: "Tohum sürükle" / "Fidan sürükle"
```

---

### TOOLTIP 7: `lockedSlot` — Kilitli Slot

**Bağlam:** Kilitli slot'a hover.  
**Kullanıcı sorusu:** "Ne kadara açılır?"

#### İçerik Planı

```
HEADER: Kilitli Slot

GROUP 1:
  Maliyet            →  {cost} 🪙
  Durum              →  Yetersiz altın               (kırmızı, yetersizse)

GROUP 2 (takvim açıksa):
  Formül             →  {base} × {rate}^n
  Açık slot          →  {n}

FOOTER: "Açmak için tıkla"
```

---

### TOOLTIP 8: `growingSlot` — Büyümekte Olan Bitki

**Bağlam:** Büyüyen bitki slotuna hover.  
**Kullanıcı sorusu:** "Ne zaman hazır olur? Hızım nasıl?"

#### Veri Kaynakları
- `slot.planted` → cropId, elapsedSeconds, requiredSeconds, harvestsLeft, maxHarvests
- `FIELD_LEVEL_SPEED_BONUS * slot.level` → slot hız bonusu
- `getWeather(state.weather).growthSpeedMultiplier` → hava bonusu
- `levelBonus * weatherBonus` → toplam hız

#### İçerik Planı

```
HEADER: {emoji} {bitki ismi}

GROUP 1 — İlerleme:
  İlerleme           →  %X
  Kalan süre         →  {dk}dk {sn}sn

GROUP 2 — Hız:
  Büyüme hızı        →  ×{çarpan}
  Kalan hasat        →  {kalan} / {toplam}

GROUP 3 — Hava Etkisi (sıfır değilse):
  Hava ({hava})      →  +%-X                        (yeşil/kırmızı)
```

---

### TOOLTIP 9: `readySlot` — Hasada Hazır Slot

**Bağlam:** Hazır slot'a hover.  
**Kullanıcı sorusu:** "Hasat edebilir miyim? Nadir ürün çıkabilir mi?"

#### İçerik Planı

```
HEADER: {emoji} {bitki ismi}

GROUP 1 — Durum:
  Durum              →  Hasat hazır!                 (yeşil)
  Kalan hasat        →  {kalan} / {toplam}

GROUP 2 — Nadirlik Şansları (varsa):
  Nadir şans         →  %5                          (mavi)
  Efsanevi şans      →  %5                          (turuncu)
  Gizemli şans       →  %1                          (mor)

FOOTER: "Tıklayarak hasat et"
```

---

### TOOLTIP 10: `slotUpgrade` — Hız Geliştirme

**Bağlam:** Hız geliştirme butonuna hover.  
**Kullanıcı sorusu:** "Ne kadara geliştiririm? Ne kazanırım?"

#### Veri Kaynakları
- `slot.level`, `MAX_FIELD_LEVEL`
- `fieldUpgradeCost(slot.level)` / `orchardUpgradeCost(slot.level)`
- `FIELD_LEVEL_SPEED_BONUS * slot.level` → mevcut hız
- `FIELD_LEVEL_SPEED_BONUS * (slot.level + 1)` → sonraki hız

#### İçerik Planı

```
HEADER: Hız Geliştirme

GROUP 1 — Durum:
  Seviye             →  {n} / {max}
  Hız                →  %{mevcut} → %{sonraki}      (yeşil)

GROUP 2 — Alım:
  Maliyet            →  {cost} 🪙
  Durum              →  Yetersiz altın               (kırmızı, yetersizse)

FOOTER: "Büyüme hızını +1 artırır"
```

---

### TOOLTIP 11: `upgradeNode` — Yetenek Ağacı Düğümü

**Bağlam:** Yetenek ağacı düğümüne hover.  
**Kullanıcı sorusu:** "Bu ne işe yarar? Ne kadara alınır?"

#### İçerik Planı

```
HEADER: {emoji} {title}

GROUP 1:
  Bilgi              →  {hint}

GROUP 2 — Duruma göre:
  Max ise:           →  Durum: Maksimum              (yeşil)
  Kilitli ise:       →  Kilitli: {lockedBy} gerekli  (kırmızı)
  Değilse:           →  Mevcut: {n} / {max}
                       Maliyet: {cost} 🪙
                       Yetersiz altın                 (kırmızı, yetersizse)

GROUP 3 — Bina detayı (buildingType varsa ve detay modunda):
  Kapasite           →  {n} → {n+1}                  (yeşil)
```

---

### TOOLTIP 12: `featureNode` — Özellik Satın Alma

**Bağlam:** Özellik düğümüne hover.  
**Kullanıcı sorusu:** "Bu özellik ne işe yarar?"

#### İçerik Planı

```
HEADER: {emoji} {name}

GROUP 1:
  Bilgi              →  {description}

GROUP 2 — Durum:
  Satın alındıysa   →  Durum: Satın alındı          (yeşil)
  Değilse            →  Maliyet: {cost} 🪙
                       Yetersiz altın                 (kırmızı, yetersizse)

FOOTER: "Satın almak için tıkla"
```

---

### TOOLTIP 13: `calendarInfo` — Takvim Ticaret

**Bağlam:** Header'daki zaman bilgisine hover.  
**Kullanıcı sorusu:** "Şu anki mevsim/hava fiyatları nasıl etkiliyor?"

#### Veri Kaynakları
- `getCalendarTradeInfo(state)` → season, seasonName, seasonEffect, weather, weatherEffect
- `SEASON_SELL_MULTIPLIER[season]` → satış etkisi
- `SEASON_BUY_MULTIPLIER[season]` → tohum alış etkisi
- `SEASON_SAPLING_MULTIPLIER[season]` → fidan alış etkisi
- `WEATHER_BUY_MULTIPLIER[weather.id]` → hava alış etkisi
- `getWeather(state.weather).growthSpeedMultiplier` → büyüme hızı
- `getWeather(state.weather).tradeLossChance` → ticaret riski

#### İçerik Planı

```
HEADER: Takvim Ticaret

GROUP 1 — Genel Durum:
  Mevsim             →  {mevsimAdı} {emoji}
  Hava               →  {havaAdı} {emoji}
  Etki               →  {seasonEffect}

GROUP 2 — Çarpanlar:
  Büyüme hızı        →  +%-X                        (yeşil/kırmızı, sıfır değilse)
  Ticaret riski      →  %X                          (kırmızı, sıfır değilse)

GROUP 3 — Satış/Alış:
  Satış etkisi       →  +%-X                        (yeşil/kırmızı)
  Alış (tohum)       →  +%-X                        (yeşil/kırmızı)
  Alış (fidan)       →  +%-X                        (yeşil/kırmızı)
```

---

### TOOLTIP 14: `craftRecipe` — Üretim Tarifi

**Bağlam:** Üretim kartına hover.  
**Kullanıcı sorusu:** "Bu tarif ne üretir? Malzemelerim yetiyor mu? Kârlı mı?"

#### Veri Kaynakları
- `RECIPES.find(r => r.id === recipeId)` → recipe (inputs, output, tier)
- `ctx.state.inventory.items[inp.id]` → mevcut malzeme miktarı
- `itemSellPrice(recipe.output.id)` → çıktı fiyatı
- `canCraft(state, recipeId, n)` → üretilebilirlik
- `RECIPES.filter(other => other.inputs.some(...))` → kullanıldığı yerler
- `RECIPES.filter(x => x.output.id === inp.id)` → zincir bağlantıları

#### İçerik Planı

```
HEADER: {outputEmoji} {recipe.name}

GROUP 1 — Girdiler:
  {emoji1} {isim1}      →  {mevcut}/{gereken}      (yeşil/kırmızı)
  {emoji2} {isim2}      →  {mevcut}/{gereken}      (yeşil/kırmızı)
  ... (her girdi için ayrı satır)

GROUP 2 — Çıktı:
  Çıktı fiyat        →  {fiyat} 🪙
  Kâr                →  +{x} 🪙 / -{x} 🪙          (yeşil/kırmızı)
  Üretilebilir       →  {adet}x

GROUP 3 — Bağlantılar (varsa):
  Zincir             →  {emoji} {tarif1}, {emoji} {tarif2}   (mavi)
  Kullanıldığı       →  {emoji} {tarif1}, {emoji} {tarif2}
  Kullanıldığı       →  Doğrudan satış                        (yoksa)

FOOTER: "Öğrenildi — toplu üretim açık" / "İlk üretimde öğrenilir"
```

---

### TOOLTIP 15: `quickSellZone` — Hızlı Satış

**İçerik:**
```
HEADER: Hızlı Satış

GROUP 1:
  Mod                →  Tekli satış / Toplu satış
  Bilgi              →  {açıklama}

GROUP 2 — Risk (sıfır değilse):
  Risk               →  %X ile ürün kaybolur       (kırmızı)
```

---

### TOOLTIP 16: `buildingCapacity` — Bina Kapasitesi

**Bağlam:** Bina paneline hover.  
**Kullanıcı sorusu:** "Bu bina ne üretiyor? Kapasitem ne durumda?"

#### Veri Kaynakları
- `BUILDING_TYPES[buildingType]` → def (name, animalName, productId, secondaryProductId, secondaryChance, baseProductionDays, fieldBonusCropIds)
- `capacityForLevel(buildingType, level)` → kapasite
- `building.population` → mevcut hayvan sayısı
- `itemDisplayName(def.productId)` → ürün adı

#### İçerik Planı

```
HEADER: {binaAdı}

GROUP 1 — Popülasyon:
  Popülasyon         →  {n} / {kapasite}
  Durum              →  Kapasite dolu                (kırmızı, doluysa)

GROUP 2 — Üretim:
  Üretim             →  {günde} günde {n} {ürün}
  Nadiren            →  {ikincilÜrün} ({%X})         (varsa)

GROUP 3 — Bonuslar:
  Tarla bonusu       →  {emoji} {ürün1}, {emoji} {ürün2}   (varsa)
```

---

### TOOLTIP 17: `inventoryFilter` — Envanter Filtresi

```
HEADER: Filtre

GROUP 1:
  Aktif              →  {filtreAdı}

FOOTER: "Kategori filtresi"
```

---

### TOOLTIP 18: `inventorySort` — Envanter Sıralama

```
HEADER: Sıralama

GROUP 1:
  Mod                →  İsme göre / Değere göre

FOOTER: "Karaktere tıklayarak değiştir"
```

---

## BÖLÜM 4 — CSS TASARIMI

### 4.1 Yeni Sınıf Yapısı

```css
/* ═══ ANA KUTU ═══ */
#tt-root {
  position: fixed;
  z-index: var(--z-tooltip);
  min-width: 200px;
  max-width: 320px;           /* 280 → 320: daha fazla bilgi için */
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 10px 14px;
  font-size: var(--font-xs);
  color: var(--text-primary);
  pointer-events: none;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 150ms ease, transform 150ms ease;
  word-break: break-word;
}

#tt-root.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ═══ BAŞLIK ═══ */
.tt-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.tt-header-icon {
  font-size: 1.15em;
  line-height: 1;
}

.tt-header-name {
  font-weight: 700;
  font-size: var(--font-sm);
  color: var(--text-primary);
}

/* ═══ BADGE ═══ */
.tt-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tt-badge-nadir {
  background: rgba(68, 136, 255, 0.15);
  color: var(--rarity-nadir);
  border: 1px solid rgba(68, 136, 255, 0.3);
}

.tt-badge-legendary {
  background: rgba(255, 136, 0, 0.15);
  color: var(--rarity-legendary);
  border: 1px solid rgba(255, 136, 0, 0.3);
}

.tt-badge-gizemli {
  background: rgba(204, 68, 255, 0.15);
  color: var(--rarity-gizemli);
  border: 1px solid rgba(204, 68, 255, 0.3);
}

/* ═══ GRUP ═══ */
.tt-group {
  margin-bottom: 6px;
}

.tt-group + .tt-group {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

/* ═══ SATIR ═══ */
.tt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 1px 0;
  line-height: 1.4;
}

.tt-row-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.tt-row-value {
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
}

/* ═══ AYIRICI ═══ */
.tt-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 0;
}

/* ═══ İPUCU ═══ */
.tt-footer {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-style: italic;
  font-size: 12px;
}

/* ═══ RENK SINIFLARI ═══ */
.tt-positive { color: #4ade80; }
.tt-negative { color: var(--danger); }
.tt-neutral  { color: var(--text-secondary); }

/* ═══ NADİRLİK RENKLERİ ═══ */
.tt-rarity-nadir     { color: var(--rarity-nadir); }
.tt-rarity-legendary { color: var(--rarity-legendary); }
.tt-rarity-gizemli   { color: var(--rarity-gizemli); }
```

### 4.2 Yeni `buildHTML` Fonksiyonu

```javascript
function buildHTML(content) {
  let html = "";
  
  // HEADER
  if (content.title) {
    html += `<div class="tt-header">`;
    html += `<span class="tt-header-name">${content.title}</span>`;
    if (content.badge) {
      html += `<span class="tt-badge ${content.badgeClass}">${content.badge}</span>`;
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
```

---

## BÖLÜM 5 — DEĞİŞİKLİK LİSTESİ

### 5.1 `js/ui/tooltip.js` — Motor Değişiklikleri

| Satır | Mevcut | Yeni | Açıklama |
|---|---|---|---|
| 14-15 | `pinnedDetail`, `heldDetail` | Kaldır | Z tuşu modu yok |
| 26-28 | `isDetail()` fonksiyonu | Kaldır | |
| 31-34 | `setPinnedDetail(val)` export | Kaldır | |
| 38 | `pinnedDetail = getSetting(...)` | Kaldır | |
| 56-57 | `keydown`, `keyup` listener'ları | Kaldır | |
| 69 | `resolveTooltipContent(el.dataset, isDetail())` | `resolveTooltipContent(el.dataset)` | detail parametresi gider |
| 115-129 | `handleKeyDown`, `handleKeyUp` | Kaldır | |
| 133 | `resolveTooltipContent(el.dataset, isDetail())` | `resolveTooltipContent(el.dataset)` | |
| 184-202 | `buildHTML(content)` | Yeni `buildHTML` (header, group, badge, footer) | |

### 5.2 `js/ui/tooltipContent.js` — İçerik Değişiklikleri

| Değişiklik | Açıklama |
|---|---|
| `resolveTooltipContent(dataset, detail)` | `resolveTooltipContent(dataset)` — `detail` parametresi kaldırılır |
| Tüm `build*` fonksiyonları | `detail` parametresi kaldırılır |
| Tüm `if (detail)` blokları | Kaldırılır — tüm bilgi her zaman gösterilir |
| Return yapısı | `{ title, rows, footer }` → `{ title, badge, badgeClass, groups, footer }` |
| Her fonksiyonda | Gruplandırılmış satırlar: `groups: [{ rows: [...] }, { rows: [...] }]` |

### 5.3 `css/tooltip.css` — Tam Yeniden Yazma

| Mevcut | Yeni |
|---|---|
| `.tt-title` | `.tt-header` + `.tt-header-name` + `.tt-header-icon` |
| `.tt-row` | `.tt-group` > `.tt-row` > `.tt-row-label` + `.tt-row-value` |
| — | `.tt-badge`, `.tt-badge-nadir`, `.tt-badge-legendary`, `.tt-badge-gizemli` |
| — | `.tt-footer` (border-top ile) |
| `max-width: 280px` | `max-width: 320px` |

### 5.4 Temizlik

| Dosya | Kaldırılacak |
|---|---|
| `js/ui/settings.js` | Detail tooltip ayarı (varsa `detailTooltip` setting) |
| `js/ui/index.js` | `refreshOpenTooltip()` — detail parametrisiz kalır, sadece imza değişir |

---

## BÖLÜM 6 — UYGULAMA SIRASI

| Adım | Dosya | İşlem |
|---|---|---|
| 1 | `css/tooltip.css` | Tamamen yeniden yaz (yeni class yapısı) |
| 2 | `js/ui/tooltip.js` | Z tuşu mekanizmasını kaldır, `buildHTML`'ı güncelle |
| 3 | `js/ui/tooltipContent.js` | Tüm 18 fonksiyonu yeniden yaz (gruplu yapı, detail'siz) |
| 4 | `js/ui/settings.js` | `detailTooltip` ayarını kaldır (varsa) |
| 5 | `js/ui/index.js` | `refreshOpenTooltip` çağrısını kontrol et |
| 6 | Test | Tarayıcıda tüm tooltip'leri kontrol et |

---

## BÖLÜM 7 — BAŞARI KRİTERLERİ

| Kriter | Ölçüm |
|---|---|
| **Tutarlılık** | 18 tooltip'in hepsinde aynı sıra: Header → Group → Footer |
| **Tam bilgi** | Hiçbir `if (detail)` bloğu kalmadı, her şey her zaman görünür |
| **Z tuşu yok** | `tooltip.js`'de Z ile ilgili hiçbir kod kalmadı |
| **Grup desteği** | İlgili satırlar `.tt-group` ile visual olarak ayrı |
| **Badge desteği** | Nadir/Efsanevi/Gizemli renkli etiketler çalışıyor |
| **CSS temiz** | Yeni class'lar tutarlı, eski `.tt-title` kaldırıldı |
| **Performans** | Tooltip açılış süresi hissedilir değişmedi |

---

## BÖLÜM 8 — REFERANS: MEVCUT VERİ YAPILARI

Bu bölüm, tooltip içerik üreticilerinin erişebileceği tüm veri kaynaklarını listeler.

### 8.1 Ürün Verileri

```
crop: { id, name, tier, seasons[], growthDays, buyPrice, sellPrice, recurringIntervalDays? }
tree: { id, name, tier, seasons[], growthDays, recurringIntervalDays, buyPrice, sellPrice }
item: { name, sellPrice, buyPrice?, emoji }
animalProduct: { name, sellPrice }
craftedProduct: { name, sellPrice }
```

### 8.2 Çarpanlar

```
SEASON_SELL_MULTIPLIER:      { ilkbahar: 1.05, yaz: 1.10, sonbahar: 0.90, kış: 0.80 }
SEASON_BUY_MULTIPLIER:       { ilkbahar: 0.85, yaz: 1.05, sonbahar: 1.10, kış: 1.20 }
SEASON_SAPLING_MULTIPLIER:   { ilkbahar: 1.10, yaz: 0.90, sonbahar: 1.05, kış: 1.15 }
WEATHER_BUY_MULTIPLIER:      { normal: 1.0, yagmurlu: 0.95, kurak: 1.10, firtina: 1.20, gokkusagi: 0.85 }
RARITY_SELL_MULTIPLIER:      { normal: 1, nadir: 1.5, legendary: 3, gizemli: 6 }
```

### 8.3 Hava Durumu

```
weather: { id, name, growthSpeedMultiplier, tradeLossChance, rarityChance: { nadir?, legendary?, gizemli? } }
```

### 8.4 Bina Verileri

```
BUILDING_TYPES[type]: { id, name, animalName, baseCapacity, capacityPerLevel, productId, animalBuyPrice, baseProductionDays, secondaryProductId?, secondaryChance?, fieldBonusCropIds? }
capacityForLevel(type, level) → number
```

### 8.5 Slot Verileri

```
slot: { slotId, unlocked, level, planted: null | { cropId, elapsedSeconds, requiredSeconds, ready, harvestsLeft, maxHarvests } }
FIELD_LEVEL_SPEED_BONUS = 0.02
MAX_FIELD_LEVEL = 25
```

### 8.6 Maliyet Formülleri

```
fieldUpgradeCost(level)      → round(20 * 1.3^level)
orchardUpgradeCost(level)    → round(30 * 1.3^level)
fieldSlotUnlockCost(n)       → round(15 * 1.2^(n-5))
orchardSlotUnlockCost(n)     → round(20 * 1.25^(n-3))
inventorySlotCost(n)         → round(15 * 1.2^(n-5))
marketSlotCost(cat, n)       → round(80 * 2.0^n)
```

---

**TT Pro v1.0 — Plan tamamlandı. Uygulamaya hazır.**
