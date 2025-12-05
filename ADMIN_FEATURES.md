# Admin Features Documentation

## Fitur Admin Dashboard

### 1. Paparan Guru Berdaftar
Admin dapat melihat senarai semua guru yang telah mendaftar di dalam Google Sheet.

**Lokasi:** Tab "Senarai Guru Berdaftar" di admin_dashboard.html

**Data yang dipaparkan:**
- Email Guru
- Nama Guru
- Tarikh Daftar
- Butang Tindakan (Hapus)

### 2. Padam Guru (Delete User)

Admin boleh memadamkan registrasi guru dari Google Sheet.

**Cara Menggunakan:**

1. Buka `admin_dashboard.html`
2. Cari guru yang ingin dipadam di jadual "Senarai Guru Berdaftar"
3. Klik butang "Hapus" di sebelah nama guru
4. Konfirmasi pepadaman - sistem akan memaparkan: "Adakah anda pasti mahu padam guru 'nama' (email)?"
5. Jika setuju, klik OK untuk memadam
6. Guru akan dipadamkan dari Google Sheet dan jadual akan dikemaskini automatik

### 3. Backend Functions

#### script.gs - Google Apps Script

**Function: `handleDeleteUser(email)`**
- Mencari user berdasarkan email (case-insensitive)
- Memadam row yang sepadan dari Users sheet
- Mengembalikan success/error message

**Function: `handleGetUsers()`**
- Mengambil senarai semua guru dari Users sheet
- Mengembalikan array dengan data: name, email, registrationDate

#### config.js - JavaScript Helper Functions

**Function: `deleteUser(email)`**
- Menghantar POST request ke Google Apps Script dengan action: 'deleteUser'
- Parameter: email guru yang ingin dipadam
- Mengembalikan: { success: true/false, message: '...' }

**Function: `getUsers()`**
- Menghantar GET request ke Google Apps Script dengan action: 'getUsers'
- Mengembalikan: array of users atau null jika ada error

### 4. Data Flow

```
Admin Dashboard (admin_dashboard.html)
        ↓
confirmDeleteUser() - Tanya konfirmasi
        ↓
deleteUserFromSheet() - Panggil deleteUser() dari config.js
        ↓
config.js deleteUser() - Kirim POST ke Google Apps Script
        ↓
script.gs handleDeleteUser() - Cari & padam dari Users sheet
        ↓
Kembali ke renderRegisteredUsers() - Kemaskini jadual
```

### 5. Fallback Mechanism

Jika Google Apps Script tidak dikonfigurasi:
- Sistem akan cuba ambil senarai dari localStorage
- Butang Hapus masih akan ada tapi hanya bekerja untuk localStorage
- Jadual akan menunjukkan "Memuatkan..." sementara sistem mendapatkan data

### 6. Keselamatan

- Setiap padam memerlukan konfirmasi dua langkah (click butang + confirm dialog)
- Case-insensitive email matching untuk elakkan masalah case sensitivity
- Email divalidasi sebelum pepadaman
- Tiada respon balas yang boleh mengekspos maklumat sensitif

### 7. Error Handling

- Jika padam gagal, sistem akan paparkan: "Ralat: [error message]"
- Jika guru tidak dijumpai, akan paparkan: "Ralat: Pengguna tidak dijumpai"
- Jadual tidak akan dikemaskini jika ada error

---

**Catatan:** Pastikan Google Apps Script sudah di-deploy sebagai Web App sebelum menggunakan fitur admin ini.
