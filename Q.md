# Çiftlik Oyunu — Kapsamlı Geliştirme Yol Haritası

Bu belge, istenen tüm değişiklikleri mantıklı bir sıraya koyarak aşama aşama anlatır. Sıralama rastgele değil: bazı değişiklikler (özellikle zaman sistemi) diğerlerinin (büyüme süreleri, kayıt sistemi) üzerine inşa edildiği için önce temel mekanikler, sonra bunlara bağlı dengelemeler, en sonda da her şeyi saklayan kayıt sistemi ele alınıyor. Böylece kayıt sistemi, oyunun son haline göre tek seferde doğru kurulur; her mekanik değişikliğinde kayıt formatını tekrar tekrar değiştirmek zorunda kalınmaz.

Birkaç noktada isteğin içinde net olmayan ayrıntılar vardı; bunları makul varsayımlarla netleştirdim ve her aşamanın başında **"Varsayım"** olarak işaretledim. İstersen bu varsayımları değiştirebiliriz.

---

## Aşama 1 — Zaman Sisteminin Kökten Yenilenmesi (Gün / Ay / Yıl) ✅ TAMAMLANDI

**Şu anki durum:** ~~Oyunda ay katmanı yok. 1 gün = 60 gerçek saniye, 1 mevsim = 10 gün, 1 yıl = 4 mevsim = 40 gün.~~ **YENİ SİSTEM: 1 gün = 12 saniye, 1 yıl = 365 gün = 12 ay. Mevsimler aylara bağlı.**

**Varsayım:** "365 günü eşit dağıtacağız (yıllık takvim mantığına en yakın ve "eşit dağıtım" ifadesiyle en uyumlu sayı). Onaylarsan bu şekilde ilerleriz, farklı bir sayı istiyorsan söylemen yeterli.

**Ne değişecek:**

- Bir günün gerçek süresi 60 saniyeden **12 saniyeye** düşürülecek. Bu, oyunun genel temposunu belirgin şekilde hızlandıracak.
- Yıl artık 40 gün değil, **365 gün** olacak ve bu 365 gün **aylara** bölünecek. Ay katmanı geri gelecek: yıl → 12 ay → her ay ortalama 30-31 gün (365'i tam bölecek şekilde, örneğin bazı aylar 30, bazıları 31 gün — takvimdeki gibi eşit dağıtılmış olacak).
- Mevsimler artık günlere değil **aylara** bağlı olacak: her mevsime 3 ay (yaklaşık 91 gün) düşecek. Yani "ilkbahar" belirli 3 ayı, "yaz" başka 3 ayı kapsayacak.
- Ekranda gösterilen zaman bilgisi (üst panel, saat/tarih göstergesi) "Yıl X · Ay Y · Gün Z" ya da "Yıl X · [Mevsim adı] · Ay Y/12 · Gün Z" şeklinde daha zengin gösterilecek.
- Mevsim geçişi, ay geçişi ve yıl geçişi olaylarının her biri ayrı ayrı log'a düşmeye devam edecek (şu an mevsim/yıl geçişi zaten logluyor; buna bir de "yeni ay" log'u eklenebilir, ama bu isteğe bağlı — çok sık log basmaması için sadece mevsim ve yıl geçişleri loglanabilir, ay geçişi sessiz kalabilir).

**Neden önce bu yapılmalı:** Büyüme süreleri (Aşama 2), hava durumu döngüsü, market yenileme süresi gibi birçok sistem "gün" kavramına bağlı. Gün süresi ve yıl uzunluğu değişmeden diğer dengelemeleri yapmak, sonradan hepsini tekrar hesaplamak anlamına gelir.

**Dikkat edilecekler:**

- Hava durumu her gün değiştiği için (`dayChanged` olayı), gün süresinin 60 saniyeden 12 saniyeye düşmesi hava durumunun artık çok daha sık değişmesi anlamına gelir. Bunun oyun hissini nasıl etkileyeceği ayrıca değerlendirilmeli (belki hava durumu artık her günde değil, birkaç günde bir değişecek şekilde ayrıca ayarlanmalı — bu senin onayına bağlı, şimdilik mevcut "her gün değişir" kuralını koruyup sonucu görüp karar verebiliriz).
- Market yenileme süresi şu an 120 saniyede bir; yeni gün süresiyle (12 sn) bu artık 10 oyun-günü yerine yaklaşık aynı gerçek süreyi koruyacak şekilde sabit kalabilir ya da oyun-günü cinsinden yeniden ifade edilebilir. Bu ayrı bir denge kararı.

