# BoysGadgetV2

Project fullstack untuk katalog gadget, spesifikasi, berita, dan trending gadget berbasis data database.

## Fitur Utama

- Register dan login tanpa OTP.
- Admin bisa menambahkan gadget.
- Admin bisa menambahkan spesifikasi gadget secara dinamis.
- Admin bisa menambahkan berita dan menghubungkannya ke satu atau beberapa gadget.
- Trending gadget dihitung dari data asli aplikasi:
  - jumlah view gadget,
  - jumlah berita terkait,
  - jumlah spesifikasi,
  - recency update data gadget.

## Stack

- Backend: Node.js, Express, MySQL, JWT.
- Frontend: React, Vite, Axios.
- Database: MySQL/MariaDB.

## Struktur Folder

```text
backend/
  db/schema.sql
  src/server.js
  src/routes/
frontend/
  src/
README.md
```

## Setup Database

1. Buka MySQL, phpMyAdmin, Laragon, XAMPP, atau terminal MySQL.
2. Buat database baru dengan nama `boysgadget2`.
3. Import file skema berikut:

```text
backend/db/schema.sql
```

4. Setelah import selesai, kamu bisa login dengan akun admin awal:

```text
username: admin
password: password123
```

> Catatan: file skema hanya membuat struktur tabel di database. File foto yang sudah ada di folder `backend/uploads/` tidak akan otomatis dihapus. Kalau ingin membersihkan gambar lama, kamu bisa hapus folder tersebut secara manual.


## Setup Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Sesuaikan `.env` kalau password MySQL kamu berbeda:

```env
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=boysgadget2
JWT_SECRET=ganti_dengan_secret_yang_panjang
FRONTEND_URL=http://localhost:5173
```

Backend berjalan di:

```text
http://localhost:4000/api
```

## Setup Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend berjalan di:

```text
http://localhost:5173
```

## Rumus Trending

Endpoint:

```text
GET /api/gadgets/trending
```

Rumus skor di backend:

```text
view_count
+ jumlah_berita_terkait * 25
+ jumlah_spesifikasi * 3
+ bonus_update_terbaru
```

Artinya trending bukan data tempelan statis. Jika admin menambah berita terkait gadget, melengkapi spesifikasi, atau gadget sering dibuka user, posisi trending bisa berubah.

## Endpoint Penting

Public:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/gadgets
GET  /api/gadgets/trending
GET  /api/gadgets/:id
GET  /api/articles
GET  /api/articles/:slug
```

Admin:

```text
GET    /api/admin/summary
POST   /api/admin/gadgets
PUT    /api/admin/gadgets/:id
DELETE /api/admin/gadgets/:id
POST   /api/admin/articles
PUT    /api/admin/articles/:id
DELETE /api/admin/articles/:id
```
