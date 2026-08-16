# Product Requirements Document (PRD): bk100-check ERP

> **เวอร์ชัน:** 2.1 (Current Implementation)  
> **อัปเดตล่าสุด:** 2026-08-16  
> **เป้าหมาย:** ระบบ ERP สำหรับหน่วยงานทหาร (จัดการกำลังพล, จัดเวร, ลาพัก, แจ้งเตือน)

---

## 1. Overview (ภาพรวมโปรเจกต์)

| รายการ | รายละเอียด |
|---|---|
| **ชื่อโปรเจกต์** | bk100-check ERP |
| **ประเภทองค์กร** | หน่วยงานทหาร (มีระบบยศ, เวรปฏิบัติหน้าที่, สายการบังคับบัญชา) |
| **จำนวนผู้ใช้งาน** | 50 – 200 คน |
| **ฐานข้อมูล** | Google Sheets API (ขยาย Sheet tabs สำหรับโมดูลต่างๆ) |
| **แพลตฟอร์ม** | Web Application / PWA รองรับ Mobile & Desktop (เชื่อมกับ LINE) |

---

## 2. User Roles & Permissions (สิทธิ์การใช้งาน)

| Role | สิทธิ์ที่มี |
|---|---|
| **Admin** | จัดการระบบทั้งหมด, เพิ่ม/แก้ไขผู้ดูแลระบบ, ตั้งค่าระบบ (Settings/Bot), จัดการข้อมูลทั้งหมด |
| **Commander** | อนุมัติ/ปฏิเสธการลา, ดูรายงานภาพรวมและสถิติของผู้ใต้บังคับบัญชา, ดูผังองค์กร |
| **Duty Officer** | จัดเวร (Kanban/Calendar), แก้ไขตารางเวร, ใช้งาน Auto-assign |
| **NCO / Sergeant** | ดูสถิติและรายงานเวรนายสิบที่ตัวเองรับผิดชอบ |
| **Personnel** | ดูตารางเวรตัวเอง, ยื่นคำขอลาผ่านระบบ, รับการแจ้งเตือน |

### Authentication & Account Binding
- **วิธี Login:** ระบบใช้ LINE Login (OAuth ผ่าน LINE)
- **การผูกบัญชี (Link Account):** ผู้ใช้ต้องผูก LINE Account (UID) กับ Personnel ID ในระบบ เพื่อระบุตัวตนและรับการแจ้งเตือนส่วนบุคคล
  - **Onboarding Flow:** สำหรับกำลังพลที่เข้าสู่ระบบครั้งแรกและยังไม่มีข้อมูลผูกบัญชี จะต้องกรอกรหัสประจำตัว (Personnel ID) และเข้าสู่สถานะ **รอให้ Admin อนุมัติ (Pending Approval)** ก่อนจึงจะสามารถดูข้อมูลตารางเวรและใช้งานระบบได้เต็มรูปแบบ เพื่อป้องกันการสวมรอยหรือผูกบัญชีผิดคน
    - **หน้าจอระหว่างรอ:** ผู้ใช้จะถูกพาไปยังหน้า "รอการตรวจสอบ" (Pending Screen) ซึ่งแสดงสถานะปัจจุบันและเบอร์ติดต่อผู้ดูแลระบบ
    - **การแจ้งเตือน Admin:** ระบบจะส่งข้อความแจ้งเตือน (LINE Message) ไปยัง Admin ทันทีที่มีคำขอใหม่ หากคำขอยังไม่ถูกดำเนินการภายใน 24 ชั่วโมง (Timeout) ระบบจะส่ง Daily Reminder แจ้งเตือนซ้ำ

---

## 3. Modules & Features (โมดูลและฟีเจอร์ปัจจุบัน)

### Module 1: HR & Personnel Management (จัดการกำลังพล)
- **ข้อมูลที่เก็บ:** ยศ, ชื่อ, นามสกุล, ผลัด, เบอร์โทร, สถานะการปฏิบัติงาน
- **ผังองค์กร (Org Chart):** แสดงโครงสร้างสายการบังคับบัญชา (hierarchy) เพื่อดูว่าใครสังกัดหรือขึ้นตรงกับใคร
- **Google Sheet Tab:** `Personnel`

### Module 2: Duty & Scheduling (ระบบจัดเวร)
- **ระบบแสดงผลตารางเวร:**
  - **Kanban Board:** ลากวาง (Drag & Drop) เพื่อจัดเวรรายวัน/สัปดาห์
  - **Calendar View:** ดูภาพรวมปฏิทินตารางเวรรายเดือน
