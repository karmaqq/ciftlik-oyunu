# 📋 SOHBET ÖZETİ VE DEVAM PLANI — Tam El Değiştirme Belgesi

Bu belgeyi yeni sohbete yapıştırarak kaldığımız yerden devam edebilirsin.

---

## PROJE BİLGİLERİ

- **Yol:** `C:\Users\esat0\OneDrive\Masaüstü\ciftlik-oyunu`
- **Teknoloji:** Vanilla JS (ES Modules), HTTP sunucusuyla çalışıyor
- **Yapı:** `js/data/` (veri tanımları), `js/systems/`, `js/ui.js`, `js/main.js`, `js/state.js`
- **Toplam:** 18 JS dosyası + 1 CSS + 1 HTML
- **Dil:** Türkçe konuş, kod/teknik terimler İngilizce kalabilir
- **Test:** `node --check` ile syntax kontrolü

---

## DAHA ÖNCE YAPILAN ÇALIŞMALAR (Bu sohbet)

### 1. Kapsamlı Kod Denetimi
- Dead code temizliği (ölmüş importlar, fonksiyonlar)
- Duplicate code temizliği
- Logic bug düzeltmeleri
- CSS temizliği (14 ölü class, 11 ölü değişken, responsive düzeltmeleri)

### 2. Üretim Sistemi Yenileme
- **Üretim kartları:** Gereksinimler kaldırıldı, sadece ürün ismi ve emoji gösteriliyor
- **Tooltip:** Gereksinim detayları + satış fiyatı + kâr bilgisi gösteriyor, çıktı satırı kaldırıldı
- **Üret butonu:** "Üret x1" → "Üret"
- **Toplu üretim:** Sabit x5 → Dinamik (üretilebilir maksimum adet)
- **Tier renkleri:** Sol kenarlık ile kategori ayrımı (mavi/altın/mavi/kırmızı)

### 3. Dinamik Fiyat Sistemi
- Sabit fiyatlar kaldırıldı
- Formül: `hammadde_maliyeti × tier_multiplier`
- Tier 1: ×1.2, Tier 2: ×1.25, Tier 3: ×1.35, Tier 4: ×1.5
- Zincirli tarifler (ekmek→hamburger) her kademede kâr marjını koruyor
- `craftedSellPrice()` fonksiyonu recursif olarak fiyat hesaplıyor

### 4. 25 Yeni Tarif Eklendi (12→37)
- Tüm dead-end ürünler tariflere bağlandı (0 dead-end kaldı)
- Yeni hayvan ürünü: **tavuk_eti** (🍗, 8🪙, kümes %15 şans)

### 5. Değişen Dosyalar (Bu oturum)
| Dosya | Değişiklik |
|---|---|
| `js/data/animals.js` |coop'a `secondaryProductId: "tavuk_eti"` eklendi |
| `js/data/items.js` | Emoji haritası + ANIMAL_PRODUCTS + craftedSellPrice() |
| `js/data/recipes.js` | 25 yeni tarif (toplam 37) |
| `js/systems/inventory.js` | tavuk_eti kategorisi eklendi |
| `js/ui.js` | Crafting kartları yeniden tasarlandı, import temizliği |
| `css/style.css` | Tier renkleri, ölü CSS temizliği, section numaralandırması |

---

## MEVCUT OYUN DURUMU (Sonraki Adımlar İçin Temel)

### Hayvan Çıktı Sistemi
```
Arı (kovan)    → bal (birincil)
Tavuk (kümes)  → yumurta (birincil) + tavuk_eti (%15)
İnek (ahır)    → sut (birincil) + inek_eti (%15)
```

