# OPTIMIZATIONS.md — ciftlik-oyunu (karmaqq/ciftlik-oyunu) Optimizasyon Denetimi

> İncelenen commit: `master` (repo boyutu ~4.750 satır JS/CSS, ana ağırlık `js/ui.js` — 1295 satır).
> Bu doküman **sadece analiz ve öneri** içerir; hiçbir dosya değiştirilmedi.

---

## 1) Optimizasyon Özeti

**Genel durum:** Oyun mantığı (state.js, systems/\*) hafif ve verimli — 25-34 slotluk döngüler saniyede bir çalışıyor, bu kısımda kasmaya yol açacak bir şey yok. **Asıl sorun render/DOM katmanında.** `ui.js` içindeki `render()` fonksiyonu her saniyede bir (ve her kullanıcı etkileşiminde bir kez daha) **tüm ekranı** (`innerHTML` ile) baştan inşa ediyor; buna ek olarak her render sonunda tüm etiketler üzerinde senkron layout-okuma (`scrollWidth`) yapılıyor. Bu üç şey birleşince "kasma" hissi doğrudan açıklanabiliyor:

1. `setInterval(..., 1000)` içindeki `render()` → header, envanter (25 hücre), tarla/bahçe grid'i (25/9 slot), sağ panel (market/üretim/görev/geliştirme) **her saniye** komple `innerHTML` ile yeniden yazılıyor; tooltip Map'i, `data-tooltip` ID'leri ve DOM elemanları da her saniye sıfırdan üretiliyor.
2. `render()` sonunda çalışan `checkLabelOverflow()`, `document.querySelectorAll(".label, .slot-name")` ile **DOM'daki tüm etiketleri** dolaşıp her biri için `el.clientWidth` / `text.scrollWidth` okuyor → bu, tarayıcıyı **her saniye zorla layout (reflow) yapmaya** zorluyor (classic layout thrashing), özellikle 25+9+25 = 59+ slotluk grid dolduğunda maliyeti katlanıyor.
3. Her tıklama/sürükle-bırak (ekim, hasat, satış, üretim, market alışverişi, geliştirme) **senkron olarak** `saveGame()` (→ `JSON.stringify(state)` + `localStorage.setItem`) çağırıyor, hemen ardından yine tam `render()` tetikleniyor. Yani her kullanıcı etkileşimi = tam state serileştirme + tam DOM yeniden inşası + zorla reflow, hepsi aynı event handler içinde, senkron.

**En yüksek etkili 3 iyileştirme:**

- `render()`'ı "diff'leyen"/parçalı güncelleme yapan bir yapıya çevirmek (sadece değişen sekme/slotları güncelle) — tahmini en büyük kazanç.
- `checkLabelOverflow()`'u her saniye tüm DOM'da çalıştırmak yerine sadece yeni oluşturulan/değişen etiketlerde ve `ResizeObserver`/CSS ile tetiklemek.
- `saveGame()` çağrısını debounce/throttle etmek (her tıklamada değil, belirli aralıklarla veya `requestIdleCallback` ile arka planda).

**Değişiklik yapılmazsa en büyük risk:** Slot sayısı arttıkça (oyuncu tarla/bahçe/envanter/market slotlarını geliştirdikçe — üst sınır 25+9+25=59 slot + market listeleri) her saniyelik tam re-render ve layout-thrashing maliyeti **doğrusal değil süperlineer** büyür (DOM node sayısı × reflow maliyeti), düşük güçlü cihazlarda (mobil, eski laptop) saniyede belirgin "frame drop" ve giriş gecikmesi (input lag) oluşur; bu tam olarak kullanıcının bildirdiği "kasma" belirtisidir.

---

## 2) Bulgular (Önceliklendirilmiş)

### Bulgu 1 — Tüm oyun ekranı her saniye `innerHTML` ile komple yeniden yazılıyor

