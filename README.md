# 📜 ระบบสแกนใบอนุญาต (License Scanner Web App)

เว็บแอปสำหรับสแกนอ่านข้อมูลใบอนุญาตสาธารณสุขและร้านขายยา (ข.ย.1, ข.ย.2, ข.ย.3, ส.พ.7 ฯลฯ) ประมวลผลแบบ **100% Client-Side On-Device OCR** ผ่าน Tesseract.js (WebAssembly) ในเบราว์เซอร์ของผู้ใช้ และบันทึกข้อมูลเข้า Google Sheets

---

## ✨ คุณสมบัติหลัก (Key Features)

- 🔒 **100% On-Device OCR (Privacy First)**: ภาพถ่ายใบอนุญาตไม่ออกจากเครื่องผู้ใช้ไปยังเซิร์ฟเวอร์ AI ภายนอก
- 📄 **รองรับทั้งรูปภาพ และ PDF**: อัปโหลดภาพถ่าย (JPG, PNG, WEBP) หรือไฟล์ PDF (รองรับ Multi-page PDF)
- 📸 **Mobile-First & Camera Support**: สแกนถ่ายรูปจากกล้องมือถือได้ทันทีด้วย UI ภาษาไทยสำหรับพนักงานสาธารณสุข
- ⚡ **Batch Scanning Queue**: อัปโหลดหลายใบสแกนพร้อมกันในรอบเดียว
- 🎯 **Confidence Score Indicator**: แสดงระดับความเชื่อมั่นในการอ่านข้อความแต่ละฟิลด์ (เขียว/เหลือง/แดง)
- 📊 **Google Sheets Integration**: ส่งข้อมูลบันทึกลง Google Sheets ผ่าน Google Apps Script Web App Endpoint

---

## 🚀 ขั้นตอนการติดตั้งและ Deploy บน Vercel

### วิธีที่ 1: Deploy ผ่าน Vercel CLI (ง่ายที่สุด)

1. ติดตั้ง Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. สั่ง Deploy จากไดเรกทอรี `license-scanner`:
   ```bash
   cd license-scanner
   vercel
   ```
3. ทำตามคำแนะนำบนหน้าจอ รับ production URL พร้อมใช้งานทันที!

### วิธีที่ 2: Deploy ผ่าน GitHub + Vercel Dashboard

1. Push โฟลเดอร์ `license-scanner` ขึ้น GitHub Repository
2. เข้าไปที่ [Vercel Dashboard](https://vercel.com/dashboard) -> เลือก **Add New Project**
3. Import repository แล้วกด **Deploy** (เนื่องจากเป็น Static Site ไม่ต้องตั้งค่า Build Command)

---

## 📊 ขั้นตอนการตั้งค่า Google Sheets Backend (Google Apps Script)

1. สร้าง **Google Sheet ใหม่** ตั้งชื่อว่า `License Scanner — ข้อมูลใบอนุญาต`
2. ไปที่เมนู **ส่วนขยาย (Extensions)** -> **Apps Script**
3. คัดลอกโค้ดจากไฟล์ `google-apps-script/Code.gs` ทั้งหมด นำไปวางแทนที่โค้ดเดิมใน Apps Script Editor
4. กดปุ่ม **ทบทวน (Deploy)** -> **การตั้งค่าใช้งานใหม่ (New deployment)**
5. ตั้งค่าการ Deploy:
   - **เลือกประเภท**: เว็บแอป (Web app)
   - **เรียกใช้ในฐานะ (Execute as)**: ฉัน (อีเมลของคุณ)
   - **ผู้มีสิทธิ์เข้าถึง (Who has access)**: ทุกคน (Anyone)
6. กด **ทบทวนการทำงาน (Deploy)** และคัดลอก **Web App URL**
7. นำ Web App URL ไปวางในช่องตั้งค่า **⚙️ ตั้งค่า Google Sheets Web App** บนหน้าเว็บแอป License Scanner

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
license-scanner/
├── index.html                  # หน้าจอเว็บแอปหลัก (HTML5 UI)
├── css/
│   └── style.css               # สไตล์ Vanilla CSS (Mobile-First responsive)
├── js/
│   ├── app.js                  # Main Application Orchestrator
│   ├── ocr-engine.js           # Tesseract.js WASM Wrapper & Image Pre-processing
│   ├── parser.js               # License Classification & Field Extractor (Regex)
│   ├── pdf-handler.js          # PDF to Canvas Converter (pdf.js)
│   └── sheets-api.js           # Google Apps Script Web App Client
├── google-apps-script/
│   └── Code.gs                 # Backend Script สำหรับฝังใน Google Sheets
├── vercel.json                 # Vercel Configuration
└── README.md                   # เอกสารคู่มือการใช้งาน
```

---

## 🔮 แผนการปรับปรุงในอนาคต (Future Roadmap)

- 📌 **Dynamic Form Schema (Front-end)**: ปรับเปลี่ยนหัวข้อฟิลด์ในฟอร์มแบบไดนามิกตามประเภทใบอนุญาตที่ตรวจจับได้ เนื่องจากใบอนุญาตแต่ละประเภทมีชื่อเรียกและโครงสร้างข้อมูลแตกต่างกัน
- 📌 **Multi-Form Regex Rules (Parser)**: เพิ่มและปรับแต่งชุดคำสั่ง Regex Rules สำหรับใบอนุญาตประเภทเฉพาะทาง (เช่น ใบอนุญาตผลิตเครื่องมือแพทย์, ใบอนุญาตประกอบโรคศิลปะ ฯลฯ) เมื่ออัปโหลดภาพตัวอย่างจริง
- 📌 **Multi-Tab Sheets Sync (Back-end)**: ปรับปรุง Google Apps Script ให้รองรับการแยก Tab ใน Google Sheets หรือปรับเพิ่มคอลัมน์ให้อัตโนมัติตามประเภทใบอนุญาต