- **ฟีเจอร์จัดเวร:**
  - **Manual Mode:** เจ้าหน้าที่จัดเวรลากวางรายชื่อเอง
  - **Auto-assign Mode (Fairness-based):** อัลกอริธึมจัดเวรโดยคำนึงถึงความเป็นธรรม (Fairness Metric) เป็นหลัก โดยมีเงื่อนไขดังนี้:
    - **Separate Pools:** ระบบนับเวรสะสม (Duty Count) ของนายสิบเวร (NCO) และเวรยามทั่วไป (Personnel) จะ**แยกจากกันโดยเด็ดขาด** (คนละ Pool) เนื่องจากความรับผิดชอบต่างกัน
    1. ต้อง **ไม่อยู่ระหว่างลา** หรือติดภารกิจอื่น
    2. จัดเรียงคิวผู้ที่เหมาะสมจาก **จำนวนเวรสะสม (Duty Count)** เพื่อให้ทุกคนได้จำนวนเวรใกล้เคียงกันที่สุด
    3. หากจำนวนเวรสะสมเท่ากัน จะพิจารณาจาก **วันที่เข้าเวรครั้งล่าสุด (Last Duty Date)** เพื่อเว้นระยะห่างให้มากที่สุด ไม่ให้เกิดการอยู่เวรติดกันเกินไป
- **Google Sheet Tabs:** `Duty`, `DutyMeta`

### Module 3: Leave Management (ระบบการลา)
- **การยื่นลา:** บุคลากรยื่นคำขอลาในระบบ พร้อมระบุวันที่และเหตุผล (เช่น ลาเยี่ยมญาติ)
- **Workflow:** 
  1. ยื่นลาผ่าน LIFF / Web
  2. แจ้งเตือนไปยัง Commander เพื่อพิจารณา
  3. Commander อนุมัติ/ปฏิเสธ
  4. แจ้งเตือนกลับไปยังผู้ยื่น
  5. ระบบจัดเวร (Duty) จะบล็อกไม่ให้จัดเวรในวันที่ลา
- **Google Sheet Tab:** `Leave`

### Module 4: NCO Management (เวรนายสิบ)
- จัดการและบันทึกสถิติการเข้าเวรนายสิบ
- NCO สามารถดูสถิติเวรที่ตัวเองรับผิดชอบได้ เพื่อความโปร่งใสและตรวจสอบได้
- **Google Sheet Tab:** `NCO`

### Module 5: Reporting & Analytics (รายงานและแดชบอร์ด)
- **Dashboard (`/`):** สรุปภาพรวมกำลังพลรายวัน, วันนี้ใครอยู่เวร, ใครลา
- **Reports (`/reports`):** 
  - สรุปตารางเวร (รายวัน/เดือน)
  - สรุปสถิติการลา
  - รายงานเวรนายสิบ (NCO Report)
- **Export Format:** รองรับการ Export รายงานทั้งหมดในรูปแบบ **PDF** สำหรับพิมพ์เป็นเอกสาร และ **Excel (XLSX)** สำหรับนำไปประมวลผลหรือรวบรวมสถิติต่อ

### Module 6: Notification & LINE Bot (การแจ้งเตือนและแชทบอท)
- **ช่องทาง:** LINE Messaging API & PWA Push Notification
- **LINE Bot:** 
  - มี LINE Official Account เชื่อมต่อกับระบบ (Webhook)
  - ผู้ใช้สั่งงานพื้นฐานผ่าน Bot หรือเข้าใช้งานเมนูต่างๆ ผ่าน **Rich Menu** ที่ผูกเข้ากับ Web App (LIFF)
- **เงื่อนไขการแจ้งเตือน (Push / LINE Message):**
  - ตารางเวรเปลี่ยนแปลง 
  - ยื่นคำขอลาใหม่ / ผลการพิจารณาลา
  - แจ้งเตือนเวรล่วงหน้า
- **ระบบตั้งค่าบอท (Bot Settings):** กำหนด Quick Replies หรือข้อความอัตโนมัติ

### Module 7: System Settings (ตั้งค่าระบบ)
- **Admin Accounts:** จัดการสิทธิ์แอดมินแยกต่างหาก
- **Bot Settings:** ปรับแต่งการทำงานของ LINE Bot
- **Database Migration:** รองรับสคริปต์สำหรับการจัดการและอัปเดตโครงสร้าง Google Sheets

---

## 4. Technical Architecture (สถาปัตยกรรมทางเทคนิค)

### 4.1 Frontend / UI Layer
| เทคโนโลยี | รายละเอียด |
|---|---|
| Framework | **Next.js 14+ (App Router)** |
| UI Library | **React 19** + **Material UI v6 (`@mui/material`)** |
| Styling | **Tailwind CSS v4** |
| Animations | **Framer Motion** |
| Drag & Drop | `@dnd-kit` (สำหรับ Kanban Board) |
| Forms & Date | `react-hook-form`, `date-fns` |
| PWA Support | `@ducanh2912/next-pwa` |
| LINE Integration | `@line/liff` |

