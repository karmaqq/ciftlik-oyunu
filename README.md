# Çiftlik Oyunu

Vanilla JavaScript (ES Modules), bundler yok. `js/systems/*` oyun mantığını,
`js/data/*` ürün/tarif/hayvan tanımlarını, `js/ui/` render + etkileşimi,
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

## Mimari

```
js/
├── data/          # Statik veri tanımları (ürün, hayvan, tarif)
├── systems/       # Durum değiştiren mantık (ekim, market, bina)
├── ui/            # Render ve etkileşim
│   ├── index.js   # Koordinatör (init, render, tick)
│   ├── events.js  # Olay yönetimi (tıklama, sürükleme, touch)
│   ├── tooltip.js # Tooltip motoru
│   └── *.js       # Panel render fonksiyonları
└── main.js        # Oyun döngüsü, sabitler, durum yönetimi
css/
├── base.css       # CSS değişkenleri, sıfırlama, temel layout
├── responsive.css # Responsive tasarım, large screen desteği
└── *.css          # Panel stilleri
```

## Zaman Sistemi

- 1 gün = 60 gerçek saniye
- 1 mevsim = 10 gün = **10 dakika**
- 1 yıl = 4 mevsim = 40 gün = **40 dakika**
- Oyun arka planda kaldığında `Date.now()` tabanlı delta时间 hesaplanır

## Ana Sistemler

- `js/systems/time.js` — gün/mevsim/yıl ilerlemesi
- `js/systems/field.js` — tarla ekimi, büyüme, hasat
- `js/systems/orchard.js` — bahçe ekimi, büyüme, hasat
- `js/systems/planting.js` — tarla/bahçe ortak ekim/büyüme mantığı
- `js/systems/buildings.js` — kovan/kümes/ahır üretimi, hayvan alımı
- `js/systems/market.js` — döngüsel market, toplu alım, satış
- `js/systems/crafting.js` — tarif üretimi, ilk üretimde "öğrenme"
- `js/systems/weather.js` — hava koşulları, rarity sistemi
- `js/systems/upgrades.js` — geliştirme ağaçları, bina yükseltmeleri
- `js/systems/save.js` — localStorage kaydetme/yükleme, versiyon migrasyonu
- `js/systems/calendarTrade.js` — takvim bazlı fiyat çarpanları

## Kalite İyileştirmeleri

- **Event delegation**: Tab butonları için tek `addEventListener` + event delegation
- **Touch/pointer desteği**: Mobil cihazlarda sürükleme-bırakma `pointer events` ile
- **Performans**: `render()` sadece değişen sekmeleri yeniden oluşturur
- **Tooltip diffing**: `innerHTML` sadece içerik değiştiğinde güncellenir
- **CSS değişkenleri**: Tüm renkler `:root` tanımlarından yönetilir
- **Erişilebilirlik**: ARIA rolleri, tabindex, contrast iyileştirmeleri
- **Migrasyon**: `SAVE_VERSION` ile eski kayıtlar otomatik güncellenir
- **Büyüme hesaplaması**: `Date.now()` tabanlı delta时间 ile arka plan uyumluluğu

## Test

Tüm JS dosyalarında `node --check` ile sözdizimi kontrolü yapıldı.
