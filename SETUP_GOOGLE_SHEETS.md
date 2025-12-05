# Panduan Setup Google Apps Script sebagai Database

> **LEBIH MUDAH** - Tak perlu API Key, tak perlu Google Cloud Console!

## Langkah 1: Buat Google Sheet

1. Buka [Google Sheets](https://sheets.google.com)
2. Klik **Blank** untuk buat spreadsheet baru
3. Namakan spreadsheet: "PPD Database" (atau nama lain)
4. Sheet akan automatik buat tab bernama "Users" nanti (tak perlu buat manual)

## Langkah 2: Buka Apps Script Editor

1. Dalam Google Sheet yang baru dibuat, klik menu **Extensions** (di menu bar atas)
2. Pilih **Apps Script**
3. Tab baru akan terbuka dengan Apps Script editor
4. Anda akan nampak fail `Code.gs` dengan fungsi `myFunction()` default

## Langkah 3: Copy Script

1. **SELECT ALL** kod default dalam `Code.gs` (tekan Ctrl+A)
2. **DELETE** semua kod (tekan Delete atau Backspace)
3. Buka fail **`script.gs`** dalam folder projek anda:
   - Path: `c:\Users\User\OneDrive\Documents\UITM\PPD\script.gs`
4. **SELECT ALL** kod dalam fail `script.gs` (tekan Ctrl+A)
5. **COPY** semua kod (tekan Ctrl+C)
6. Pergi balik ke Apps Script editor
7. **PASTE** semua kod (tekan Ctrl+V) - pastikan tiada kod lama tertinggal
8. Klik icon **💾 Save** (atau tekan Ctrl+S)
9. Beri nama project: "PPD Backend API" (atau nama lain)

⚠️ **PENTING**: Pastikan HANYA kod dari fail `script.gs` sahaja dalam editor. Jangan ada kod lain atau function lain.

## Langkah 4: Deploy sebagai Web App

1. Dalam Apps Script editor, klik butang **Deploy** (di sebelah kanan atas)
2. Pilih **New deployment** (atau **Manage deployments** jika ada deployment lama)
3. Klik icon ⚙️ **"Select type"** di sebelah kiri
4. Pilih **Web app**

### Configure Deployment:

5. **Description**: Tulis "PPD API v1" (atau apa-apa)
6. **Execute as**: Pilih **"Me (your-email@gmail.com)"**
7. **Who has access**: Pilih **"Anyone"** (PENTING!)
8. Klik **Deploy**

### Authorize Access:

9. Popup akan muncul minta permission
10. Klik **"Authorize access"**
11. Pilih akaun Google anda
12. Jika ada warning "Google hasn't verified this app", klik **"Advanced"**
13. Klik **"Go to [Project Name] (unsafe)"**
14. Klik **"Allow"** untuk beri permission

### Copy Web App URL:

15. Selepas deploy, anda akan dapat **Web App URL**
16. URL format: `https://script.google.com/macros/s/AKfycbz.../exec`
17. **COPY** URL ini - anda perlukan untuk config.js

⚠️ **PENTING**: Jika anda udah ada deployment lama, pilih **"Manage deployments"** dan **edit** deployment tersebut untuk update ke versi terbaru dengan stock features

## Langkah 5: Setup config.js

1. Buka fail `config.js` dalam folder projek anda
2. Gantikan **Web App URL** yang anda copy dari Langkah 4:

```javascript
const GOOGLE_APPS_SCRIPT_CONFIG = {
  webAppUrl: 'YOUR_WEB_APP_URL_HERE'  // Paste Web App URL di sini
};
```

**Contoh yang betul:**
```javascript
const GOOGLE_APPS_SCRIPT_CONFIG = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzXXXXXXXX/exec'
};
```

3. **Save** fail config.js

## Langkah 7: Test Sistem

### Test Register & Login:
1. Buka `register_guru.html` dalam browser
2. Daftar akaun baru dengan:
   - Nama: Test User
   - Email: test@example.com
   - Password: 123456
3. Tunggu sebentar (Google Apps Script perlu masa process)
4. **Check Google Sheet** - sheet "Users" akan auto-create dan data akan muncul:
   - Column A: Nama
   - Column B: Email
   - Column C: Password
   - Column D: Tarikh Daftar
5. Cuba login menggunakan credentials yang baru didaftar
6. Jika berjaya, anda akan redirect ke `guru_order.html`

### Test Stock Management:
1. Buka `teacher_stock.html`
2. Tambah barang baru (contoh: Pensel, stok 50)
3. **Check Google Sheet** - sheet "Items" akan auto-create dengan data
4. Edit stok barang - Google Sheet akan auto-update
5. Data akan tersimpan dan boleh access dari device lain

## Troubleshooting

### Error: "localStorage is not defined"

**Sebab**: Anda ada kod lain dalam Apps Script editor yang tidak sepatutnya ada

**Penyelesaian**:
1. Pergi ke Apps Script editor
2. **DELETE SEMUA** kod dalam `Code.gs`
3. Copy semula kod dari fail `script.gs` (dari folder projek anda)
4. Pastikan HANYA kod dari `script.gs` sahaja - tiada kod lain
5. Save dan redeploy (Deploy > Manage deployments > New version)

### Pendaftaran tidak berfungsi / Data tidak masuk

1. **Check browser console** (tekan F12) untuk error messages
2. **Check Web App URL** dalam config.js - pastikan betul-betul
3. **Check deployment settings**:
   - "Execute as" MESTI **"Me"**
   - "Who has access" MESTI **"Anyone"**
4. **Redeploy** - Cuba buat deployment baru:
   - Pergi Apps Script editor
   - Deploy > Manage deployments
   - Klik icon pensil ✏️
   - Update version ke "New version"
   - Deploy
   - Copy URL baru dan update config.js

### Login tidak berfungsi

1. **Check Google Sheet** - pastikan data betul-betul ada
2. **Check format** - Pastikan column order betul: Nama | Email | Password
3. **Check typo** - Email dan password mesti exact match (case sensitive)
4. Tunggu 2-3 saat lepas register sebelum cuba login (Google Apps Script perlu masa sync)

### Error: "Google hasn't verified this app"

- Ini normal! Script ini untuk personal use
- Klik **"Advanced"** > **"Go to [Project Name] (unsafe)"** > **"Allow"**
- Hanya anda yang boleh run script ini

### Data tidak save selepas refresh

- Ini kerana masih guna localStorage fallback
- Check browser console - ada warning "Google Apps Script belum dikonfigurasi"?
- Pastikan Web App URL sudah di-set dalam config.js

## Update Deployment (Jika ada perubahan pada script)

Jika anda edit kod dalam Apps Script:

1. Pergi ke Apps Script editor
2. Klik **Deploy** > **Manage deployments**
3. Klik icon pensil ✏️ untuk edit deployment
4. Dalam "Version", pilih **"New version"**
5. Klik **"Deploy"**
6. URL akan sama, tak perlu update config.js

## Keselamatan

⚠️ **PERHATIAN**: Setup ini menyimpan password dalam plain text. Untuk production:
1. Gunakan hashing untuk password (tambah crypto dalam Apps Script)
2. Tambah validation untuk email format
3. Limit rate request untuk elak spam
4. Set permission "Execute as: Me" supaya hanya anda yang control data

## Kelebihan Setup Ini

✅ **TAK PERLU API KEY** - Lebih mudah setup
✅ **TAK PERLU Google Cloud Console** - Jimat masa
✅ Guru boleh access dari mana-mana device
✅ Data tersimpan di cloud (Google Sheets)
✅ Mudah untuk view dan manage data
✅ **Free** dan tak ada quota limits untuk personal use
✅ Fallback ke localStorage jika belum setup
✅ Script run di server Google (lebih selamat)

## Limitasi

- Google Apps Script quota: 20,000 URL fetches per day (cukup untuk small-medium usage)
- Google Sheet max: 10 million cells
- Password tidak di-encrypt (tidak selamat untuk production)
- Memerlukan internet connection
- Slightly slower response time (2-3 saat) berbanding direct API