### 4.2 Backend & Data Layer
| เทคโนโลยี | รายละเอียด |
|---|---|
| API & Backend | **Next.js Route Handlers** (`src/app/api`) |
| Database | **Google Sheets API** (`googleapis`) ใช้เป็นฐานข้อมูลหลัก |
| Caching Strategy | **Next.js Cache (Data Cache / ISR):** มีชั้น Caching สำหรับ API ที่ถูกเรียกบ่อย เช่น Dashboard ภาพรวมกำลังพล เพื่อป้องกันการชน Google Sheets API Rate Limit (100 reqs/100s/user หรือ 300 reqs/100s/project) ในช่วง Peak Hours ที่กำลังพลเข้ามาดูตารางเวรพร้อมกัน<br>- **Revalidate Interval:** ตั้งค่าหน่วงเวลาการดึงข้อมูลใหม่ทุกๆ 60 วินาที (Time-based ISR)<br>- **On-demand Invalidation:** หาก Duty Officer ลากวางแก้ไขตารางเวรใน Kanban Board สำเร็จ ระบบจะทำ Tag-based Invalidation เคลียร์ Cache ทันที เพื่อให้ทุกคนเห็นข้อมูลตารางใหม่แบบ Real-time |
| Auth & AuthZ | **LINE Login (OAuth 2.0)** + Next.js JWT Session (`jose`) |
| Bot Engine | รับส่ง Webhook และ LINE Messaging API ภายใน Next.js API |

### 4.3 Database Structure (Google Sheets Tabs)
| ชื่อ Sheet (Tab) | โมดูลที่ใช้งาน | สถานะ |
|---|---|---|
| `Personnel` | ข้อมูลกำลังพล | ใช้งานแล้ว |
| `Duty` | ข้อมูลตารางเวรแต่ละบุคคล | ใช้งานแล้ว |
| `DutyMeta` | Metadata เกี่ยวกับโครงสร้างการจัดเวร | ใช้งานแล้ว |
| `NCO` | สถิติเวรนายสิบ | ใช้งานแล้ว |
| `Records` | Log และบันทึกประวัติการเปลี่ยนแปลง | ใช้งานแล้ว |
| `Leave` | ระบบลาพัก (คำขอลา, สถานะ, ผู้อนุมัติ) | ใช้งานแล้ว |
| `Users` | เก็บข้อมูลผู้ใช้งานระบบ (ID, LINE UID, สิทธิ์) | ใช้งานแล้ว |
| `AdminAccounts` | เก็บรายชื่อ Admin ของระบบ | ใช้งานแล้ว |
| `BotSettings` | การตั้งค่าข้อความอัตโนมัติของ Bot | ใช้งานแล้ว |

---

## 5. Decisions Log (ประวัติการตัดสินใจสำคัญ)

| วันที่ | หัวข้อ | การตัดสินใจ |
|---|---|---|
| 2026-08-11 | **Database Choice** | ใช้ Google Sheets เพื่อลดต้นทุนและให้แอดมินหรือบุคลากรที่ไม่ใช่โปรแกรมเมอร์สามารถเข้าไปดูข้อมูลแบบ Raw Data ได้ง่าย |
| 2026-08-11 | **Auto-assign Algorithm** | [อัปเดต 16/08] เปลี่ยนจาก Round-robin ปกติ เป็นการคำนวณโดยใช้ **จำนวนเวรสะสม (Duty Count)** และ **วันที่เข้าเวรล่าสุด (Last Duty Date)** เป็นตัวชี้วัดความเป็นธรรม (Fairness Metric) เพื่อป้องกันการเหลื่อมล้ำในการเข้าเวร |
| 2026-08-15 | **Dashboard Refactoring** | แยก UI Components และ Modals ของหน้า Dashboard (`app/page.tsx`) ออกเป็นไฟล์ย่อยใน `components/dashboard/` เพื่อให้อ่านและดูแลโค้ดง่ายขึ้น |
| 2026-08-16 | **LINE Integration** | ใช้ LINE Official Account และ Rich Menu (สร้างผ่าน script `scripts/setup-richmenu.ts`) เป็นช่องทางหลักในการเข้าถึง Web App และรับแจ้งเตือน เพื่อให้ผู้ใช้เข้าถึงง่ายจากแอปแชท |
| 2026-08-16 | **UI Architecture** | แยกหน้า `kanban`, `calendar`, `orgchart` ออกเป็น Route แยกต่างหากเพื่อให้แชร์ลิงก์ได้ตรงจุด และจัดระเบียบหน้าจอให้เหมาะสมกับ Mobile View |
