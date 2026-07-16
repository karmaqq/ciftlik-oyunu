# Tooltip Sistemi — Kapsamlı Teknik Plan

> **Not:** Bu belge, projede daha önce bulunan eski `tt.md` dosyasının yerini tamamen alır. Eski sistemden hiçbir fikir, isimlendirme veya yapı alınmamıştır. Aşağıdaki plan, mevcut kod tabanı (Electron değil, vanilla JS + HTML + CSS, `js/ui/*`, `js/systems/*`, `js/data/*`) baştan sona incelenerek sıfırdan tasarlanmıştır.

---

## 0. Tespit Edilen Kritik Ön-Koşul Hatası (Faz 0 — tooltip'ten önce düzeltilmeli)

Fiyatları **doğru** göstermek tooltip'in en kritik şartı. Kod incelemesinde çarpanların doğru yansımasını engelleyen bir hata bulundu:

`js/systems/calendarTrade.js` içinde hem `getCalendarBuyMultiplier()` hem `getCalendarSellMultiplier()` fonksiyonları, **çarpanın kendisini** `Math.round()` ile tam sayıya yuvarlıyor:

```js
return Math.round(multiplier); // 0.85, 1.05, 1.10 gibi tüm değerler -> 1'e yuvarlanıyor
```

Sonuç: mevsim/hava kaynaklı satış-alım çarpanları (`SEASON_SELL_MULTIPLIER`, `SEASON_BUY_MULTIPLIER`, `SEASON_SAPLING_MULTIPLIER`, `WEATHER_RARITY_BONUS`) neredeyse her zaman fiilen **1.0** olarak uygulanıyor — tasarlanan %5/%10/%20 etkiler pratikte hiç çalışmıyor. Bu haliyle tooltip "doğru" çarpanı gösterse bile oyuncuya anlamsız gelecek (her zaman %0 etki).

**Faz 0 aksiyonu:** `Math.round(multiplier)` satırlarını kaldırıp çarpanı olduğu gibi (yuvarlamadan) döndürmek — yuvarlama yalnızca nihai fiyata (`Math.round(actualPrice * qty * calendarSellMult)` zaten `sellItem()` içinde yapılıyor) uygulanmalı. Bu, tooltip'in "doğru yüzdeleri" gösterebilmesinin ön koşuludur. Tooltip sistemiyle birlikte bu iki satır düzeltilecek.

---

## 1. Mimari Genel Bakış

### 1.1 Neden tek, global, DOM-dışı bir tooltip motoru gerekli?

`js/ui/index.js` → `render()` fonksiyonu, her aksiyonda (satın alma, satış, ekim, vb.) ilgili panelin `innerHTML`'ini **tamamen** yeniden yazıyor (`marketHTML()`, `renderInventory()`, `renderUpgrades()`, `fieldGridHTML()`...). Bu yüzden:

- Elemente doğrudan bağlanan `mouseenter`/`mouseleave` listener'ları her render'da kaybolur.
- Var olan `hoveredMarketBtn` gibi noktasal çözümler (bkz. `js/ui/shared.js`) her buton türü için ayrı state gerektirir — ölçeklenmez.
- Proje zaten olay delegasyonu kullanıyor (`events.js` içindeki `mouseover`/`mouseout` on container). Tooltip sistemi de **aynı deseni** izlemeli: container'lara **bir kere** bağlanan delegasyon dinleyicileri.

Bu nedenle tooltip; render döngüsünden bağımsız, **tek bir global modül** (`js/ui/tooltip.js`) olarak kurulacak. Elemanler tooltip içeriğini kendileri taşımaz (statik HTML string gömülmez) — yalnızca `data-tt="<tip>"` ve gerekli `data-tt-*` parametrelerini taşır. İçerik, hover anında **canlı state**'ten hesaplanır. Bu hem "anlık güncellenen" şartını hem de yeniden render sonrası kaybolmama şartını sağlar.

### 1.2 Yeni dosyalar

| Dosya | Görev |
|---|---|
| `js/ui/tooltip.js` | Motor: konumlandırma, açma/kapama, canlı güncelleme, Z tuşu modu, delegasyon kurulumu |
| `js/ui/tooltipContent.js` | İçerik üreticileri: her `data-tt` tipi için `{ title, rows, footer }` üreten saf fonksiyonlar |
| `css/tooltip.css` | Görsel stil (mevcut `--bg-elevated`, `--border-*`, `--accent` gibi CSS değişkenleriyle tam uyumlu) |

