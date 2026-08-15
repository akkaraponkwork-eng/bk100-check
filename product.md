# Product Requirements Document (PRD): bk100-check ERP

> **เวอร์ชัน:** 2.0 (ERP Edition)  
> **อัปเดตล่าสุด:** 2026-08-11  
> **เป้าหมาย:** พัฒนาจากระบบจัดเวรเบื้องต้น → ระบบ ERP สำหรับหน่วยงานทหาร/ตำรวจ  
> **Timeline:** ภายใน 1 เดือน

---

## 1. Overview (ภาพรวมโปรเจกต์)

| รายการ | รายละเอียด |
|---|---|
| **ชื่อโปรเจกต์** | bk100-check ERP |
| **ประเภทองค์กร** | หน่วยงานทหาร / ตำรวจ (มีระบบยศ, เวรปฏิบัติหน้าที่) |
| **จำนวนผู้ใช้งาน** | 50 – 200 คน |
| **ฐานข้อมูล** | Google Sheets (คงไว้, ขยาย Tab เพิ่ม) |
| **Database Strategy** | ไม่เปลี่ยน Tech Stack — ขยาย Sheet tabs สำหรับโมดูลใหม่ |

---

## 2. User Roles & Permissions (สิทธิ์การใช้งาน)

| Role | สิทธิ์ที่มี |
|---|---|
| **Admin** | จัดการระบบทั้งหมด, เพิ่ม/แก้ไข/ลบบุคลากร, ตั้งค่าระบบ |
| **Commander** | อนุมัติ/ปฏิเสธการลา, ดูรายงานสรุปเวรผู้ใต้บังคับบัญชา |
| **Duty Officer** | จัดเวร, แก้ไขตารางเวร, ใช้งาน Auto-assign |
| **NCO / Sergeant** | ดูสถิติเวรนายสิบที่ตัวเองรับผิดชอบ |
| **Personnel** | ดูตารางเวรตัวเอง, ยื่นคำขอลาผ่านระบบ |

### Authentication
- **วิธี Login:** LINE Login (OAuth ผ่าน LINE)
- ผูก LINE Account กับ Personnel ID ในระบบ

---

## 3. Modules & Features (โมดูลและฟีเจอร์)

### Module 1: HR & Personnel Management
**Google Sheet Tab:** `Personnel`

**ข้อมูลที่เก็บ (เพิ่มเติมจากเดิม):**
- ข้อมูลเดิม: id, rank, firstName, lastName, batch, phone, status, dutyCount, isNCOEligible, num
- **ข้อมูลใหม่:** ประวัติการลา (ลิงก์ไปยัง Sheet `Leave`)

---

### Module 2: Duty & Scheduling (จัดเวร)
**Google Sheet Tabs:** `Duty`, `DutyMeta`

**ฟีเจอร์:**
- **Manual Mode:** Duty Officer กำหนดเวรเองผ่านหน้า UI (ลากวาง Kanban / เลือกจากปฏิทิน)
- **Auto-assign Mode:** ระบบแนะนำชื่อโดยอัลกอริธึม Round-robin (เวียนตามลำดับ) โดยมีเงื่อนไขว่า **ต้องไม่อยู่ระหว่างลา** เท่านั้น
- **สามารถสลับระหว่าง Manual / Auto ได้**
- **Push Notification:** แจ้งเตือนบุคลากรผ่าน PWA เมื่อตารางเวรเปลี่ยนแปลง

---

### Module 3: Leave Management (ระบบลา)
**Google Sheet Tab:** `Leave`

**ประเภทการลาที่รองรับ:**
- ลาเยี่ยมญาติ *(ประเภทเดียวในปัจจุบัน)*

**Workflow การลา:**
```
บุคลากร (Personnel) → ยื่นคำขอลาในระบบ
       ↓
Commander → รับแจ้งเตือน (Push Notification / PWA)
       ↓
Commander → อนุมัติ / ปฏิเสธ ผ่านระบบ
       ↓
บุคลากร → รับแจ้งเตือนผลการอนุมัติ
       ↓
Duty Officer → ระบบแจ้งให้ทราบว่ามีคนลา (เพื่อจัดเวรทดแทน)
```

**ข้อมูลที่เก็บ:** id, personnelId, type, startDate, endDate, reason, status (pending/approved/rejected), approvedBy, approvedAt

---

### Module 4: NCO Management (เวรนายสิบ)
**Google Sheet Tab:** `NCO`

**ฟีเจอร์:**
- แสดงผลรายงานเวรนายสิบรายเดือน
- NCO ดูสถิติเวรที่ตัวเองรับผิดชอบได้
- รายงานสรุป NCO Report (Export ได้)

