# Akvaryum Ustası — Godot sürümü

Bu klasör gerçek, bağımsız bir Godot 4 projesidir. Web sunucusu, npm, Prisma veya internet bağlantısı gerektirmez. Godot 4.7.2 ile çalıştırılıp test edildi; standart GDScript sürümünü kullanır, .NET gerekmez.

## Aç ve oyna

1. [Godot'un standart Windows sürümünü](https://godotengine.org/download/windows/) indirip ZIP'ten çıkar. Diğer işletim sistemleri için aynı siteden uygun sürümü seç.
2. Godot proje yöneticisinde **İçe aktar / Import** seçeneğine bas.
3. Bu klasördeki **`project.godot`** dosyasını seç.
4. Projeyi aç ve **F5** ile çalıştır.

Tüm kaynakları içeren bu klasörü ayrı bir yere kopyalayarak da açabilirsin. Ana sahne `scenes/aquarium.tscn`.

## Oynanış

- Boş su alanına tıkla / dokun: dört yem tanesi bırak. **Boşluk** aynı işlemi tankın ortasında yapar.
- Balığa tıkla: doygunluğunu ve büyümesini gör, ismini değiştir.
- Altın kabarcığına tıkla: +15 altın kazan.
- **Mağaza**: balık ve dekor satın al; kilitli türler belirtilen seviyede açılır.
- **Esc / Menü**: duraklat, kaydet veya onay vererek yeni oyun başlat.
- Mağaza ve balık bilgisi açıkken simülasyon durur. Uygulama kapalıyken açlık ilerlemez.

## Bu sürümde çalışanlar

İki başlangıç balığı ve 100 altın; 8 balık türü; 10 balık kapasitesi; yeme yönelen balıklar; büyüme, açlık ve yemle toparlanma; 7 dekorun etkileri; ilk 10 görev ve sonrasında ustalık seviyeleri; altın kabarcıkları; hava motoru ve hazine sandığı; zamanla değişen su rengi; ses aç/kapat; Türkçe isimler; yerel kayıt.

Görseller Godot çizim komutlarıyla üretilir. Türlere özgü gövde, kuyruk ve desenler vardır. Bu, web sürümünün temel mekaniklerini taşıyan stilize ilk sürümdür; görseller birebir kopya değildir. Arka plan müziği henüz eklenmedi. Bir akvaryum oyunu olarak tasarlanmıştır; türler arası gerçek bakım uyumluluğunu modellemez.

## Kayıtlar

Godot'un `user://aquarium_v1.json` dosyasına, 12 saniyede bir ve kapanırken kaydeder. Satın alma ve isim değişikliği de hemen kaydedilir. Windows'ta normal konum:

```text
%APPDATA%\Godot\app_userdata\Akvaryum Ustası\aquarium_v1.json
```

Bir önceki sağlam kayıt `.bak` dosyasında tutulur. Bozuk birincil kayıtta bu yedek denenir. İkisi de okunamıyorsa eski dosyaların üzerine otomatik yazılmaz; Menü > Yeni oyun ile açıkça sıfırlanabilir. Geçerli yeni oyunun ilk kaydı başarılı yazıldıktan sonra önceki sağlam kayıt yedek olur. Sonraki kayıtlar bu yedeği günceller; kalıcı arşiv istiyorsan `.bak` dosyasını ayrıca kopyala.

Godot ve web sürümlerinin kayıtları birbirinden bağımsızdır. Seviye içindeki kısmi görev ilerlemesi Godot kaydında korunur.

## Geliştirmeye nereden başlanır?

| Dosya | Görevi |
| --- | --- |
| `data/catalog.json` | Balık türleri, fiyatlar, açılma seviyeleri, dekorlar ve görevler |
| `scripts/game_state.gd` | Ekonomi, büyüme, açlık, satın alma, görev ilerlemesi |
| `scripts/fish.gd` | Yüzme, yeme yönelme ve balık çizimleri |
| `scripts/tank_view.gd` | Su, bitkiler, taban, dekorlar, kabarcıklar |
| `scripts/interface.gd` | Türkçe arayüz, mağaza, isim verme ve menüler |
| `scripts/save_store.gd` | Doğrulama, sürümlü kayıt ve yedek kurtarma |
| `scripts/aquarium.gd` | Sahneyi ve sistemleri birbirine bağlayan koordinatör |
| `tests/run_tests.gd` | Ekonomi, ilerleme, kayıt ve sahne kontrolleri |

Yeni bir tür için katalogdaki mevcut bir türü örnek al. `id` benzersiz olmalı; fiyat, açılma seviyesi, renk, gövde oranı, yüzme hızı ve açlık oranı aynı kayıttadır. Yeni bir oyun mekaniği eklerken simülasyon kuralını `game_state.gd` içinde tut; arayüz yalnızca bu kuralı çağırsın. Kayıt biçimi değişirse `version` değerini yükseltmekle birlikte eski kayıt için dönüşüm eklenmelidir.

Önceliklendirilmiş tasarım ve geliştirme adımları: **[GELISTIRME_PLANI.md](GELISTIRME_PLANI.md)**.

## Doğrulama

Komutlarda `godot` yerine kendi Godot çalıştırılabilir dosyanın yolunu kullanabilirsin:

```sh
godot --headless --path . --import
godot --headless --path . --script res://tests/run_tests.gd -- --test-session
godot --headless --path . --quit-after 180 -- --test-session
```

Testler gerçek oyuncu kaydına yazmaz. Yerel `test_aquarium_save.json` dosyaları test sonunda temizlenir. Test sayacı başarısızlıklarda sıfırdan farklı çıkış kodu verir. Bu kontroller oyunun eğlenceli olduğunu veya farklı bilgisayarlardaki performansını kanıtlamaz; gerçek oyuncu denemesi ve hedef cihaz testleri ayrıca gerekir.

## Dışa aktarma

Bu paket editörde açılacak kaynak projedir; hazır Windows EXE veya Android APK içermez. Dışa aktarmak için Godot'tan uygun export templates paketini yükle, Project > Export bölümünde platform ekle. Katalog dosyası için **Resources > Filters to export non-resource files** alanına `*.json` ekle. Üretilen oyunu farklı bir klasörde açıp yeni kayıt / devam et akışını doğrula.
