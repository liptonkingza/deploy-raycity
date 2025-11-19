# วิธีตั้งค่า Google Sheets เป็น Database

## ขั้นตอนการตั้งค่า

### 1. สร้าง Google Sheet
1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้าง Sheet ใหม่ชื่อ "RayCity Users"
3. ตั้งชื่อ Sheet เป็น "users" (หรือชื่ออื่นที่ต้องการ)
4. สร้าง header row แรก:
   - Column A: `username`
   - Column B: `password`
   - Column C: `createdAt`

### 2. สร้าง Google Apps Script
1. ใน Google Sheet ที่สร้างไว้ คลิก **Extensions** → **Apps Script**
2. ลบโค้ดเดิมทั้งหมด
3. วางโค้ดจากไฟล์ `google-apps-script.js`
4. บันทึก (Ctrl+S) และตั้งชื่อโปรเจค เช่น "RayCity API"

### 3. Deploy เป็น Web App
1. คลิก **Deploy** → **New deployment**
2. คลิกไอคอน ⚙️ (gear) → **Web app**
3. ตั้งค่า:
   - **Description**: RayCity API
   - **Execute as**: Me
   - **Who has access**: Anyone
4. คลิก **Deploy**
5. คัดลอก **Web App URL** ที่ได้ (จะใช้ในโค้ด JavaScript)

### 4. ตั้งค่าในโค้ด
1. เปิดไฟล์ `js/auth.js`
2. หา `const GOOGLE_SHEETS_API_URL` 
3. วาง Web App URL ที่ได้จากขั้นตอนที่ 3

## หมายเหตุ
- ข้อมูลจะถูกเก็บใน Google Sheet ที่คุณสร้าง
- ข้อมูลจะอยู่ถาวรและ sync กันได้
- ต้องให้ permission ครั้งแรกเมื่อเรียกใช้ API