---

### Module 5: Reporting & Analytics (รายงาน)

| รายงาน | รายละเอียด | Export |
|---|---|---|
| Dashboard ภาพรวม | ใครอยู่เวร / ใครลา วันนี้ | — |
| ตารางเวรรายวัน | Daily Schedule แสดงรายชื่อ/ตำแหน่ง | PDF, Excel |
| สรุปจำนวนเวรรายบุคคล | รายเดือน / รายปี | PDF, Excel |
| สถิติการลารายบุคคล | รายปี | PDF, Excel |
| รายงานเวรนายสิบ (NCO) | รายเดือน | PDF, Excel |

---

### Module 6: Notification (แจ้งเตือน)
- **ช่องทาง:** Push Notification ผ่าน PWA (ติดตั้งแอปบนมือถือ/เดสก์ท็อป)
- **กรณีที่แจ้งเตือน:**
  - ตารางเวรมีการเปลี่ยนแปลง → แจ้งบุคลากรที่เกี่ยวข้อง
  - มีคำขอลาใหม่ → แจ้ง Commander
  - ผลอนุมัติลา → แจ้งบุคลากรที่ยื่นลา

---

## 4. Technical Architecture (สถาปัตยกรรมทางเทคนิค)

### 4.1 Frontend / Framework
| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI | React 19 + Material UI (`@mui/material`) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Drag & Drop | `@dnd-kit` (Kanban) |
| Forms | `react-hook-form` |
| Charts | `recharts` |
| PWA | `@ducanh2912/next-pwa` |
| Export | `xlsx` (Excel), `html2canvas` (PDF) |
| Date | `date-fns` |

### 4.2 Backend & Database
| Layer | Technology |
|---|---|
| API Routes | Next.js Route Handlers |
| Database | **Google Sheets API** (`googleapis`) |
| Auth | LINE Login (OAuth 2.0) |
| Auth Session | Next.js Session / JWT |

### 4.3 Google Sheets Structure (แผน Tab ใหม่)
| Sheet Tab | โมดูล | สถานะ |
|---|---|---|
| `Personnel` | HR | มีอยู่แล้ว |
| `Duty` | Duty | มีอยู่แล้ว |
| `DutyMeta` | Duty | มีอยู่แล้ว |
| `NCO` | NCO | มีอยู่แล้ว |
| `Records` | Records | มีอยู่แล้ว |
| `Leave` | Leave Management | **[ใหม่]** คำขอลา, สถานะ, ผู้อนุมัติ |
| `Users` | Auth | **[ใหม่]** LINE ID → Personnel ID mapping |

---

## 5. Development Roadmap (แผนพัฒนา ภายใน 1 เดือน)

```
Week 1: Auth + HR Foundation
├── LINE Login integration (OAuth)
├── Role-based access control (Admin/Commander/DutyOfficer/NCO/Personnel)
└── Users Sheet tab + API

Week 2: Leave Management
├── Leave Sheet tab + API (GET/POST/PATCH)
├── หน้ายื่นลา (Personnel)
├── หน้าอนุมัติลา (Commander)
└── Push Notification เมื่อลา/อนุมัติ

Week 3: Auto-assign Scheduling + Notification
├── อัลกอริธึม Auto-assign (Round-robin + เช็คสถานะลา)
├── Push Notification เมื่อตารางเวรเปลี่ยน
└── PWA Service Worker setup

Week 4: Reporting & Polish
├── Dashboard ภาพรวม (ใครอยู่เวร/ใครลา)
├── Export PDF / Excel สำหรับรายงานทั้งหมด
├── NCO Report
└── Bug fixing & UX polish
```

---

## 6. Decisions Log (ตัดสินใจแล้ว)

| หัวข้อ | การตัดสินใจ |
|---|---|
| **LINE Login** | ใช้ LINE Developer Account ส่วนตัวก่อน (เริ่มได้ทันที ฟรี) — อัปเกรดเป็น Official Account ในอนาคต |
| **Auto-assign Algorithm** | Round-robin ปกติ + เช็คว่าไม่อยู่ระหว่างลา (ไม่มีกฎซับซ้อนเพิ่มเติม) |
| **ประเภทการลา** | มีเพียง "ลาเยี่ยมญาติ" ประเภทเดียว |
| **Development Order** | Auth → Leave Management → Auto-assign Scheduling → Reports (ตาม Week Plan) |
| **Dashboard Refactoring** | แยก UI Components และ Modals ของหน้า Dashboard (`app/page.tsx`) ออกเป็นไฟล์ย่อยใน `components/dashboard/` เพื่อลดความซับซ้อนและให้อ่านโค้ดง่ายขึ้น (2026-08-15) |
