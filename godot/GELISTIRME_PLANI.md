# Akvaryum Ustası — geliştirme planı

## Oyunun yönü

Hedef: oyuncunun birkaç dakikada balıklarıyla bağ kurduğu, kısa aralarla döndüğünde akvaryumunda anlamlı değişim gördüğü sakin bir bakım ve koleksiyon oyunu. İlk sürüm masaüstünde tek oyunculu ve çevrimdışı kalır. Sonraki platform kararı, bu döngü gerçek oyuncularla denendikten sonra verilir.

Temel döngü: **balığını gözle → ihtiyacını anla → besle / bakım yap → gelişimini gör → ödül kazan → akvaryumu kişiselleştir**.

Mevcut port bu döngünün besleme, büyütme, ödül ve satın alma kısmını çalıştırır. Bundan sonra öncelik yeni mağaza kalemlerinden önce bakımın anlaşılır ve tatmin edici olmasıdır.

## 0.1 — taşınan temel (bu pakette tamamlandı)

- Godot'ta açılabilen proje ve tekrar kullanılabilen balık sahnesi.
- 8 tür, 7 dekor, 10 başlangıç görevi ve ustalık görevleri.
- Yem arayan hareket, doygunluk, büyüme, aç balığa yemle destek olma.
- Altın kazanımı, kilitler, kapasite, mağaza ve isim verme.
- Kişiye ait yerel kayıt, görev ilerlemesinin korunması, bozuk kayıttan yedek kurtarma.
- Türkçe arayüz, duraklatma ve ses efektleri.

Kapsam sınırı: gerçekçi biyoloji, su kimyası, üreme, sürü davranışı, çoklu tank ve kayıt içe aktarma henüz yok. Su rengi zamanla değişir; bunun görev veya tür davranışı üzerinde henüz bir etkisi yoktur.

## 0.2 — balıklar canlı hissettirsin (ilk geliştirme turu)

**Sorun:** Yalnızca yem noktasına gitmek, balıklara yeterince kişilik kazandırmıyor. Aynı noktada üst üste gelebiliyorlar.

Yapılacaklar:

1. Durumları ayır: gezinme, yem arama, yeme, dinlenme ve açlık. Geçişleri tek bir davranış katmanında topla.
2. Yumuşak ayrışma ve yön hizalama ekle; her tür için aynı hız yerine küçük, kalıcı bireysel farklar üret.
3. Tetra ve lepisteste sürüye yakın kalmayı; beta ve melek balığında daha sakin bağımsız yüzmeyi dene. Bunlar ilk etapta oyun davranışlarıdır; tür bakımıyla ilgili gerçek bilgi iddiası taşımasın.
4. Dönüşlerde vücudun yön değiştirmesini iyileştir; ağızda yem yakalama ve kısa yutma hareketi ekle.
5. Seçili balık adını ve durumunu balığın yakınında göster; oyuncu panel açmadan açlığı fark etsin.

Tamamlanma ölçütü: 10 balık ve 80 yemle uzun denemede balık tank dışına çıkmaz, yem hedefi kalmadığında takılmaz, üst üste kalan balıklar ayrılır. Üç yeni oyuncu ilk dakika içinde nasıl yem vereceğini ve aç balığı nasıl tanıyacağını sözlü yardım almadan gösterebilir.

Değişecek yerler: `fish.gd`, davranış için yeni `fish_behavior.gd`, `game_state.gd` ve sahne testleri. Kayıt değişirse göç testi eklenir.

## 0.3 — anlaşılır bakım ve ekonomi

**Sorun:** İlk sürümde ücretsiz yemden altın üretmek ana gelir kaynağı. Akvaryum bakımı için az karar var; yeni balıklar çoğunlukla daha pahalı gelir kaynaklarına dönüşüyor.

Yapılacaklar:

1. Önce tek yeni gösterge ekle: su temizliği. Yenmeyen yemler temizliği yavaşça düşürsün; temizleme eylemi net geri bildirim versin.
2. Temizliği doğrudan ölüm cezasına bağlama. Önce balık konforu ve ödül verimi üzerindeki küçük etkisini dene; açıklamasını arayüzde göster.
3. Yem miktarı ile ödül arasında bekleme / iştah dengesi kur. Sürekli tıklamak yerine gözlemleyip uygun anda beslemek değerli olsun.
4. İlk üç görevde yemleme, altın toplama ve ilk satın almayı öğret. Her görev tek bir yeni davranışı anlatsın.
5. Her türün fiyatını ve gelirini süreye göre karşılaştır. Hedef deneme aralığı: ilk yeni balık 3–5 dakikada; ilk dekor 5–8 dakikada erişilebilir olsun. Bunlar test edilecek tasarım hedefleridir, ölçülmüş sonuçlar değildir.