- **Kategori:** Frontend / DOM
- **Önem:** Critical
- **Etki:** Kare hızı (jank), giriş gecikmesi, pil/CPU tüketimi
- **Kanıt:** `js/ui.js` `export function render()` (satır 182-198) — `renderHeader()`, `renderInventory()`, `document.getElementById("middle-content").innerHTML = ...`, `renderBuildingTab()`, sağ panel `innerHTML` ataması; bu fonksiyon `js/main.js` içinde `setInterval(..., TICK_MS /* 1000 */)` (satır 97-138) tarafından **her saniye** çağrılıyor.
- **Neden verimsiz:** `innerHTML` ataması, tarayıcının o alt ağacı komple parse edip yeni DOM node'ları oluşturmasını, eskilerini yok etmesini ve stil/layout'u yeniden hesaplamasını gerektirir. Sadece altın miktarı veya bir slotun büyüme yüzdesi değişmiş olsa bile 25 envanter hücresi, 25 tarla/9 bahçe slotu, market satırları vb. **hepsi** yeniden oluşturulup DOM'a basılıyor. Ayrıca her render'da `data-tooltip` ID'leri (`window._ttNextId()`) yeniden üretildiği için (satır 183: `window._ttStore.clear()`), event listener'lar (drag/drop, hover) her seferinde kaybolup event delegation üzerinden yeniden bağlanıyor (bu kısmı delegation ile çözülmüş, iyi; ama DOM node'larının kendisi hâlâ atılıp yeniden yaratılıyor).
- **Önerilen düzeltme:** Her tab/panel için "hedefli güncelleme" fonksiyonları yazın: sadece değişen değer varsa ilgili DOM node'unun `textContent`/`style` özelliğini güncelleyin (örn. `progress-fill` genişliği, `qty` span'i, altın sayacı). Slot grid'leri için node'ları bir kere oluşturup referanslarını saklayan (ör. `Map<slotIndex, HTMLElement>`) bir yapıya geçin; her tick'te sadece `pct`, `ready` durumu, `qty` gibi alanları güncelleyin, node'u yok edip yeniden yaratmayın. Alternatif olarak hafif bir vDOM/diffing kütüphanesi (örn. morphdom, lit-html) `innerHTML` yerine kullanılabilir — bu "fonksiyon mantığını" değiştirmeden sadece DOM yazma katmanını değiştirir.
- **Riskler/Ödünler:** Hedefli güncelleme kodu, `innerHTML` şablonlarına göre daha fazla kod satırı ve dikkatli state-diff mantığı gerektirir; hata payı biraz artar (unutulan alan güncellenmeyebilir). morphdom gibi bir kütüphane eklemek bundle boyutunu büyütür ama CPU/DOM maliyetini büyük ölçüde azaltır.
- **Beklenen etki tahmini:** Yüksek — saniyelik DOM re-yaratım maliyeti kalktığında ana thread bloklanması muhtemelen %70-90 azalır (slot sayısı arttıkça kazanç da artar).
- **Kaldırma Güvenliği:** Needs Verification (mantık değişmiyor, sadece render stratejisi; dikkatli test gerekir)
- **Yeniden Kullanım Kapsamı:** service-wide (tüm `ui.js`)

---

### Bulgu 2 — `checkLabelOverflow()` her render'da tüm DOM'u tarayıp zorla reflow yapıyor

- **Kategori:** Frontend / DOM (layout thrashing)
- **Önem:** Critical
- **Etki:** Kare hızı, ana thread bloklanması
- **Kanıt:** `js/ui.js` satır 200-213:
  ```js
  function checkLabelOverflow() {
    document.querySelectorAll(".label, .slot-name").forEach((el) => {
      const text = el.querySelector(".label-text");
      if (!text) return;
      el.classList.remove("is-overflow");
      if (text.scrollWidth > el.clientWidth + 2) { ... }
    });
  }
  ```
  `render()` fonksiyonunun son satırında (satır 197) her saniye çağrılıyor.