`index.html` içine `css/tooltip.css` eklenecek, `js/ui/index.js` içinden `initTooltip()` çağrılacak (diğer `init*` fonksiyonlarıyla aynı yerde, `wireStaticEvents` çağrısının hemen yanında).

### 1.3 Genel akış

```
initTooltip()
  → tek bir <div id="tt-root"> body'e eklenir (position: fixed)
  → document üzerine tek seferlik "mouseover" / "mouseout" / "focusin" / "focusout" delegasyonu
  → e.target.closest("[data-tt]") ile tetikleyici bulunur
  → showTooltip(el) çağrılır
      → resolve(el.dataset) → tooltipContent.js'teki ilgili builder çalışır → { title, rows, footer }
      → render(html) → tt-root içine yazılır
      → position(el, tt-root) → sol-alt / sağ-alt mantığı uygulanır
  → tetikleyici hâlâ hover'daysa, güncelleme döngüsü (bkz. §4) içerik + pozisyonu tazeler
  → mouseout / focusout / scroll(başka konteynerde) / ilgili element DOM'dan silinirse → hideTooltip()
```

---

## 2. Tetikleyici İşaretleme Sistemi (`data-tt-*`)

Her tooltip gösterecek eleman şu attribute'ları taşır:

- `data-tt="<type>"` — içerik tipini belirler (aşağıda tam liste, §6).
- `data-tt-*` — o tipe özel parametreler (itemId, listingIndex, slotKind, vb.). Statik string'ler render anında, kod içinden template literal ile basılır — **tooltip HTML'i değil, sadece referans kimlikleri**.

Örnek (market satır butonu):
```html
<button class="mr-btn" data-action="buyOne" data-index="3"
        data-tt="marketBuy" data-tt-index="3">1x</button>
```

Bu sayede `tooltipContent.js`, hover anında `ctx.state.market.listings[3]`'ü **taze** okur — fiyat, kalan adet, market yenilenmiş olsa bile her zaman güncel.

`data-tt` bulunmayan hiçbir eleman tooltip tetiklemez; bu da yanlışlıkla her yere tooltip binmesini engeller.

---

## 3. Konumlandırma Algoritması ("akıllı pozisyon")

**Varsayılan davranış:** Tooltip'in **sol-üst köşesi**, tetikleyici elemanın **sol-alt köşesine** hizalanır (yani tooltip elemanın altında, sol kenarından başlayarak sağa doğru açılır) — kullanıcının istediği "sol altından başlasın" ifadesi budur.

```
triggerRect = el.getBoundingClientRect()
ttW, ttH   = tt-root ölçüleri (önce görünmez şekilde render edilip ölçülür)
GAP = 8px  // elemanla tooltip arası boşluk

// 1) Varsayılan: sol-alt köşeden başla, sağa doğru büyü
x = triggerRect.left
y = triggerRect.bottom + GAP
anchor = "bottom-left"

// 2) Sağ taşma kontrolü → sağ-alt köşeden başlat, sola doğru büyüsün
if (x + ttW > window.innerWidth - VIEWPORT_PAD) {
  x = triggerRect.right - ttW
  anchor = "bottom-right"
}

// 3) Sol taşma kontrolü (çok dar ekran / sol kenara yakın öğe) → viewport içine kelepçele
if (x < VIEWPORT_PAD) x = VIEWPORT_PAD

// 4) Alt taşma kontrolü → elemanın ÜSTÜNE çevir
if (y + ttH > window.innerHeight - VIEWPORT_PAD) {
  y = triggerRect.top - ttH - GAP
  anchor += " flip-top"
}

// 5) Üst taşma kontrolü (üste de sığmıyorsa) → viewport'a kelepçele, elemanı hafifçe kapat
if (y < VIEWPORT_PAD) y = VIEWPORT_PAD
```

`VIEWPORT_PAD = 10px`. `anchor` sınıfı (`bottom-left` / `bottom-right` / `... flip-top`) kök elemana class olarak eklenir; CSS'te ok/köşe (opsiyonel küçük "beak" — istenirse eklenir, zorunlu değil) bu sınıfa göre yönlenir.

Bu hesap **her açılışta** ve **her `updateLoop` tick'inde** (bkz. §4) tekrar koşar; çünkü sayfa scroll edilebilir alanlara sahip (envanter grid, yetenek ağacı) ve tetikleyici elemanın ekrandaki konumu kayabilir.