### Tarif Zinciri Haritası (37 Tarif)
```
Tier 1 (22 tarif):
  sut → peynir, yoğurt, maya
  limon → limonata
  kakao → çikolata
  çay yaprağı → çay
  ay çiceği/fındık → çerez
  misır → misir_unu | havuc → havuc_pure
  domates+biber → salça | zeytin → zeytinyağı
  cilek+şeker pancarı → reçel | erik → erik hoşafı
  nar → nar şerbeti | findık+bal → fındık ezmesi
  ekmek+yumurta → yumurtalı ekmek
  muz+bal → muz smoothie
  pirinç+soğan → pirinç pilavı
  bal kabağı+bal → bal kabağı tatlısı
  vişne+şeker kamışı → vişne reçeli
  çay+limon → fincan çay

Tier 2 (12 tarif):
  bugday+maya → ekmek
  salça+soğan+maya → domates çorbası
  havuc_pure+patates+soğan → sebze çorbası
  misir_unu+bal+fındık_ezmesi → baklava
  4 meyve → meyve salatası
  guveç+salça+soğan → biberli güveç
  incir+şeker pancarı → incir reçeli
  kayısı+şeker kamışı → komposto
  ekmek+soğan → soğanlı ekmek
  ayva+bal → ayvalı tatlı
  mandalina+şeker pancarı → mandalina reçeli
  tavuk_eti+pirinc_pilavi → tavuklu pilav

Tier 3 (11 tarif):
  patates+kabak+biber → güveç
  zeytinyagi+pirinc+soğan → zeytinyağlı yemek
  çikolata+fındık_ezmesi → fındık çikolatası
  nohut+zeytinyagi+sarımsak → humus
  misir_unu+havuc_pure+inek_eti → mantı
  inek_eti+sarımsak+zeytinyagi → bonfile
  komposto+nar_serbeti+cilek → meyve kompostosu
  bal_kabagi_tatlisi+soğan+sarımsak → bal kabağı çorbası
  domates_corbasi+şeker_pancari+biber → tarhana
  tavuk_eti+biber+soğan+sarımsak → tavuk sote
  misir_unu+yumurta+peynir → börek

Tier 4 (4 tarif):
  inek_eti+marul+domates+ekmek → hamburger
  6 meyve → meyve suyu
  hamburger+bonfile+tarhana+börek → şef'in özel menüsü
  baklava+reçel+incir_receli+mandalina_receli → tatlı tabağı
```

### Fiyat Sistemi
- Her tarif: `hammadde_toplam_maliyeti × tier_multiplier` ile satış fiyatı
- Zincirli hesaplama:crafted item'lar kendi fiyatlarıyla giriyor (çift multiplier uygulanmıyor)
- En pahalı ürün: Tatlı Tabağı (566🪙)
- En yüksek ROI: Ay Çiçeği Çerezi (%90)

### Dead-End Durumu: ✅ 0 — Tüm ürünler tariflere bağlı

---

## TESPİT EDİLEN SORUNLAR (Sonraki Adımlar İçin)

### Oyuncu Deneyimi Sorunları

| Sorun | Açıklama |
|---|---|
| **Bilgi Çökmesi** | 37 tarif ilk günden görünüyor, hepsi soluk |
| **Rehberlik Yok** | Sadece 1 hoşgeldin mesajı var |
| **Quest Bağlantısız** | `quests.js` çalışıyor ama UI'de görünmüyor |
| **Zincir Görünmüyor** | "süt→maya→ekmek→hamburger" bağımlılığı gösterilmiyor |
| **Seviye Kilidi Yok** | Tüm tarifler her seviyede açık |
| **Mevsim Bilgisi Yok** | Tariflerde hangi mevsimde ürün bulunacağı gösterilmiyor |
| **"Neden Üretmeliyim?"** | Kâr marjı tooltip'te var ama yönlendirme yok |

### Teknik Sorunlar (Küçük)
- `cerez_aycicegi` ve `cerez_findik` aynı `cerez` output ID'sini paylaşıyor (son yazan geçerli)
- `fieldBonusCropIds` (field.js) kullanılmıyor
- localStorage kaydetme sistemi yok (oyun durumu sadece RAM'de)

---

## UYGULANACAK İYİLEŞTİRME PLANI (4 Ana Başlık)

### 1. Quest UI Entegrasyonu
**Dosya:** `js/ui.js`

**Mevcut durum:** `quests.js` tam çalışıyor (görev üretme, tamamlama, ödül verme) ama `ui.js`'de görev paneli yok.

**Yapılacaklar:**
- `index.html`'e "Görevler" tab'ı ekle (veya mevcut tab yapısına entegre et)
- `questsHTML()` fonksiyonu yaz: Görev listesini göster, tamamlanan görevleri "Ödülü Al" butonuyla göster
- `registerProgress()`'i `main.js`'de satiş/üretim olaylarına bağla (zaten `main.js:52`'de `ensureQuestPool` çağrılıyor ama `registerProgress` çağrılmıyor olabilir — kontrol et)
- Görevler oyuncuyu doğru tariflere yönlendirmeli (örn: "3 peynir üret" → oyuncu sut→peynir zincirini öğrenir)

**Örnek görev UI yapısı:**
```
┌─ Görevler ──────────────────────┐
│ 🎯 3 Peynir Üret    [▓▓░░] 2/3 │
│    Ödül: 72🪙                   │
│    [Üret] butonu → Üretim'e git │
│                                 │
│ 🎯 15 Domates Sat    [▓▓▓▓]    │
│    Ödül: 135🪙                  │
│    [Ödülü Al]                   │
└─────────────────────────────────┘
```

### 2. Progressive Recipe Unlock (Aşamalı Tarif Kilidi)
**Dosyalar:** `js/state.js`, `js/ui.js`, `js/data/recipes.js`

**Mantık:** Tier bazlı kilit açma. Oyuncu bir tier'daki ilk tarifi öğrenince sonraki tier açılır.

**Yapılacaklar:**

**a) `state.js`'e tier kilidi ekle:**
```js
recipes: Object.fromEntries(RECIPES.map((r) => [r.id, { learned: false }])),
unlockedTiers: [1], // Başlangıçta sadece tier 1 açık
```

**b) `ui.js` craftingHTML'yi güncelle:**
- `r.tier > maxUnlockedTier` ise kartı hiç gösterme (veya "🔒" ile göster)
- Tooltip'te "Tier 2 tariflerini açmak için bir Tier 1 tarifi öğren" mesajı

