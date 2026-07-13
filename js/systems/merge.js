// js/systems/merge.js
// Açık karar çözümü: "envanterden eş değer eşyalar birleştirilip üst kademe
// eşyaya dönüşsün" kuralı şu şekilde uygulanır:
//   MERGE_RATIO adet aynı temel ürün -> 1 adet "<id>_kaliteli" (kaliteli/üst kademe) ürünü.
//   Kaliteli ürün, normal satış fiyatının KALITELI_SATIS_CARPANI katı değerindedir.
// Başarısızlık ihtimali kötü hava koşulunda devreye girer (bkz systems/weather.js).

export const MERGE_RATIO = 3;
export const KALITELI_SATIS_CARPANI = 4; // 3 adet ~sellPrice yerine 4x tek fiyat -> teşvik edici

/**
 * @param {object} state oyun durumu
 * @param {string} itemId birleştirilecek temel ürün id'si
 * @param {number} baseSellPrice ürünün normal satış fiyatı (kaliteli fiyat hesaplamak için)
 * @param {(id:string, qty:number) => boolean} hasItemFn envanterde yeterli miktar var mı
 * @param {(id:string, qty:number) => void} removeItemFn envanterden düş
 * @param {(id:string, qty:number, meta?:object) => void} addItemFn envantere ekle
 * @param {number} mergeFailChance hava koşuluna bağlı başarısızlık ihtimali (0-1)
 * @returns {{success:boolean, reason?:string}}
 */
export function mergeItems(state, itemId, baseSellPrice, hasItemFn, removeItemFn, addItemFn, mergeFailChance = 0) {
  if (!hasItemFn(itemId, MERGE_RATIO)) {
    return { success: false, reason: "yetersiz_miktar" };
  }

  removeItemFn(itemId, MERGE_RATIO);

  if (Math.random() < mergeFailChance) {
    // Başarısız birleştirme: malzemeler kaybedilir (doc: "başarısız birleştirme" ürün kaybı sebebidir)
    return { success: false, reason: "hava_kaynakli_basarisizlik" };
  }

  const qualityId = `${itemId}_kaliteli`;
  addItemFn(qualityId, 1, {
    baseItemId: itemId,
    sellPrice: Math.round(baseSellPrice * KALITELI_SATIS_CARPANI),
    quality: true,
  });

  return { success: true };
}
