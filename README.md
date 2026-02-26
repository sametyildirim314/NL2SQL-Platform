# NL2SQL Platform

## 1. Proje Özeti

NL2SQL Platform, kullanıcıların doğal dilde yazdığı veri sorgu taleplerini güvenli, şema-farkındalığı yüksek ve çalıştırılabilir SQL sorgularına dönüştürmeyi hedefleyen bir mikroservis sistemidir.

Bu proje artık tek bir **Monorepo** yapısında yönetilmektedir. Tüm ekip üyeleri geliştirmelerini bu repository içindeki kendi sorumluluk klasörlerinde yapar ve entegrasyon Docker Compose ile merkezi olarak doğrulanır.

## 2. Hızlı Başlangıç ve Ekip Çalışma Rehberi

Projeye yeni katılan veya halihazırda yerelde kod yazmaya başlamış ekip üyeleri için önerilen hızlı entegrasyon akışı aşağıdaki gibidir:

1. **Projeyi bilgisayara çekin (`git clone`)**

```bash
git clone <repo-url>
cd "Nurol Teknoloji"
```

2. **Şifreleri/ortam değişkenlerini ayarlayın (`.env`)**

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Not: Windows tarafında `cp` yerine `Copy-Item` kullanılması gerekir.

3. **Sistemi ayağa kaldırın**

```bash
docker compose up -d --build
```

Bu komut veritabanı, önbellek ve API servislerini (postgres, redis, ai-backend, core-backend, frontend) otomatik olarak derler ve çalıştırır.

4. **Önceden ayrı klasörlerde yazılan kodları monorepo’ya taşıyın (Migration)**

- Daha önce bağımsız klasörlerde geliştirdiğiniz kodları, bu repo içindeki ilgili klasöre kopyalayıp yapıştırın.
- Hedef klasörler:
  - AI geliştirmeleri: `ai-backend`
  - Core backend geliştirmeleri: `core-backend`
  - Frontend geliştirmeleri: `frontend`
- Taşıma sonrası geliştirmelere yalnızca bu monorepo üzerinden devam edin.

5. **Git akışı ve kurallar (çok önemli)**

- `main` branch’ine doğrudan push kapalıdır.
- Her geliştirici Jira görevine göre yeni bir branch açmalıdır.
  - Örnek: `NL2SQL-15-veritabani-baglantisi`
- Geliştirme tamamlandığında Pull Request (PR) açılmalıdır.
- PR, CI pipeline üzerindeki otomatik testlerden yeşil onay almadan ana projeye dahil edilemez.

## 3. Ortak Ön Koşullar (Herkesin Kurması Gerekenler)

Projeye başlamadan önce her ekip üyesinin aşağıdaki araçları kurmuş olması gerekir:

- Git
- Docker Desktop (Docker Engine + Docker Compose v2)

### Windows kullanıcıları için WSL2 rehberi (kritik)

Bu proje Linux tabanlı container’larla çalıştığı için Windows’ta WSL2 kullanımı güçlü şekilde önerilir.

Neden gerekli?
- Docker container’ları Windows üzerinde daha stabil çalışır.
- Build ve volume işlemlerinde performans artışı sağlar.
- Bash tabanlı scriptlerin (ör. `scripts/smoke-test.sh`) uyumluluğunu artırır.

Kurulum adımları:
1. PowerShell’i **Yönetici (Run as Administrator)** olarak açın.
2. Aşağıdaki komutu çalıştırın:

```powershell
wsl --install
```

3. Kurulum tamamlandıktan sonra bilgisayarı yeniden başlatın.
4. Docker Desktop açın.
5. `Settings` → `General` bölümüne gidin.
6. **Use the WSL 2 based engine** seçeneğini aktif edin.
7. (Önerilen) `Settings` → `Resources` → `WSL Integration` altında kullandığınız dağıtımı etkinleştirin.

Doğrulama:

```powershell
wsl --status
```