### 3.1 Ölçüm tekniği (flicker önleme)
Tooltip önce `visibility:hidden; position:fixed; left:-9999px` ile DOM'a yazılır, `getBoundingClientRect()` ile `ttW/ttH` alınır, konum hesaplanır, sonra `visibility:visible` + doğru `left/top` **aynı frame'de** (bir `requestAnimationFrame` içinde) uygulanır. Böylece kullanıcı geçici yanlış pozisyon "sıçraması" görmez.

---

## 4. Canlı Güncelleme ("anlık güncellenen")

İki güncelleme kanalı var:

1. **İçerik güncellemesi** — tooltip açıkken oyunun kendi tick döngüsü (`tickUpdate()`, `main.js`) zaten periyodik çalışıyor. `tooltip.js`, `tickUpdate` içine eklenecek tek satırlık bir kancayla (`refreshOpenTooltip()`) her tick'te açık tooltip'in içeriğini **yeniden hesaplar** (aynı `data-tt-*` ile builder'ı tekrar çağırır) ve yalnızca değişen değerleri DOM'da günceller (basit `innerHTML` diff yerine — düşük maliyetli olduğu için doğrudan `innerHTML` yeniden yazımı yeterli, çünkü tooltip içeriği küçük). Bu; büyüme yüzdesi, market sayaç saniyesi, altın yetersizliği durumu gibi şeylerin **hover'dayken** anlık değişmesini sağlar.
2. **Pozisyon güncellemesi** — scroll veya layout kayması ihtimaline karşı `window` üzerinde `scroll` (capture:true, tüm iç scroll konteynerlerini yakalamak için) ve `resize` dinleyicileri pozisyonu yeniden hesaplar. Panel geçişlerinde (`middle-tabs`, `right-tabs` tıklaması) `render()` zaten çağrıldığından, eğer tetikleyici eleman artık DOM'da yoksa (`!document.contains(currentTriggerEl)`) tooltip otomatik kapanır — bu kontrol `refreshOpenTooltip()` içinde her tick'te yapılır.

Ekstra CPU maliyetini sıfıra yakın tutmak için: **tooltip kapalıyken hiçbir güncelleme çalışmaz** — tüm bu mantık yalnızca `activeTriggerEl !== null` iken tetiklenir.

---

## 5. Basit / Detaylı Mod (Z tuşu)

- Varsayılan: **sade mod** — yalnızca isim, güncel satış/alış fiyatı, varsa tek satırlık en önemli not (örn. "Stokta yok", "Kapasite dolu").
- `keydown` (Z) ve `keyup` (Z) global dinleyicisi `tooltip.js` içinde: Z basılıyken `detailMode = true`. Tooltip açıkken Z'ye basılırsa içerik **anında** (aynı frame) detaylı moda geçer; bırakılınca sade moda döner. Basılı tutma davranışı — "basarsam detaylı" ifadesine sadık kalındı (toggle değil, basılı-tutma).
- `detailMode` global bir durum değişkeni olduğundan, hangi tooltip açık olursa olsun aynı davranışı miras alır — her builder fonksiyonu `{ simpleRows, detailRows }` ikisini birden döndürür, motor hangisini basacağına `detailMode`'a göre karar verir.
- Input alanına odaklanmışken (yok bu projede metin inputu, ama ileride olursa) Z tuşu çakışmasın diye `document.activeElement` bir `input/textarea` ise Z kısayolu devre dışı bırakılır.

---

## 6. İçerik Tipleri ve Fiyat Zinciri — Tam Envanter

Aşağıdaki her biri `tooltipContent.js` içinde bir `case` / builder fonksiyonu olacak.

### 6.1 `product` — Tarla/bahçe/envanterdeki bir ürün (satış tooltip'i)

**Nerede kullanılır:** Envanter hücreleri (`js/ui/inventory.js` → `.cell.item`), tarla/bahçe dolu slotları (`js/ui/field.js` → `.slot.ready/.growing`), bina panelindeki depolanmış ürünler (`js/ui/buildings.js` → `.building-product-cell`), hızlı satış bölgesine sürüklenebilir öğeler.

**Parametreler:** `data-tt-item="<itemId>"` (envanterdeki gerçek meta için gerekiyorsa `data-tt-source="inventory"` + itemId zaten envanterde anahtar).

**Fiyat zinciri (kod: `js/data/items.js` `resolveItem`, `js/systems/weather.js`, `js/systems/calendarTrade.js`, `js/systems/market.js` `sellItem`):**

```
1) Taban satış fiyatı      = resolveItem(itemId).sellPrice
                              (crop.sellPrice / tree.sellPrice / ANIMAL_PRODUCTS / CRAFTED_PRODUCTS)
2) Nadirlik çarpanı         = RARITY_SELL_MULTIPLIER[meta.rarity]  (yalnızca envanterdeki ÖRNEK'e özel,
                              hasat anında sabitlenmiş: meta.sellPriceOverride)
                              normal=1x, nadir=1.5x, legendary=3x, gizemli=6x
   -> Ara sonuç = meta.sellPriceOverride ?? tabanFiyat
3) Takvim Ticaret satış çarpanı (yalnızca state.features.calendar açıksa; getCalendarSellMultiplier)
   3a) Mevsim çarpanı        SEASON_SELL_MULTIPLIER[mevsim]  (ilkbahar 1.05 / yaz 1.10 / sonbahar 0.90 / kış 0.80)
   3b) Hava-nadirlik bonusu  yalnızca meta.rarity != "normal" VE hava = gökkuşağı ise ekstra 0.80x
4) Nihai satış fiyatı (birim) = Math.round(AraSonuç × 3a × 3b)
```

**Sade görünüm satırları:**
- Başlık: emoji + isim (+ nadirlik varsa renkli etiket: nadir=`--rarity-nadir`, legendary=`--rarity-legendary`, gizemli=`--rarity-gizemli`)
- `Satış fiyatı: N 🪙` (birim)
- Envanterde X adet varsa: `Toplam: N×X 🪙`

**Detaylı görünüm (Z basılı) — çarpan zinciri satır satır:**
```
Taban fiyat        12 🪙
Nadirlik (Nadir)    +50%     (yeşil, çünkü >0)
Mevsim (Yaz)        +10%     (yeşil)
Hava (Gökkuşağı)    -20%     (kırmızı, sadece nadir+ ürünlerde ve hava gökkuşağıysa satırı göster)
──────────────────────────
Satış fiyatı        19 🪙
```
Not: yalnızca `state.features.calendar` kapalıyken 3a/3b satırları **hiç gösterilmez** (çarpan uygulanmıyor zaten) — gereksiz "  %0" satırları eklenmeyecek, kullanıcı "çok karmaşık olmamalı" dedi.
Tier bilgisi asla gösterilmez (kullanıcı isteği).

### 6.2 `marketBuy` — Market listesindeki "1x" ve toplu "Nx" alım butonları

**Nerede:** `js/ui/market.js` satır butonları (`data-action="buyOne"|"buyAll"`).
**Parametreler:** `data-tt-index`, `data-tt-mode="single|bulk"`.

**Fiyat zinciri (alış tarafı, kod: `js/systems/market.js` `generateMarketCycle`, `getCalendarBuyMultiplier`):**
```
1) Taban fiyat        = listing.basePrice          (crop.buyPrice / tree.buyPrice / hayvan sabit fiyatı)
2) Market rastgele çarpanı (rollPriceMultiplier)    — o an sabitlenmiş listing.priceMultiplier içinde saklı
   (bedava %2 / çok pahalı %3 / indirimli %35 (0.01-0.99x) / zamlı %35 (1.01-1.99x) / aynı %25)
3) Takvim Ticaret alış çarpanı (yalnızca calendar açıksa) — mevsim + hava (bkz. Faz 0 düzeltmesi sonrası gerçek yüzdeler)
4) Birim fiyat = listing.pricePerUnit (zaten hesaplı, state'te duruyor)
5) (bulk modunda) toplu indirim  = %BULK_DISCOUNT (10%)  → totalCost = round(pricePerUnit × kalan × 0.90)
```

**Sade:**
- `single`: `Birim fiyat: N 🪙`
- `bulk`: `X adet: N 🪙  (%10 indirimli)` — indirim yüzdesi yeşil.

**Detaylı:**
```
Taban fiyat          10 🪙
Piyasa dalgalanması   -35%    (kırmızı/yeşil, işaretsiz — yalnız yön rengi)
Mevsim (İlkbahar)      -15%    (calendar açıksa)
Hava (Kurak)           +10%    (calendar açıksa)
──────────────────────
Birim fiyat            6 🪙
[bulk ise ek satır] Toplu indirim  -10%
Toplam (X adet)        Y 🪙
```
Hayvan satırlarında (buildingType var) mevsim satırı hiç gösterilmez (kod: hayvanlar mevsimden etkilenmiyor — `MARKET_ANIMALS` yorumu: "Hayvanlar mevsimden etkilenmez").

### 6.3 `calendarInfo` — Header'daki mevsim/hava bilgi alanı

**Nerede:** `js/ui/header.js` → `.hdr-time-info` span'i (yalnızca `state.features.calendar` açıkken zaten render ediliyor).
**İçerik kaynağı:** `getCalendarTradeInfo(state)` — zaten hazır bir özet obje döndürüyor.

**Sade:** `Mevsim: Yaz ☀️  ·  Hava: Kurak` + tek cümlelik `seasonEffect`.
**Detaylı:**
```
Mevsim satış etkisi      +10%   (yeşil)
Mevsim alış (tohum)      +5%
Mevsim alış (fidan)      -10%
Hava alış etkisi (genel) +10%
Hava nadir-satış bonusu  -20%  (yalnızca hava gökkuşağıysa satır var)
```
Yalnızca gerçekten uygulanan (sıfırdan farklı) satırlar gösterilir.

### 6.4 `marketSlotEmpty` / kilitli market yuvası — kapsam dışı (market'te boş satır yok, listings hep dolu ya da "tükendi"), bu yüzden `mr-soldout` etiketine kısa tooltip: "Bu ürün tükendi, market {kalan saniye}s sonra yenilenecek." (canlı sayaç — her tick güncellenir).

### 6.5 `emptySlot` — Tarla/bahçede boş dikilebilir slot

**Nerede:** `js/ui/field.js` → `.slot.empty-plantable`.
**İçerik:** "Ekmek için bir tohum sürükleyin" gibi tek satır yardım metni + slot seviyesi varsa hız bonusu: `Hız bonusu: +N%` (yeşil, `FIELD_LEVEL_SPEED_BONUS * slot.level`).

### 6.6 `lockedSlot` — Kilitli tarla/bahçe slotu

**Nerede:** `.slot.locked`.
**İçerik:** `Açma maliyeti: N 🪙` + (yetersizse) kırmızı `Yetersiz altın` notu; detaylı modda kilit açma formülü: `taban 15 🪙 × 1.2^açık_sayısı` gibi kısa açıklama (opsiyonel, tek satır).

### 6.7 `growingSlot` — Büyümekte olan bitki

**Nerede:** `.slot.growing`.
**İçerik (canlı, her tick güncellenir):**
```
🌾 Buğday
İlerleme: %62
Kalan süre: 0dk 48sn      ← requiredSeconds - elapsedSeconds, saniyeye çevrilip mm:ss
Büyüme hızı: ×1.35 (Seviye 2 + Yağmurlu hava)
```
Detaylı modda hız çarpanı kırılımı:
```
Slot seviyesi        +15%   (yeşil, FIELD_LEVEL_SPEED_BONUS × level)
Hava (Yağmurlu)      +15%
──────────────
Toplam hız           ×1.32
```

### 6.8 `readySlot` — Hasada hazır slot
`Hasat için tıkla` + hasat edilince olası nadirlik şansları (mevcut hava durumunun `rarityChance` tablosu — kod: `WEATHER_TYPES[weather].rarityChance`). Sade: sadece "Hasada hazır". Detaylı: hava bazlı nadirlik ihtimalleri listelenir (`%5 Nadir` gibi, nötr renk — bunlar şans, +/- değil).

### 6.9 `upgradeNode` — Yetenek ağacı düğümleri (Envanter/Tarla/Bahçe/Market yuvası/Bina geliştirme)

**Nerede:** `js/ui/upgrades.js` → `renderNode()` ürettiği `.skill-node` elemanları.
**İçerik:** başlık + açıklama (zaten `hint` alanında var) + `Maliyet: N 🪙` + `Mevcut: X / Max: Y` + kilitliyse kırmızı `Önce {lockedBy} gerekli`.
Bina geliştirme düğümlerinde ek olarak yeni seviyede kapasite artışı: `Yeni kapasite: X → Y` (yeşil fark).

### 6.10 `featureNode` — Tek seferlik özellik satın alma (Takvim, Hızlı Satış, Bahçe, Kovan/Kümes/Ahır)
`FEATURE_DESCRIPTIONS[featureId]` zaten var — direkt kullan. + `Maliyet: N 🪙`. Sahipse `Satın alındı`.

### 6.11 `bulkDiscount` — Market alt bilgi çubuğu (`.market-info`)
Kısa: `Tüm kalan stoğu tek seferde %10 indirimli alırsın.`

### 6.12 `quickSellZone` — Hızlı satış bölgesi
Aktif moda göre (`quickSellMode`): `single` → "Sürüklenen üründen 1 adet satar", `bulk` → "Sürüklenen ürünün tamamını satar". Ek not: hava kaynaklı ticaret kaybı riski varsa (`tradeLossChance > 0`) kırmızı uyarı: `Bu havada %N ihtimalle ürün kaybolur.`

### 6.13 `craftRecipe` — Üretim/tarif kartları (`js/ui/crafting.js`, henüz görülmedi ama `RECIPES` yapısına göre aynı desen)
Girdi listesi (envanterde yeterli/yetersiz miktar yeşil/kırmızı renkte) + çıktı satış fiyatı (taban × `TIER_MULTIPLIER`, `js/data/items.js` `craftedSellPrice`'taki mantığın aynısı okunarak) + `Kaç kez üretilebilir` (mevcut girdi stoklarına göre min oran).

### 6.14 `buildingCapacity` — Bina paneli üst bilgisi (`.building-panel-info`)
`Kapasite: X/Y`, doluysa kırmızı `Kapasite dolu`, üretim döngüsü bilgisi.

### 6.15 `inventoryFilter` / `inventorySort` butonları
Kısa açıklama: hangi filtrenin ne gösterdiği, `hamburger-btn` için `Değere göre sırala` / `İsme göre sırala` (aktif duruma göre metin değişir).

---

## 7. Renk Kuralları — Tek Yerden Yönetim

`tooltipContent.js` içinde tek bir yardımcı:

```js
function signedPercent(value) {
  // value: -1 = -%100, 0.5 = +%50
  const pct = Math.round(value * 100);
  if (pct === 0) return `<span class="tt-neutral">%0</span>`;
  const cls = pct > 0 ? "tt-positive" : "tt-negative";
  return `<span class="${cls}">%${Math.abs(pct)}</span>`;   // işaretsiz, yalnız renkle ayırt edilir
}
```

CSS:
```css
.tt-positive { color: #4ade80; }  /* yeşil, mevcut palete uygun ton */
.tt-negative { color: var(--danger); }  /* zaten tanımlı kırmızı */
.tt-neutral  { color: var(--text-secondary); }
```
Sayılar için de aynı mantık (`+N` yerine yeşil `N`, `-N` yerine kırmızı `N` — işaret karakteri yazılmaz, sadece renk taşır). "Gereksiz + - kullanımından kaçınılmalı" talebine birebir uyulur: yüzdeler `%50` biçiminde (± yok), fark değerleri `12 🪙` biçiminde (± yok), yön yalnızca renkle anlaşılır.

Nadirlik renkleri zaten `--rarity-nadir/--rarity-legendary/--rarity-gizemli` olarak mevcut, tooltip bunları aynen kullanır (yeni renk icat edilmez).

---

## 8. Emoji Kısıtlaması

Tooltip HTML üretiminde **yalnızca** iki emoji ailesi kullanılabilir:
- Mevsim emojisi: mevcut `seasonEmoji()` (`js/ui/shared.js`) — 🌸☀️🍂❄️
- Altın emojisi: 🪙

Diğer her yerde (ürün ikonları, hava ikonları, kilit simgeleri vb.) emoji **kullanılmaz** — mevcut projede `itemEmoji()` çoğu yerde zaten kullanılıyor olsa da, bu **tooltip içeriğine özel** bir kısıtlama; tooltip'ler sade metin + yukarıdaki iki emoji ailesiyle sınırlı kalacak. (Var olan buton/hücre emojileri projede kalmaya devam eder, bu kısıtlama yalnızca yeni tooltip içeriği için geçerlidir.)

---

## 9. Görsel Tasarım (CSS)

`css/tooltip.css` — mevcut değişken sistemiyle birebir uyumlu:

```css
#tt-root {
  position: fixed;
  z-index: 999; /* mevcut en yüksek z-index olan --z-log:50'nin üstünde, yeni bir --z-tooltip: 999 tanımlanacak base.css'e */
  min-width: 180px;
  max-width: 280px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-xs);
  color: var(--text-primary);
  pointer-events: none;      /* tooltip fare olaylarını yutmasın, alttaki elemente geçsin */
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
#tt-root.visible { opacity: 1; transform: translateY(0); }

.tt-title { font-weight: 700; margin-bottom: var(--space-xs); color: var(--text-primary); }
.tt-row { display: flex; justify-content: space-between; gap: var(--space-md); padding: 1px 0; }
.tt-row-label { color: var(--text-secondary); }
.tt-divider { height: 1px; background: var(--border-subtle); margin: var(--space-xs) 0; }
.tt-footer { margin-top: var(--space-xs); color: var(--text-muted); font-size: 12px; }
```
`base.css`'e eklenecek tek yeni değişken: `--z-tooltip: 999;` (mevcut `--z-log: 50`'nin belirgin şekilde üstünde, çünkü log panelinin üstünde de gösterilebilmeli).

Basit ↔ detaylı geçişte animasyon: yükseklik değişimi `max-height` + `transition` ile yumuşatılabilir (opsiyonel incelik, zorunlu değil — öncelik doğruluk ve performans).

---

## 10. Performans ve Sağlamlık Kuralları

1. **Tek DOM elemanı** (`#tt-root`) — her hover'da yeni eleman yaratılmaz, içerik `innerHTML` ile değiştirilir.
2. **Delegasyon** — `mouseover`/`mouseout` yalnızca birkaç sabit konteynere (`#middle-content`, `#right-panel`, `#inventory-grid`, `#building-content`, `#header`) bağlanır; `document`'e değil (gereksiz genel yakalamadan kaçınmak için, ama `mousemove` tabanlı bir yaklaşım yerine bu zaten hafif).
3. **`mousemove` KULLANILMAZ** — pozisyon fareyi takip etmez, **anchor elemana** göre hesaplanır (kullanıcının "sol altından başlasın" talebiyle birebir uyumlu ve çok daha performanslı, sürekli hesap gerektirmez).
4. Güncelleme döngüsü yalnızca tooltip açıkken ve mevcut `tickUpdate()` kadansında çalışır — **ayrı bir `setInterval` açılmaz**, var olan tick'e "kanca" atılır.
5. Dokunmatik cihazlar: `pointerdown` üzerinde açma/kapama (opsiyonel genişletme notu — mevcut proje hover odaklı masaüstü tasarımı olduğundan V1 kapsamına alınmadı, ileride `pointerType==="touch"` kontrolüyle eklenebilir).
6. Klavye erişilebilirliği: fokuslanabilir elemanlarda (`button`) `focusin`/`focusout` da aynı `show/hide` akışını tetikler — yalnızca fare değil, Tab ile gezinen kullanıcı da görebilir (ekstra, düşük maliyetli iyileştirme).

---

## 11. Dosya Bazlı Entegrasyon Checklist'i

| Dosya | Değişiklik |
|---|---|
| `index.html` | `<link rel="stylesheet" href="css/tooltip.css">` eklenir |
| `js/ui/tooltip.js` | **YENİ** — motor |
| `js/ui/tooltipContent.js` | **YENİ** — içerik builder'ları |
| `css/tooltip.css` | **YENİ** — stiller |
| `css/base.css` | `--z-tooltip: 999;` değişkeni eklenir |
| `js/systems/calendarTrade.js` | Faz 0 hata düzeltmesi (`Math.round` kaldırılır) |
| `js/ui/index.js` | `initTooltip()` çağrısı `initUI()` içine, `tickUpdate()` içine `refreshOpenTooltip()` kancası |
| `js/ui/market.js` | Satır butonlarına `data-tt="marketBuy"` + index/mode; `.mr-soldout`'a `data-tt="soldOut"`; `.market-info`'ya `data-tt="bulkDiscount"` |
| `js/ui/inventory.js` | `.cell.item`'e `data-tt="product"` + itemId |
| `js/ui/field.js` | `.slot.locked` → `lockedSlot`, `.slot.empty-plantable` → `emptySlot`, `.slot.growing` → `growingSlot`, `.slot.ready` → `readySlot` |
| `js/ui/buildings.js` | `.building-product-cell` → `product`; panel başlığı → `buildingCapacity` |
| `js/ui/upgrades.js` | `.skill-node` (feature ve normal) → `upgradeNode` / `featureNode` |
| `js/ui/header.js` | `.hdr-time-info` → `calendarInfo`; `.hdr-gold-val`'a genel bir "toplam varlık" bilgisi de eklenebilir (opsiyonel) |
| `js/ui/crafting.js` | Tarif kartlarına `data-tt="craftRecipe"` (dosya henüz okunmadıysa Faz 2 başında incelenip aynı desenle bağlanacak) |
| `js/ui/events.js` | Yeni delegasyon eklenmeyecek — tooltip kendi bağımsız dinleyicilerini kurar, mevcut `wireStaticEvents` mantığına dokunulmaz (çakışma riski sıfırlanır) |

---

## 12. Uygulama Fazları

- **Faz 0:** `calendarTrade.js` yuvarlama hatası düzeltmesi (tooltip'in doğru veri gösterebilmesi için ön koşul).
- **Faz 1 — Çekirdek motor:** `tooltip.js` (konumlandırma + göster/gizle + Z modu + tick kancası) ve `tooltip.css`, boş bir `test` tipiyle uçtan uca doğrulama.
- **Faz 2 — Ürün & Market:** `product`, `marketBuy`, `bulkDiscount`, `soldOut` tipleri; en yüksek öncelikli çünkü fiyat doğruluğu ana talep.
- **Faz 3 — Tarla/Bahçe/Bina:** `emptySlot`, `lockedSlot`, `growingSlot`, `readySlot`, `buildingCapacity`.
- **Faz 4 — Geliştirmeler & Takvim:** `upgradeNode`, `featureNode`, `calendarInfo`.
- **Faz 5 — Üretim & Hızlı Satış:** `craftRecipe`, `quickSellZone`, envanter filtre/sıralama butonları.
- **Faz 6 — Cila:** animasyon inceltme, odak/erişilebilirlik testleri, uç durum taraması (çok küçük ekran, çok uzun ürün adı, aynı anda iki panel açıkken hızlı hover geçişleri).

Her faz kendi içinde bağımsız test edilebilir ve önceki fazları bozmaz çünkü tüm tipler tek bir `switch` içinde birbirinden izole.

---

## 13. Uç Durumlar (Edge Cases) — Tasarımda Ele Alınanlar

- Market yenilendiğinde (`listing` indexleri kayabilir) açık tooltip'in `index`'i artık başka bir ürünü gösterebilir → `refreshOpenTooltip()` her tick'te `data-tt-*` üzerinden **yeniden okuduğu için** otomatik doğru ürüne geçer; yanlış/eski veri göstermez.
- Tetikleyici eleman satışla/hasatla DOM'dan silinirse (`sold-out`, slot boşalması) → `document.contains(triggerEl)` kontrolü tooltip'i kapatır.
- Aynı anda iki eleman üstünde hızlı hover gezintisi → her `mouseover`, önceki tooltip'i **anında** yeni içerikle değiştirir (kapat-aç yerine tek geçiş, titreşim olmaz).
- Çok uzun ürün adı / çok sayıda çarpan satırı → `max-width: 280px` + `word-break` ile taşma engellenir, dikey taşmada §3 flip-top mantığı zaten devrede.
- `state.features.calendar` kapalıyken tüm mevsim/hava satırları **tamamen gizlenir**, "sadeliği" bozacak boş/anlamsız satır kalmaz.

---

## 14. Özet — Kullanıcı Gereksinimleri ↔ Plan Eşlemesi

| İstenen | Karşılığı |
|---|---|
| Anlık güncellenen | §4 — tick kancalı canlı içerik + pozisyon yenileme |
| Akıllı pozisyon, sol-alt varsayılan, taşarsa sağ-alt | §3 — tam algoritma |
| Tüm ürün/buton hover tooltip'i | §6 — 15 içerik tipi, §11 — dosya bazlı bağlama |
| Doğru satış fiyatı + tüm çarpanlar doğru renk/yüzde | §6.1/6.2, §7, Faz 0 hata düzeltmesi |
| Sade varsayılan, Z ile detaylı | §5 |
| Tier bilgisi yok | §6.1 notu, hiçbir builder tier basmaz |
| Market/takvim/boş slot/geliştirme/satın alma/adet/toplu alım tooltip'i | §6.2–6.15 |
| Emoji yok (mevsim + 🪙 hariç) | §8 |
| Pozitif yeşil / negatif kırmızı, +/- işaretsiz | §7 |
| Karmaşık olmayan yapı | Tek motor + tek içerik dosyası, mevcut render döngüsüne dokunmadan bağımsız çalışan delegasyon |