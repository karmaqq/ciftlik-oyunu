# Çiftlik Oyunu — Çalışan Prototip

Vanilla JavaScript (ES Modules), bundler yok. `js/systems/*` oyun mantığını,
`js/data/*` ürün/tarif/hayvan tanımlarını, `js/ui.js` render + etkileşimi,
`js/main.js` oyun döngüsünü içerir.

## Çalıştırma

ES module `import` kullandığı için dosyayı doğrudan çift tıklayıp
(`file://`) açmak **çalışmaz** (tarayıcı CORS kısıtlaması). Basit bir yerel
sunucu gerekir:

```bash
cd ciftlik-oyunu
python3 -m http.server 8080
# tarayıcıda: http://localhost:8080
```

VSCode kullanıyorsan "Live Server" eklentisiyle de `index.html`'i açabilirsin.

## Zaman Sistemi (güncellendi)

- 1 gün = 60 gerçek saniye
- 1 mevsim = 10 gün = **10 dakika**
- 1 yıl = 4 mevsim = 40 gün = **40 dakika**
- Ay katmanı kaldırıldı (kullanıcı isteğiyle) — sadece gün → mevsim → yıl var.

## Verilen Kararlar (önceki "açık kararlar" listesi kapatıldı)

| Konu | Karar |
|---|---|
| Tarla ürün listesi | 20 ürün tamamlandı (+ soğan, sarımsak, nohut eklendi) |
| Ağaç ürün listesi | 20 ürün tamamlandı (+ incir, nar eklendi) |
| Tier ↔ ürün eşleştirmesi | `js/data/crops.js` ve `js/data/trees.js` içinde her ürün `tier: 1-4` alanıyla sabitlendi |
| Merge (birleştirme) kuralı | `js/systems/merge.js`: 3 adet aynı ürün → 1 adet "kaliteli" versiyon (4x satış fiyatı). Kötü havada başarısızlık riski var. |
| Sipariş sistemi | Doküman kapsamına alınmadı — mevcut prototipte yok, market + üretim + görev sistemleri önceliklendirildi. İstenirse `js/systems/orders.js` olarak eklenebilir. |
| Hayvan bina seviyesi etkisi | `js/data/animals.js`: seviye başına kapasite +%20, üretim hızı +%10, max 5 seviye |
| Gün/hafta/ay süreleri | Ay kaldırıldı; gün=60sn, mevsim=10 gün, yıl=40 gün (yukarıda) |

## Sistem Haritası

- `js/systems/time.js` — gün/mevsim/yıl ilerlemesi
- `js/systems/field.js` / `orchard.js` — ekme, büyüme, hasat, slot upgrade
- `js/systems/buildings.js` — kovan/kümes/ahır üretimi, hayvan alımı, bina upgrade
- `js/systems/inventory.js` — sıralama/filtreleme
- `js/systems/market.js` — 2 dakikalık döngüsel market, toplu satış, satış
- `js/systems/crafting.js` — tarif üretimi, ilk üretimde "öğrenme"
- `js/systems/quests.js` — görev üretimi, ilerleme takibi, ödül
- `js/systems/weather.js` — hava koşulları, rarity (nadir/legendary/gizemli)
- `js/systems/upgrades.js` — tarla/bahçe slot seviyesi + tohum koruma seviyesi
- `js/systems/merge.js` — eşya birleştirme (henüz UI'ye bağlanmadı, fonksiyon hazır)

## Test Edildi

`node --check` ile tüm dosyalarda sözdizimi kontrolü yapıldı; ayrıca
headless bir Node testiyle zaman ilerlemesi (1 yıl = 2400 sn, 4 mevsim
değişimi), ekim/hasat, market satın alma/satış, üretim (crafting),
görev tamamlama ve hayvan üretimi akışları gerçek state üzerinde
doğrulandı.

## Bilinçli Olarak Sınırlı Bırakılanlar (sonraki adım için)

1. **Merge UI'si**: `systems/merge.js` fonksiyonel ama envanter panelinde
   henüz bir "birleştir" butonu yok — eklemesi kolay (3x aynı item seçilince
   buton görünür hale getirilebilir).
2. **Sipariş (order) sistemi**: tasarım dokümanında var ama bu prototipte
   kapsam dışı bırakıldı.
3. **Kaydetme**: state şu an sadece bellekte tutuluyor, sayfa yenilenince
   sıfırlanıyor. İstenirse JSON export/import (dosyaya kaydet/yükle) eklenebilir
   — tarayıcı localStorage kullanılmadı çünkü bazı önizleme ortamlarında
   çalışmayabiliyor.