## 4. Klasör Sınırları ve Rol Dağılımı (Kim Nereye Dokunacak?)

Monorepo düzeninde herkes yalnızca kendi sorumluluk alanında geliştirme yapmalıdır.

- **Ömer (AI Backend)**
  - Sadece `ai-backend` klasöründe çalışır.

- **Samet (Backend)**
  - Sadece `core-backend` klasöründe çalışır.

- **Asude & Timur (Frontend)**
  - Sadece `frontend` klasöründe çalışır.

- **Mehmet Emre (DevOps/Altyapı)**
  - `infra`, `k8s`, `.github`, `scripts` klasörleri ve `docker-compose.yml` dosyasından sorumludur.

Önemli kural:
- Ekip üyeleri kendi geliştirme klasörleri dışındaki altyapı/orkestrasyon dosyalarına doğrudan müdahale etmemelidir.
- Çapraz etki yaratabilecek değişiklikler için önce PR üzerinden DevOps değerlendirmesi alınmalıdır.

## 5. Önceden Yazılan Kodları Repoya Aktarma (Migration)

Eğer ekip üyeleri daha önce kendi bilgisayarlarında bağımsız klasörlerde geliştirmeye başladıysa, aşağıdaki adımlarla monorepo yapısına geçmelidir:

1. Bu repository’yi klonlayın:

```bash
git clone <repo-url>
cd "Nurol Teknoloji"
```

2. Kendi bilgisayarınızda önceden yazdığınız kodu bulun.
3. Kodunuzu sadece kendi sorumluluk klasörünüze kopyalayın:
   - AI ekip üyesi: `ai-backend`
   - Backend ekip üyesi: `core-backend`
   - Frontend ekip üyesi: `frontend`
4. Bu aşamadan sonra geliştirmeleri yalnızca monorepo içindeki bu klasörler üzerinden sürdürün.
5. Eski bağımsız klasörlerde geliştirme yapmayın; tek kaynak monorepo olmalıdır.

## 6. Sistemi Ayağa Kaldırma ve Çalıştırma

### 6.1 Ortam değişkenlerini hazırlama

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Not: Windows PowerShell’de Linux’taki `cp` komutu yerleşik olarak bulunmadığından `Copy-Item .env.example .env` kullanılmalıdır.

### 6.2 Sistemi çalıştırma

```bash
docker compose up -d --build
```

Bu komut:
- Tüm servisleri (ai-backend, core-backend, frontend, postgres, redis) derler ve ayağa kaldırır.
- Kod değişikliklerinizi yeni imajlara yansıtır.

Kodda değişiklik yaptıktan sonra güncel halin container’a yansıması için tekrar çalıştırın:

```bash
docker compose up -d --build
```

Servis durumunu kontrol etmek için:

```bash
docker compose ps
```

## 7. Git Standartları ve İş Akışı

### 7.1 Branch açma

Çalışmaya başlamadan önce `main` branch’ini güncelleyin ve yeni bir feature/fix branch’i açın.

Örnek:

```bash
git checkout main
git pull
git checkout -b NL2SQL-123-yeni-ozellik
```

### 7.2 Branch isimlendirme standardı

Branch adları görev numarası içermelidir.

Örnek format:
- `NL2SQL-123-yeni-ozellik`
- `NL2SQL-245-fix-login`
- `NL2SQL-310-api-refactor`

### 7.3 Push, Pull Request ve CI akışı

1. Değişiklikleri commit edin.
2. Branch’inizi origin’e pushlayın.
3. GitHub üzerinde Pull Request (PR) açın.
4. CI pipeline otomatik çalışır ve temel kontrolleri gerçekleştirir:
   - Docker Compose ile sistemi ayağa kaldırma
   - Smoke test çalıştırma
   - Container loglarını artifact olarak toplama

PR sadece teknik inceleme ve CI kontrolleri başarılı olduğunda merge edilmelidir.