**c) `crafting.js` craftRecipe'yi güncelle:**
- İlk craft sonrası: `if (state.unlockedTiers.includes(r.tier + 1))` kontrolü
- Yeni tier açılıyorsa: `ctx.log("Yeni tarifler açıldı! 🎉", "success")` bildirimi

### 3. Rehber İpuçları (Contextual Hints)
**Dosya:** `js/ui.js`, `js/main.js`

**Mantık:** Oyuncu belirli eylemleri yaptığında otomatik ipucu mesajları.

**Yapılacaklar:**

**a) Hoşgeldin mesajını genişlet (`main.js`):**
```js
log("Çiftliğe hoş geldin! 🌱", "info");
log("📋 İlk görevin: 5 buğday yetiştir ve sat.", "info");
log("💡 İpucu: Tohumları envanterden tarlaya sürükle.", "info");
```

**b) Trigger bazlı ipuçları (`ui.js`'e ekle):**
```
İlk süt toplandığında → "Bu sütü peynire dönüştürebilirsin! → Üretim sekmesine git"
İlk maya üretildiğinde → "Maya ekmek yapımında kullanılır. Buğday da lazım!"
İlk ekmek üretildiğinde → "Ekmeği hamburgerde kullanabilirsin! İnek eti gerekli."
İlk bahar geldiğinde → "İlkbahar başladı! Yeni ürünler: çilek, ahududu, nohut"
```

**c) `main.js`'e `checkHints(state, log)` fonksiyonu ekle:**
- Her tick'te veya belirli olaylarda kontrol
- `state.hintsShown = new Set()` ile zaten gösterilen ipuçlarını takip et

### 4. Tarif Bağımlılık Gösterimi
**Dosya:** `js/ui.js`

**Mantık:** Tooltip'te "Bu tarif şunları gerektirir" + "Şu tariflerde kullanılır" bilgisi.

**Yapılacaklar:**

**a) Tooltip'e "Kullanım" bölümü ekle:**
```js
const usedIn = RECIPES.filter(r => r.inputs.some(i => i.id === r.output.id));
const usedInText = usedIn.length > 0
  ? ttRow("🔗", "Kullanıldığı:", usedIn.map(r => r.name).join(", "))
  : ttRow("🔗", "Kullanıldığı:", "Doğrudan satış");
```

**b) Tooltip'e "Gerekli zincir" bilgisi ekle:**
```js
const chainInputs = r.inputs.filter(inp => RECIPES.some(x => x.output.id === inp.id));
if (chainInputs.length > 0) {
  // "⚠️ Bu tarif zincirli: maya (sütten) → ekmek (buğday+maya)"
}
```

---

## UYGULAMA SIRASI

| Sıra | Başlık | Dosyalar | Tahmini Satır |
|---|---|---|---|
| 1 | Quest UI Entegrasyonu | `ui.js`, `main.js`, `index.html` | ~80 |
| 2 | Progressive Recipe Unlock | `state.js`, `recipes.js`, `ui.js`, `crafting.js` | ~60 |
| 3 | Rehber İpuçları | `main.js`, `ui.js` | ~50 |
| 4 | Bağımlılık Gösterimi | `ui.js` | ~30 |
| 5 | Syntax kontrolü | Tüm dosyalar | - |

**Toplam tahmini:** ~220 satır kod değişikliği

---

## DİKKAT EDİLECEKLER

- `node --check` ile her değişiklik sonrası syntax kontrolü yap
- Mevcut fonksiyonları bozma — ekleme yap
- `cerez` output ID çakışması var (cerez_aycicegi ve cerez_findik aynı ID'yi kullanıyor) — istersen düzeltebiliriz
- `fieldBonusCropIds` kullanılmıyor — istersen aktifleştirebiliriz
- localStorage kaydetme sistemi eksik — istersen ekleyebiliriz

---

## KONTROL LİSTESİ

- [x] Quest UI entegrasyonu
- [x] Progressive recipe unlock
- [x] Rehber ipuçları
- [x] Bağımlılık gösterimi
- [x] cerez ID çakışması düzelt
- [ ] fieldBonusCropIds aktifleştir (opsiyonel)
- [ ] localStorage kaydetme (opsiyonel)
- [x] Tüm syntax kontrolleri