Tamamlanma ölçütü: temizliğin neden düştüğü anlaşılır; oyuncu parasızken temel bakımı yapabilir; bir kaydı kapatıp açmak görev ilerlemesini değiştirmez. İlk 15 dakikada parasız kalıp hiçbir şey yapamama durumu oluşmaz.

## 0.4 — kişisel akvaryum

Yapılacaklar: dekorları sürükleyerek yerleştirme ve çevirme; yerleşimi kaydetme; 3 tank arka planı; balık albümü; isim, edinilme tarihi ve büyüme geçmişi; birkaç görsel büyüme aşaması.

Tamamlanma ölçütü: dekorlar tank sınırları içinde kalır; satın alma ile yerleştirme birbirinden ayrılır; yüklenen düzen aynen geri gelir. Bir yeni balık türü çoğunlukla veri eklenerek tanımlanır. Kullanılan görsel ve seslerin kaynak / kullanım hakları dosyası tutulur.

Teknik ihtiyaç: katalogdaki dekor verisini oyuncunun dekor yerleşim verisinden ayır. `save_version = 2` için 0.1 kaydını yeni varsayılan konumlara taşıyan dönüşüm yaz.

## 0.5 — ikinci tank ve habitatlar

Önce karar: rahat bir koleksiyon oyunu mu, tür uyumuna dayanan hafif bir simülasyon mu? İki yaklaşımın arayüz yükü farklıdır; oyuncu denemesinden sonra seç.

Tür uyumu seçilirse tatlı su / deniz suyu tankları ve sıcaklık aralıkları gerçek kaynaklarla doğrulanmalı. Japon balığı, beta ve palyaço balığı aynı bakım koşullarını paylaşmıyor; mevcut karışık tank eğitimsel doğruluk iddiasıyla sunulmamalı.

Yapılacaklar: ikinci tank, tanklar arasında balık taşıma, her tanka ayrı kayıt ve kapasite. Üreme ancak tank yönetimi anlaşılır olduktan sonra değerlendirilir.

## Yayına hazırlık

1. Gerçek Windows EXE üret; Godot kurulu olmayan ayrı bir makinede ilk açılışı ve kayıt konumunu dene.
2. Pencere boyutu, klavye odağı, metin taşması ve sesi kapalı kullanım kontrol edilsin. 10 balıkta hedef cihazda akıcı çalışsın; kare süresi ölçülüp raporlansın.
3. Ses seviyeleri, kayıt hatası mesajları ve bozuk / eski kayıt senaryoları kontrol edilsin.
4. Üç oyuncuyla kısa deneme yap: ilk yem, ilk satın alma, görev anlaşılırlığı, geri dönme isteği. Düzeltmeleri gözlenen sorunlara göre sırala.
5. Proje lisansını sahibi seçsin. Sürüm notu, ekran görüntüleri ve indirme paketini hazırla; mağaza veya başka barındırma yayını ayrıca kararlaştırılır.

Mobil hedeflenirse bundan sonra dokunma hedefleri, yatay / dikey düzen, cihazda duraklatma ve kayıt güvenliği ele alınır. Masaüstü penceresini küçültmek tek başına mobil uyarlama sayılmaz.

## Şimdilik ertelenenler

Çok oyunculu mod, hesap sistemi, bulut kayıt, reklam, uygulama içi satın alma ve karmaşık gerçek zamanlı su kimyası ilk turlara alınmaz. Bunlar bakım döngüsü çalışmadan ek yük getirir. Hiçbiri mevcut paketin özelliği olarak sunulmaz.

## Her geliştirme turunun düzeni

Bir küçük davranış seç → beklenen oyuncu deneyimini yaz → ilgili veri / simülasyon değişikliğini yap → anlamlı test ekle → Godot'ta gerçek oynanışla kontrol et → kayıt uyumluluğunu doğrula → sürüm notunu güncelle.

İlk somut iş: **balıkların üst üste gelmesini azaltan ayrışma davranışı ve yumuşak dönüş**. Yeni balık veya eşya eklemeden mevcut iki başlangıç balığında farkı görerek değerlendir.