- **Neden verimsiz:** `scrollWidth`/`clientWidth` okumaları, tarayıcının o ana kadar biriken tüm stil/layout değişikliklerini **senkron olarak** hesaplamasını (forced synchronous layout) zorunlu kılar. Üstelik döngü içinde önce `classList.remove` (yazma) sonra `scrollWidth` (okuma) yapılıyor — bu **read-after-write** deseni, tarayıcının layout cache'ini her elemanda geçersiz kılıp yeniden hesaplattırıyor (klasik layout thrashing). Envanter (25) + tarla/bahçe (34) + market/üretim satırları toplamda düzinelerce `.label`/`.slot-name` elemanı olduğunda bu, saniyede bir çalışan gerçek bir "stutter" kaynağıdır. Üstelik Bulgu 1 nedeniyle bu elemanlar zaten her saniye yeniden yaratıldığından, overflow durumu genelde **değişmemiş olsa bile** yeniden hesaplanıyor.
- **Önerilen düzeltme:** (a) Önce tüm okumaları (`scrollWidth`, `clientWidth`) bir döngüde toplayın, sonra tüm yazmaları (`classList`, `style.setProperty`) ayrı bir döngüde yapın (read/write ayrımı — batch layout). (b) Daha iyisi: Bu kontrolü sadece **yeni oluşturulan veya boyutu değişen** etiketlerde çalıştırın (Bulgu 1 çözülünce zaten sadece değişen node'lar için tetiklenir). (c) En iyisi: JS ile ölçüm yerine saf CSS ile taşan metin marquee'sini `overflow` medya sorgusu / `text-overflow` + `:hover` ile tetiklemek, ya da `ResizeObserver` kullanarak sadece boyutu gerçekten değişen elemanlarda ölçüm yapmak.
- **Riskler/Ödünler:** CSS-only çözüme geçilirse marquee hızı/mesafesi (`--scroll-dist`, `--scroll-dur`) dinamik hesaplanamayabilir; sabit bir hız/mesafe ile görsel kalite hafif düşebilir. Read/write ayrımı düşük riskli, davranış değişmez.
- **Beklenen etki tahmini:** Yüksek — bu tek başına saniyelik "forced reflow" maliyetini ortadan kaldırır; Chrome DevTools Performance sekmesinde "Layout" olarak görünen mor bloklar büyük ölçüde küçülür/kaybolur.
- **Kaldırma Güvenliği:** Likely Safe (görsel davranış korunarak refactor edilebilir)
- **Yeniden Kullanım Kapsamı:** module (`ui.js` render döngüsü)

---

### Bulgu 3 — Her kullanıcı etkileşimi senkron `JSON.stringify` + `localStorage.setItem` tetikliyor

- **Kategori:** I/O / Reliability
- **Önem:** High
- **Etki:** Tıklama sonrası gecikme (input latency), ana thread bloklanması
- **Kanıt:** `js/ui.js` — `handlePlotClick` (satır 1139-1170), `handlePlotDrop` (1172-1193), `handleRightPanelAction` (1195-1250) fonksiyonlarının hepsi işlem sonunda `saveGame(ctx.state); render();` çağırıyor. `saveGame` (`js/systems/save.js` satır 42-51) her çağrıda `JSON.stringify(state)` (tüm state ağacı: field, orchard, inventory, market, quests, recipes, hints...) + `localStorage.setItem` yapıyor. Ayrıca `main.js` satır 97-138'deki tick de her saniye `render()` çağırıyor ama `saveGame`'i çağırmıyor (o kısım iyi); asıl sorun kullanıcı etkileşimlerinde.
- **Neden verimsiz:** `localStorage.setItem` senkron bir disk/işletim sistemi çağrısıdır ve büyük JSON string'lerde (özellikle market listing'leri, quest verileri, tüm 25+9+25 slot state'i büyüdükçe) birkaç milisaniye sürebilir; bu, event handler içinde **DOM re-render'ından hemen önce** çalıştığı için kullanıcı her tıkladığında (ekim, hasat, satış, market alımı, üretim, geliştirme) ek bir senkron blok oluşturuyor. Oyuncu hızlı art arda hasat/satış yaptığında (yaygın bir "farming" oyunu davranışı) bu, birikimli olarak fark edilir bir gecikmeye dönüşür.
- **Önerilen düzeltme:** `saveGame` çağrısını debounce edin (örn. son işlemden 500ms-1sn sonra tek seferde kaydet) veya `requestIdleCallback`/mikro-task ile ana thread'i bloklamayacak şekilde erteleyin. Zaten 30 saniyede bir otomatik kayıt (`AUTO_SAVE_INTERVAL_MS`) var; kullanıcı eylemlerinde "dirty" flag işaretleyip en yakın autosave veya kısa bir debounce penceresinde kaydetmek veri kaybı riskini pratikte artırmadan gecikmeyi ortadan kaldırır.
- **Riskler/Ödünler:** Debounce sırasında tarayıcı sekmesi aniden kapatılırsa (crash, sekme kapama) son birkaç saniyelik ilerleme kaybolabilir. Bunu azaltmak için `beforeunload`/`visibilitychange` olayında zorla `saveGame()` çağırmak önerilir (bu bir güvenlik ağı olarak eklenmeli).
- **Beklenen etki tahmini:** Orta-Yüksek — tıklama başına birkaç ms ile onlarca ms arası kazanç (state büyüklüğüne bağlı); hızlı art arda etkileşimlerde hissedilir fark yaratır.
- **Kaldırma Güvenliği:** Needs Verification (veri kaybı riskine karşı `beforeunload` güvenlik ağı eklenmeli)
- **Yeniden Kullanım Kapsamı:** module (`ui.js` event handler'ları + `save.js`)

---

### Bulgu 4 — `render()` her çağrıda tooltip store'unu (`window._ttStore`) tamamen temizleyip yeniden dolduruyor

- **Kategori:** Memory / CPU
- **Önem:** Medium
- **Etki:** Gereksiz string oluşturma/GC baskısı
- **Kanıt:** `js/ui.js` satır 183: `window._ttStore.clear();` — ardından `renderHeader`, `renderInventory`, `fieldGridHTML`/`orchardGridHTML`, `renderBuildingTab`, sağ panel render fonksiyonlarının **hepsi** her çağrıldıklarında `setTooltip(html)` ile (satır 65-69) yeni bir `id` üretip yeni bir HTML string'i Map'e yazıyor — bu tooltip içerikleri (ör. bir tarla slotunun büyüme yüzdesi hariç geri kalan kısmı) çoğu saniyede aslında değişmiyor.
- **Neden verimsiz:** Her saniye onlarca tooltip HTML string'i (`ttTitle`/`ttRow`/`ttDivider` birleşimleri) sıfırdan template-literal ile inşa ediliyor ve bir Map'e yazılıyor, sonra bir öncekiler tamamen atılıyor (GC'ye gidiyor). Bu, Bulgu 1 ile birebir bağlantılı: DOM zaten yeniden yaratıldığı için tooltip ID'lerinin de yeniden üretilmesi "gerekiyor", ama kök neden DOM'un gereksiz yere yeniden yaratılması.
- **Önerilen düzeltme:** Bulgu 1 çözüldüğünde (hedefli DOM güncelleme) bu sorun büyük ölçüde kendiliğinden çözülür — değişmeyen slotların tooltip'i de yeniden üretilmeyecektir. Ayrı bir adım olarak, statik tooltip parçalarını (örn. "Sürükle ve ek" ipucu, sabit ürün açıklamaları) önbelleğe almak/memoize etmek maliyeti daha da azaltır.
- **Riskler/Ödünler:** Düşük risk; sadece string oluşturma sıklığını azaltıyor, davranışı değiştirmiyor.
- **Beklenen etki tahmini:** Düşük-Orta (Bulgu 1'in bir yan etkisi; ayrı çözülürse marjinal, birlikte çözülürse otomatik kazanç)
- **Kaldırma Güvenliği:** Safe
- **Yeniden Kullanım Kapsamı:** module (`ui.js`)

---

### Bulgu 5 — "Ready" (hasada hazır) slotlarda sonsuz döngülü `box-shadow` animasyonu, her saniye yeniden başlıyor

- **Kategori:** Frontend (paint/composite)
- **Önem:** Medium
- **Etki:** GPU/paint maliyeti, görsel süreksizlik
- **Kanıt:** `css/style.css` satır 182 ve 616: `.slot.ready { animation: pulse-ready 2.5s ease-in-out infinite; }`; `@keyframes pulse-ready` (satır 1486-1493) `box-shadow` değerini animasyonluyor. Bu class'lı DOM node'ları Bulgu 1 nedeniyle **her saniye yok edilip yeniden yaratıldığı** için CSS animasyonu her render'da baştan başlıyor (asla 2.5 saniyelik tam döngüsünü tamamlamıyor).
- **Neden verimsiz:** `box-shadow` animasyonu `transform`/`opacity`'nin aksine **paint** gerektirir (compositor-only değildir), bu da her ready slot için her animasyon karesinde ekstra paint maliyeti demektir. Birden fazla slot aynı anda "ready" olduğunda (yaygın bir durum — oyuncu birkaç dakika uzaklaşıp geri döndüğünde) bu maliyet çarpanla büyür. Ayrıca sürekli yeniden başlaması görsel olarak "titreme" hissi de yaratabilir.
- **Önerilen düzeltme:** Mümkünse `box-shadow` yerine `transform: scale()` + sabit/`filter: drop-shadow()` kombinasyonuna geçmek (drop-shadow de paint gerektirir ama genelde box-shadow'dan daha ucuzdur ve GPU'da daha iyi optimize edilir) veya animasyonu `will-change: box-shadow` ile compositor'a işaret etmek. Kök çözüm yine Bulgu 1: node'lar yeniden yaratılmadığı sürece animasyon doğal 2.5s döngüsünde akıcı çalışır.
- **Riskler/Ödünler:** `filter: drop-shadow` bazı eski tarayıcılarda/entegre GPU'larda `box-shadow`'a göre farklı davranabilir; görsel test gerekir.
- **Beklenen etki tahmini:** Düşük-Orta (çok sayıda eşzamanlı "ready" slot olduğunda daha belirgin)
- **Kaldırma Güvenliği:** Likely Safe
- **Yeniden Kullanım Kapsamı:** local file (`style.css`)

---

### Bulgu 6 — `renderInventory()` içinde `getInventoryList` + tam liste yeniden inşası her saniye (envanter değişmese bile)

- **Kategori:** Algorithm / DOM
- **Önem:** Low-Medium
- **Etki:** CPU (küçük ama tekrarlayan)
- **Kanıt:** `js/ui.js` satır 341-392, `render()`'dan her saniye çağrılıyor; `getInventoryList` (`inventory.js` satır 23-55) her çağrıda `Object.entries(...).map(...)` ile yeni dizi oluşturup `.sort()` çalıştırıyor — envanter içeriği değişmemiş olsa bile.
- **Neden verimsiz:** 25 öğeye kadar küçük bir liste için tek başına `sort()` maliyeti önemsizdir, ama Bulgu 1 ile birleştiğinde (her saniye tam `innerHTML` yeniden yazımı + tooltip string'leri) bu, "gereksiz yere sık çalışan ama tek başına ucuz" işlemler kategorisinde — birikimli maliyete katkı sağlıyor.
- **Önerilen düzeltme:** Envanterin "dirty" olup olmadığını izleyen bir flag (`inventoryDirty`) tutup, sadece değiştiğinde (satın alma/satış/hasat/üretim sonrası) yeniden hesaplayın; saniyelik tick'te envanter değişmediyse `renderInventory()`'i atlayın.
- **Riskler/Ödünler:** Dirty-flag mantığı state mutasyonu yapan her yere (crafting, market, field, orchard, buildings) `markInventoryDirty()` çağrısı eklemeyi gerektirir — kapsam biraz genişler, unutulan bir nokta stale UI'a yol açabilir.
- **Beklenen etki tahmini:** Düşük (tek başına), ama Bulgu 1 ile aynı desende olduğu için birlikte çözülmesi mantıklı.
- **Kaldırma Güvenliği:** Needs Verification
- **Yeniden Kullanım Kapsamı:** module (`ui.js`)

---

### Bulgu 7 — `processQueue` içinde `queue.shift()` döngüsü (O(n²) potansiyeli)

- **Kategori:** Algorithm
- **Önem:** Low
- **Etki:** CPU (şu an ihmal edilebilir, büyük kuyruklarda risk)
- **Kanıt:** `js/state.js` satır 125-141: `while (queue.length > 0) { ...; queue.shift(); ... }`.
- **Neden verimsiz:** `Array.prototype.shift()` dizideki tüm kalan elemanları bir index kaydırır (O(n)); döngü içinde tekrarlanırsa teorik olarak O(n²). Envanter dolduğunda kuyruk büyüyebilir (özellikle oyuncu uzun süre AFK kaldığında hayvan/bina üretimleri kuyruğa yığılabilir).
- **Önerilen düzeltme:** Bir okuma imleci (index) kullanıp döngü sonunda `queue.splice(0, consumedCount)` ile tek seferde kesin, ya da bir gerçek kuyruk yapısı (index tabanlı, `shift` çağırmayan) kullanın.
- **Riskler/Ödünler:** Yok, davranış birebir korunur.
- **Beklenen etki tahmini:** Düşük (mevcut oyun ölçeğinde kuyruk küçük kalıyor), ama "likely" — büyük kuyruklarda ölçülmeli.
- **Kaldırma Güvenliği:** Safe
- **Yeniden Kullanım Kapsamı:** local file (`state.js`)

---

### Bulgu 8 — Kod tekrarı: `renderUpgrades()` içinde 3 kez tekrar eden slot-geliştirme bloğu deseni

- **Kategori:** Reuse Opportunity / Maintainability
- **Önem:** Low
- **Etki:** Bakım maliyeti, bug yüzeyi (performans etkisi yok/ihmal edilebilir)
- **Kanıt:** `js/ui.js` satır 401-531: envanter/tarla/bahçe slot geliştirme blokları (satır 433-464) ve tohum/fidan/hayvan market slotu blokları (satır 486-517) neredeyse aynı yapıda 3'er kez elle yazılmış (`renderBuildingUpgradeRow` zaten bina için bu deseni fonksiyona çıkarmış, ama slot geliştirmeleri için aynı soyutlama yapılmamış).
- **Neden verimsiz (bakım açısından):** Aynı mantığın 6 kez kopyalanması, gelecekte bir tooltip metnini veya class mantığını değiştirirken 6 yerin senkron güncellenmesini gerektiriyor — drift riski.
- **Önerilen düzeltme:** `renderBuildingUpgradeRow`'a benzer şekilde `renderSlotUpgradeRow({label, current, max, cost, maxed, action, emoji})` gibi ortak bir fonksiyona çıkarın.
- **Riskler/Ödünler:** Düşük risk, saf refactor.
- **Beklenen etki tahmini:** Performansa etkisi yok; bakım kolaylığı sağlar (istek dışı ama "reuse" kontrol listesi kapsamında not edildi).
- **Kaldırma Güvenliği:** Safe
- **Reuse Scope:** module (`ui.js`)

---

## 3) Hızlı Kazanımlar (Önce Bunları Yap)

1. **`checkLabelOverflow()`'u read/write olarak ikiye ayır** (Bulgu 2) — küçük bir refactor, büyük reflow kazancı.
2. **`saveGame()` çağrılarını debounce et** (Bulgu 3) + `beforeunload`/`visibilitychange` güvenlik ağı ekle — az kod, hissedilir tıklama-gecikmesi kazancı.
3. **`queue.shift()` yerine index/`splice` kullan** (Bulgu 7) — 5 dakikalık değişiklik, ileri riski önler.
4. **`.slot.ready` animasyonunu `will-change` ile işaretle veya `filter: drop-shadow`'a geçir** (Bulgu 5) — tek satırlık CSS denemesi.

## 4) Derinlemesine Optimizasyonlar (Sonra Yap)

1. **`render()`'ı hedefli/parçalı güncellemeye çevir** (Bulgu 1) — en büyük kazanç, en büyük efor. Önerilen yaklaşım: her slot/hücre için oluşturulduktan sonra referansı saklayan bir "component" katmanı (basit obje: `{el, update(data)}`) kurup, tick'te sadece değişen alanları (`progress-fill` genişliği, `qty`, `ready` class'ı) güncellemek. Bu, mevcut fonksiyon imzalarını (`plantSeed`, `harvestSlot` vb.) **değiştirmeden**, sadece `ui.js`'in render stratejisini değiştirerek yapılabilir.
2. **Envanter/market/quest panelleri için "dirty flag" sistemi** (Bulgu 6) — hangi state dilimi değiştiyse sadece o panel yeniden render edilsin.
3. **Tooltip içeriğini memoize et** (Bulgu 4) — statik kısımları önbelleğe al, sadece dinamik sayıları güncelle.
4. **`renderUpgrades()` kod tekrarını ortak fonksiyona çıkar** (Bulgu 8) — bakım kolaylığı.

## 5) Doğrulama Planı

- **Profilleme:** Chrome DevTools → Performance sekmesi → oyunu 10-15 saniye kaydet (en az 2-3 tick geçecek şekilde) → "Layout" (mor) ve "Recalculate Style" (mor) bloklarının süresini ölç. Düzeltme öncesi/sonrası karşılaştır; hedef: saniyelik tick başına ana thread bloklanma süresini belirgin şekilde azaltmak.
- **FPS ölçümü:** DevTools → Rendering → "Frame Rendering Stats" açık şekilde, birkaç tarla/bahçe slotu "ready" durumdayken (animasyonlu) gözlemle; düzeltme sonrası kararlı ~60fps hedeflenmeli.
- **Metrikler (önce/sonra):**
  - Tick başına `render()` çalışma süresi (performance.now() ile `render()` çağrısının başı/sonu ölçülerek).
  - Tıklama → görsel güncelleme arasındaki gecikme (input-to-paint).
  - `saveGame()` çağrı sıklığı ve `JSON.stringify` süresi.
- **Doğruluk (correctness) test senaryoları:**
  - Ekim → büyüme yüzdesi ilerlemesi → hasat akışının UI'da doğru yansıması (özellikle hedefli güncellemeye geçilirse, "stale" DOM riski).
  - Sekmeler arası geçiş (tarla/bahçe, market/üretim/görev/geliştirme) sonrası doğru panelin render edildiğinin kontrolü.
  - Tooltip'lerin (hover) hâlâ doğru içerikle açıldığının kontrolü (Bulgu 4 sonrası memoization ile stale veri riski).
  - Sayfa aniden kapatıldığında (sekme kapama) son ilerlemenin `beforeunload` sayesinde kaybolmadığının kontrolü (Bulgu 3 sonrası).
  - Kuyruk (queue) mantığının büyük kuyruklarda (ör. 50+ öğe simülasyonu) hâlâ doğru sırada eklendiğinin kontrolü (Bulgu 7 sonrası).

## 6) Optimize Edilmiş Kod / Yama

Talimat gereği bu denetimde herhangi bir kod değiştirilmedi ("sadece optimize et" talebi geldiğinde, mantığı bozmadan yukarıdaki bulgular sırasıyla uygulanabilir). İstersen bir sonraki adımda **Bulgu 1 + Bulgu 2**'yi (en yüksek ROI'li ikili) somut bir patch olarak (fonksiyon imzaları ve oyun mantığı korunarak, sadece `render()`/`checkLabelOverflow()` iç implementasyonu değiştirilerek) hazırlayabilirim.

---

## Ek Notlar / Varsayımlar

- Analiz statik kod incelemesine dayanıyor; gerçek cihazda ölçülmüş DevTools Performance profili elimde değil, bu yüzden Bulgu 1, 2, 5 "likely" bottleneck olarak işaretlendi — yukarıdaki "Doğrulama Planı" ile kesinleştirilmeli.
- `js/systems/*` (field, orchard, buildings, market, weather, time, crafting, quests, upgrades) dosyaları incelendi; buradaki tick döngüleri (≤34 slot, sabit maliyetli hesaplamalar) performans açısından sorunsuz bulundu — kasma kaynağı **render/DOM katmanı**, oyun mantığı değil.
- `css/style.css` (1580 satır) genel olarak `transform`/`opacity` tabanlı geçişleri doğru kullanıyor; tek dikkat çeken nokta Bulgu 5'teki `box-shadow` animasyonu.