---

## Aşama 2 — Büyüme Sürelerinin Yeni Zaman Sistemine Göre Dengelenmesi ✅ TAMAMLANDI

**Şu anki durum:** ~~Ürünler 3 ile 22 "gün" arasında büyüyor (eski 60 saniyelik günle bu, 3 ile 22 dakika arası gerçek bekleme demekti).~~ **YENİ SİSTEM: Tier 1 (1-2 gün), Tier 2 (4-5 gün), Tier 3 (8-10 gün), Tier 4 (15-20 gün). Ağaçlar Tier 1 (5-7 gün) ile Tier 4 (15-20 gün) arasında.**

**Ne değişecek:**

- Gün süresi 12 saniyeye düştüğü için, mevcut gün sayıları hiç dokunulmasa bile bekleme süreleri zaten ciddi oranda kısalmış olacak (örnek: 22 günlük bir ağaç artık 22×12 sn ≈ 4,5 dakika sürecek, eskiden 22 dakikaydı).
- Buna ek olarak, tüm ürün ve ağaçların büyüme gün sayıları **yeniden dengelenecek**: amaç, tier 1 (kolay) ürünlerin çok hızlı (yaklaşık yarım-bir dakika), tier 4 (zor) ürünlerin ise makul ama sıkıcı olmayacak bir sürede (birkaç dakika) hazır olması. Ağaçlar (bahçe) tarladan biraz daha uzun sürebilir ama aşırı uzun beklemeler (eski sistemdeki 20+ günlük ağaçlar gibi) kaldırılacak.
- Tekrar eden hasatların (recurring) aralık süreleri de aynı mantıkla kısaltılacak; bir ürünü hasat ettikten sonra tekrar hazır olması için beklenen süre de oransal olarak küçültülecek.
- Tüm bu sayılar tek tek elle ayarlanacak (otomatik bir formülle çarpmak yerine, her ürünün tier'ine ve rolüne göre gözden geçirilecek) — böylece tier'ler arası fark (kolay/orta/zor ürün hissi) korunur, sadece mutlak bekleme süreleri makul hale gelir.

**Dikkat edilecekler:**

- Market alım/satım fiyatları ve tarif kârlılığı, büyüme süresi kısaldıkça daha hızlı tekrar edeceği için dolaylı olarak ekonomiyi de hızlandıracak. Bu yüzden bu aşamadan sonra genel ekonomi dengesi (fiyatlar, altın kazancı hızı) ayrıca gözlemlenmeli; gerekirse ayrı bir "ekonomi dengeleme" turu yapılabilir (bu yol haritasının kapsamı dışında, ama not düşülmesi gereken bir sonraki adım).

---

## Aşama 3 — Ekili Bitki/Ağaçların Ömür Sınırı ve Manuel Sökme ✅ TAMAMLANDI

**Şu anki durum:** ~~"Recurring" (tekrar eden) ürünler bir slotta süresiz kalıp sonsuza kadar hasat verebiliyor; slot hiç boşalmıyor. Sökme/kaldırma seçeneği hiç yok.~~ **YENİ SİSTEM: Her ekimde 1-5 arası rastgele ömür atanır. Hasat edildiğinde azalır, 0 olunca slot otomatik boşalır. Her slotta 🗑️ sökme butonu var.**

**Ne değişecek:**

- Bir tohum ekildiğinde veya bir fidan dikildiğinde, o bitki/ağaca **1 ile 5 arasında** (rastgele belirlenen) bir "kaç kez hasat verebilir" ömrü atanacak.
- Bitki/ağaç bu sayı kadar hasat verdikten sonra **kendiliğinden tükenecek**: slot otomatik olarak boşalacak, oyuncu tekrar tohum/fidan ekleyebilecek. (Zaten tek seferlik "once" ürünler bu mantığa doğal olarak uyuyor — bir hasat sonrası tükeniyorlar; bu değişiklik esas olarak "recurring" ürünler için geçerli olacak.)
- Oyuncunun bunu önceden bilmesi için, bitkinin/ağacın üzerine gelindiğinde çıkan bilgi kutusunda (tooltip) "kaç hasat kaldığı" gösterilecek (örnek: "Kalan hasat: 2/4").
- Her ekili slota, hasat butonunun yanına **manuel "sök" (kaldır) butonu** eklenecek. Bu buton, oyuncunun bitkiyi/ağacı ömrü dolmadan istediği an kaldırıp slotu boşaltmasını sağlayacak — örneğin farklı bir ürün ekmek istediğinde, ürünün ömrü bitene kadar beklemek zorunda kalmayacak.
- Sökme işlemi geri dönüşü olmayan bir işlem olacak: sökülen bitkinin tohumu geri verilmeyecek (bu bir tasarım tercihi — istersen ileride "yarı tohum iadesi" gibi bir mekanik de eklenebilir, şimdilik en basit ve anlaşılır kural olan "sökülen kaybolur" ile ilerliyoruz).

**Dikkat edilecekler:**

- Bu değişiklik ekonomiye doğrudan etki eder: artık aynı slotta sonsuza kadar üretim yapılamayacağı için, oyuncu düzenli olarak tarlayı/bahçeyi yenilemek zorunda kalacak. Bu, tohum/fidan pazarının önemini artıracak (pazar zaten var, bu yüzden ek bir sistem gerekmiyor, sadece talep artacak).
- Görevler (quest) sistemi "üret" ve "sat" tipi görevler veriyor; bu görevlerin miktarları, artık sınırsız üretim olmadığı için gerçekçi kalması adına gözden geçirilebilir (çok yüksek miktarlar artık ulaşılması zor hale gelebilir). Bu ayrı bir ince ayar konusu.

---

## Aşama 4 — Envanter Kapasite Kısıtları, Dolu Uyarısı ve Bekleme Kuyruğu ✅ TAMAMLANDI

**Şu anki durum:** ~~Envanterin bir slot limiti (`maxSlots`) var ama bu limit şu an fiilen uygulanmıyor gibi görünüyor; hasat edilen veya satın alınan ürünler slot doluluğuna bakılmaksızın envantere ekleniyor.~~ **YENİ SİSTEM: Envanter doluysa yeni ürün kuyruğa alınır. Marketten satın alma engellenir. Kuyrukta ürün varsa header'da gösterilir. Slot boşaldığında kuyruktan otomatik doldurulur.**

**Varsayım:** Envanterde "slot" kavramı, ürün _türü_ başına bir slot anlamına geliyor (yani buğday ne kadar biriktirilirse biriktirilsin tek bir slot kaplıyor, ama yeni bir ürün türü — mesela ilk kez elde edilen bir peynir — için boş bir slot gerekiyor). Bu değişiklikte de bu mantığı koruyoruz: mevcut bir türden zaten envanterde varsa miktarı artırmakta sorun yok, sorun sadece **envanterde hiç bulunmayan yeni bir türün** eklenmesi gerektiğinde ve tüm slotlar doluyken ortaya çıkıyor.

**Ne değişecek:**

- Envanterdeki dolu slot sayısı (farklı ürün türü sayısı) `maxSlots` değerine ulaştığında, envanter **"dolu"** kabul edilecek.
- Envanter doluyken yeni bir ürün türü elde edilmeye çalışıldığında (hasat, satın alma, üretim, hayvan ürünü gibi her kaynaktan):
  - Oyuncuya net bir **"Envanter dolu!"** uyarısı log panelinde gösterilecek.
  - Elde edilmesi gereken ürün kaybolmayacak; bunun yerine bir **bekleme kuyruğuna** alınacak.
  - Envanterde bir slot boşaldığı an (örneğin oyuncu bir ürünü Hızlı Satış alanına sürükleyip tamamen sattığında ve o tür envanterden tamamen kalktığında), kuyrukta bekleyen ürünlerden sırasıyla envantere eklenecek — böyle böyle envanter boşaldıkça bekleyen ürünler otomatik olarak içeri girecek.
- Bu davranış hem tarla/bahçe hasatları hem market alışverişi hem üretim (crafting) çıktıları hem de bina (arı/tavuk/inek) ürünleri için aynı şekilde geçerli olacak — hepsi aynı "envanter dolu mu, değilse ekle, doluysa kuyruğa al" mantığından geçecek.
- Arayüzde, kuyrukta bekleyen ürün varsa bunu gösteren küçük bir gösterge eklenebilir (örneğin "3 ürün envanter boşalmasını bekliyor" gibi bir bilgi), böylece oyuncu neden ürün kaybetmediğini ama da almadığını anlar.

**Dikkat edilecekler:**

- Satın alma akışında (market), eğer alınacak ürün türü envanterde yoksa ve envanter doluysa, satın alma işlemi baştan engellenip oyuncuya uyarı verilmesi (parasını harcayıp ürünü kuyruğa atmak yerine) daha adil olur — bu şekilde oyuncu gereksiz yere altın harcamamış olur. Hasat ve üretim gibi "zaten eldeki kaynaktan otomatik üretilen" durumlarda ise kuyruğa alma mantığı daha uygun (çünkü hasat/üretim anında iptal edilemez, çiftlikte bekleyen bir ürün var).

---

## Aşama 5 — Hızlı Satış Alanı ve Envanterden Tıklamayla Satışın Kaldırılması ✅ TAMAMLANDI

**Şu anki durum:** ~~Envanterdeki bir ürüne tıklandığında o üründen 1 adet satılıyor.~~ **YENİ SİSTEM: Tıklama ile satış kaldırıldı. "💰 Hızlı Satış" alanı eklendi. Ürünü sürükle-bırak ile tamamını tek seferde satabilirsin.**

**Ne değişecek:**

- Envanter panelinde yeni bir bölüm eklenecek: **"Hızlı Satış"** alanı. Bu, sürükle-bırak ile ürün bırakılabilen ayrı bir kutu/alan olacak (tıpkı tarla/bahçe slotlarına tohum sürüklemek gibi).
- Oyuncu envanterden bir ürünü bu alana sürükleyip bıraktığında, o ürün türünden envanterde ne kadar varsa **tamamı tek seferde** satılacak (parça parça değil, toplu).
- Bu satış sonucunda log paneline şu formatta bir kayıt düşecek: **"[Ürün adı] x[miktar] satıldı, +[altın miktarı]🪙"** (örnek: "Buğday x12 satıldı, +24🪙"). Bu, mevcut log formatına uygun ama net bir "toplu satış" mesajı olacak.
- Envanterdeki bir ürüne **tıklamanın** artık hiçbir satış etkisi olmayacak. Tıklama satışı tamamen kaldırılacak; envanterden ürün çıkarmanın tek yolu ya tarlaya/bahçeye sürükleyip ekmek (tohum/fidan için) ya da Hızlı Satış alanına sürükleyip satmak olacak.
- Envanterde tıklamaya artık ihtiyaç kalmadığı için, tıklamanın yanlışlıkla tetiklediği "bu eşya tohum/fidan olarak ekilemez" gibi mevcut uyarı mesajları da bu akıştan kalkacak; tıklama sadece bilgi amaçlı tooltip göstermeye devam edecek (zaten mouse üzerine gelince tooltip çalışıyor, bu korunacak).

**Dikkat edilecekler:**

- Hızlı Satış alanına yanlışlıkla sürükleyip bırakma riskine karşı (özellikle değerli, biriktirilen ürünler için), ileride bir onay adımı (örneğin "Emin misin?") eklenmesi düşünülebilir; ama başlangıç için basit ve doğrudan sürükle-bırak yeterli, oyuncu alışkanlık kazandıkça bu ihtiyaç değerlendirilir.
- Hava koşullarının satışlarda "ticaret kaybı" riski yaratabildiğini biliyoruz (mevcut sistemde zaten var); toplu satışta da bu riskin tüm miktara mı yoksa satışın tamamına mı uygulanacağı netleştirilmeli — en tutarlı yaklaşım, toplu satışın da tek bir işlem olarak ele alınıp aynı risk kuralına tabi olmasıdır (ya hepsi satılır ya da hava koşulu yüzünden tamamı kaybedilir, mevcut sistemle tutarlı).

---

## Aşama 6 — Üretim Sekmesinde Envanter-Tarif Eşleştirme Vurgusu (Border Efekt) ✅ TAMAMLANDI

**Şu anki durum:** ~~Üretim (crafting) sekmesindeki tarif kartları, hangi envanter ürünlerini kullandığını sadece tarife tıklanınca/üzerine gelinince tooltip içinde gösteriyor.~~ **YENİ SİSTEM: Envanterdeki bir ürüne hover edildiğinde, o ürünü kullanan tüm tarif kartlarında altın renkli border vurgusu görünür.**

**Ne değişecek:**

- Envanterdeki bir ürünün üzerine gelindiğinde (ya da tıklanıp "seçili" hale getirildiğinde — hangisinin daha doğal hissettireceğine birlikte karar verebiliriz, ama sürükle-bırak ile çakışmaması için "üzerine gelince" (hover) daha az sorunlu görünüyor) artık şu olacak:
  - O ürünü **girdi olarak kullanan tüm tarif kartları**, Üretim sekmesinde belirgin bir **renkli kenarlık (border)** ile vurgulanacak — oyuncu hangi tariflerin bu ürünü kullandığını anında görsel olarak fark edecek, tek tek tarif tooltip'lerini açıp okumasına gerek kalmayacak.
  - Bu vurgu sadece o an Üretim sekmesi açıksa (veya sekme değiştirildiğinde en son vurgulanan ürün hatırlanıp otomatik tekrar uygulanabilir, bu ikinci kısım isteğe bağlı bir iyileştirme).
- Görsel olarak, mevcut kart tasarımına uyan ama net fark edilir bir renk (örneğin altın/sarı tonlarında parlak bir kenarlık) kullanılabilir; "kilitli", "üretilemez" (soluk) gibi mevcut durumlarla karışmayacak ayrı bir görsel dil seçilecek.

**Dikkat edilecekler:**

- Envanterdeki bir tohum/fidan üzerine gelindiğinde bu vurgunun tetiklenip tetiklenmeyeceği netleştirilmeli — tohum/fidan zaten tarif girdisi olarak kullanılmıyor (onlar ekim için), bu yüzden büyük ihtimalle bu vurgu sadece hasat edilmiş/üretilmiş ham ürünler ve hayvan ürünleri için anlamlı olacak. Tohum/fidan üzerine gelindiğinde hiçbir tarif vurgulanmaması normal ve beklenen bir davranış olur.

---

## Aşama 7 — Hayvan Binaları: Sıfır Popülasyonla Başlangıç

**Şu anki durum:** Oyun başladığında kovan 4 arı, kümes 2 tavuk, ahır 1 inekle geliyor — yani oyuncu hiçbir şey yapmadan hazır bir hayvan popülasyonuyla başlıyor.

**Ne değişecek:**

- Yeni bir oyuna başlarken üç binanın da (kovan, kümes, ahır) popülasyonu **0** olacak.
- Hayvan sahibi olmanın tek yolu, market üzerinden (mevcut market sisteminde zaten hayvan satın alma seçeneği var) arı/tavuk/inek satın almak olacak — bu kısım için ekstra bir sistem kurmaya gerek yok, sadece başlangıç değerleri sıfırlanacak.
- Binalar 0 popülasyondayken üretim yapmayacak (bal/yumurta/süt üretimi popülasyona bağlı olduğu için bu zaten doğal sonuç), bina paneli de "0/kapasite" şeklinde bu durumu gösterecek.

**Dikkat edilecekler:**

- Bu değişiklik oyunun ilk dakikalarının ekonomisini biraz yavaşlatacaktır (artık hazır bal/yumurta/süt geliri yok); bu, tarla/bahçe ürünlerinden gelen ilk gelirin biraz daha önemli hale gelmesi anlamına gelir — genel ekonomi dengesiyle (Aşama 2'nin notu) birlikte değerlendirilmesi iyi olur.

---

## Aşama 8 — Market: Toplu Alım Fiyat Hesabının Düzeltilmesi ve Hover Tooltip ✅ TAMAMLANDI

**Şu anki durum:** ~~Market listelerinde "tümünü al" (N.x) butonu var ve toplu alımda %10 indirim uygulanıyor, ama oyuncu bu butona basmadan önce toplam ne kadar ödeyeceğini göremiyor~~ **YENİ SİSTEM: Alt fiyat satırları kaldırıldı. Tooltip sadece isim, tür, detay ve kapasite durumunu gösteriyor. Butonlara hover edildiğinde sadece "Nx (toplam fiyat🪙)" formatında tooltip görünür.**

**Ne değişecek:**

- "N.x" (tümünü al) butonunun üzerine gelindiğinde (hover), küçük bir bilgi kutusu (tooltip) açılacak ve içinde şu bilgi net şekilde gösterilecek: kaç adet alınacağı, birim fiyat, %10 toplu alım indirimi düşüldükten sonra **ödenecek toplam tutar**.
- Bu hesaplama, o anki market listesindeki **güncel fiyat** üzerinden yapılacak (market fiyatları periyodik olarak yenilendiği ve rastgele indirim/zam çarpanları içerdiği için, tooltip'te gösterilen tutar her zaman o anki gerçek fiyata göre doğru hesaplanmış olacak — eski/yanlış bir fiyatla değil).
- Aynı şekilde tekli alım butonunun tooltip'i de (zaten varsa) güncel birim fiyatı doğru yansıtacak şekilde gözden geçirilecek.
- %10 toplu alım indiriminin hesaplama mantığı gözden geçirilip, gösterilen tutar ile gerçekte tahsil edilen tutarın birebir aynı olduğu doğrulanacak (şu anda hesaplama mantığında bir tutarsızlık şüphesi var, bu netleştirilip düzeltilecek).

**Dikkat edilecekler:**

- Hayvan gibi tek adetlik market kalemlerinde "tümünü al" zaten tek adet aldığı için, bu kalemlerde toplu alım tooltip'i basitçe "1 adet, indirim yok" şeklinde gösterilebilir veya bu buton hayvanlar için hiç gösterilmeyebilir (mevcut davranışla tutarlı kalınacak, sadece bilgi netliği artacak).

---

## Aşama 9 — Kapsamlı Kayıt Sistemi (localStorage) ✅ TAMAMLANDI

**Şu anki durum:** ~~Oyun hiçbir ilerlemeyi kaydetmiyor; sayfa yenilendiğinde tüm ilerleme sıfırlanıyor.~~ **YENİ SİSTEM: `js/systems/save.js` ile tam kapsamlı localStorage kayıt sistemi eklendi.**

**Neden en sona bırakıldı:** Kayıt sisteminin görevi, oyunun **tüm durumunu** (altın, envanter, tarla/bahçe slotları, binalar, market, tarifler, görevler, zaman, ipucu geçmişi — her şeyi) doğru ve eksiksiz şekilde saklayıp geri yüklemek. Yukarıdaki aşamalarda oyunun veri yapısı değişiyor (yeni alanlar: bitki ömrü, envanter kuyruğu, ay/yıl bilgisi, vb.). Kayıt sistemi en son kurulursa, bu yeni alanların hepsini baştan doğru şekilde kapsar; en başta kurulup sonra her aşamada yamanması, hataya daha açık ve zaman kaybettirici olur. (İstersen bunun yerine "önce basit bir kayıt sistemi, sonra her aşamada güncelle" şeklinde de ilerleyebiliriz — bu tamamen tercih meselesi, ama önerim budur.)

**Ne değişecek:**

- Oyunun tüm durumu (state), belirli aralıklarla (örneğin her birkaç saniyede bir, ya da her önemli aksiyondan hemen sonra — hasat, satış, satın alma, ekim, üretim, görev tamamlama gibi) otomatik olarak tarayıcının localStorage'ına yazılacak.
- Sayfa ilk açıldığında (main.js başlarken), localStorage'da kayıtlı bir oyun verisi olup olmadığı kontrol edilecek:
  - Varsa, oyunun tüm durumu bu kayıttan geri yüklenecek ve oyuncu kaldığı yerden devam edecek (altın, envanter, ekili bitkiler ve kalan büyüme süreleri, hayvan popülasyonları, açık market listesi, öğrenilmiş tarifler, aktif görevler, geçen zaman/ay/yıl bilgisi — hepsi).
  - Yoksa (ilk kez oynanıyorsa), oyun mevcut sistemde olduğu gibi sıfırdan başlayacak.
- **F5 / sayfa yenileme** ve **tarayıcı kapatıp yeniden açma** senaryolarının ikisi de bu şekilde sorunsuz çalışacak, çünkü localStorage sayfa oturumundan bağımsız, tarayıcıya kalıcı olarak yazılıyor.
- **"Render işlemlerinde veri korunsun"** isteğine karşılık: ekranın yeniden çizilmesi (render) hiçbir zaman oyunun asıl verisini (state) değiştirmeyecek veya sıfırlamayacak — render sadece var olan veriyi ekrana yansıtan bir işlem olarak kalacak, veri kaynağı olarak kullanılmayacak. Bu ayrım zaten mevcut kod yapısında büyük ölçüde var (state ayrı, render ayrı); kayıt sistemi eklenirken bu ayrımın bozulmadığından emin olunacak, yani "kaydet" işlemi her zaman gerçek state'ten okuyacak, ekrandan değil.
- Oyuncu isterse ilerlemesini sıfırlamak için bir **"Kaydı Sıfırla / Yeni Oyun"** seçeneği de eklenebilir (isteğe bağlı ama pratik bir ek — istersen kapsam dışı bırakabiliriz).
- Zamanla oynanmayan süre (tarayıcı kapalıyken geçen gerçek zaman) için iki yaklaşım mümkün: (a) oyuncu geri döndüğünde zaman kaldığı yerden aynen devam eder (kapalıyken hiçbir şey büyümez/üretilmez — "duraklat" mantığı), ya da (b) kapalı kalınan süre hesaplanıp bitkilerin büyümesi/üretimin buna göre "telafi edilmesi" (offline progress) sağlanır. Bu ikinci seçenek daha karmaşık bir sistem gerektirir (hangi üretimlerin ne kadar telafi edileceği, üst sınırlar vb.). Başlangıç için (a) — yani "duraklatma" mantığı — daha basit, güvenilir ve hatasız olacağından öneriyorum; offline ilerleme istersen bunu ayrı bir aşama olarak sonra ele alabiliriz.

**Dikkat edilecekler:**

- localStorage'ın boyut sınırı var (tarayıcı başına genelde birkaç MB); bu oyunun veri boyutu için fazlasıyla yeterli, endişe edilecek bir durum değil.
- Kaydedilen veri yapısı ile kodun beklediği veri yapısı arasında ileride bir uyuşmazlık çıkarsa (örneğin yeni bir özellik eklenip state şekli değiştiğinde), eski kayıtları okurken hata vermemesi için basit bir "eksik alanları varsayılan değerlerle tamamla" kontrolü eklenmesi faydalı olur — bu, ileride yapılacak her yeni güncellemede oyuncunun eski kaydının bozulmamasını sağlar.

---

## Özet Sıralama

1. Zaman sistemi (gün/ay/yıl, 12 saniye/gün, 365 gün)
2. Büyüme sürelerinin yeniden dengelenmesi
3. Bitki/ağaç ömür sınırı + manuel sökme
4. Envanter kapasite kısıtı + dolu uyarısı + bekleme kuyruğu
5. Hızlı Satış alanı + log formatı + tıklamayla satışın kaldırılması
6. Üretim sekmesinde envanter-tarif border vurgusu
7. Hayvan binaları sıfır popülasyonla başlangıç
8. Market toplu alım tooltip + fiyat hesabı düzeltmesi
9. Kapsamlı localStorage kayıt sistemi

Hazır olduğunda bu aşamalardan istediğin biriyle (önerim: Aşama 1'den başlamak, çünkü diğer birçok şey buna bağlı) kodlamaya başlayabiliriz.
