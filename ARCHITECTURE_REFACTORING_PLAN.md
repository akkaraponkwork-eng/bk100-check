# แผนปรับปรุงสถาปัตยกรรม: Metadata-driven Framework

## 1. เป้าหมาย

พัฒนาแอปจากระบบที่เขียน API และ UI แยกตามฟีเจอร์ ให้เป็น Open-source framework ที่ใช้โครงสร้าง Metadata-driven, Dynamic UI และ Modular Architecture ในแนวคิดเดียวกับ Odoo/Frappe

ผลลัพธ์ที่ต้องการคือระบบที่สามารถสร้างตารางข้อมูลใหม่ เช่น `Arsenal` ได้โดยกำหนด schema และใช้งานผ่าน component กลาง โดยเปลี่ยนสถานะโปรเจกต์จาก "เว็บที่ใช้ Google Sheets" เป็น **"Metadata-driven application framework ที่ใช้ Google Sheets เป็น storage adapter ตัวแรก"**

## 2. ขอบเขตและข้อตกลง

- ใช้ Google Sheets เป็นฐานข้อมูลหลักในระยะแรก (Storage Adapter ตัวแรก)
- **สถาปัตยกรรม Repository แบบแยกส่วน:** ต้องออกแบบ Data Layer ให้รองรับการเปลี่ยนไปใช้ PostgreSQL ในอนาคตโดยไม่กระทบ API หรือ UI
- ทุก schema จะถูกกำหนดเป็น DocType และอ่านโดยระบบใน runtime
- UI ใหม่ใช้ Tailwind CSS เป็นมาตรฐานเดียว
- ไม่ข้ามไปทำ Dynamic UI จนกว่า Backend Pipeline (DocType -> Registry -> Validator -> Repository -> API) จะเสถียร

## 3. ภาพรวมสถาปัตยกรรมเป้าหมาย

```text
DocType JSON + validator
          │
          ▼
DocType registry / Policy Engine (ตรวจสอบสิทธิ์ส่วนกลาง)
          │
          ▼
Repository Abstraction (Data Layer)
          │
          ├── GoogleSheetsRepository (Phase 1)
          └── PostgreSQLRepository   (Future)
                    │
                    ├── Generic Resource API (CRUD)
                    └── Domain APIs (Leave, Duty, Missions, ...)
                              │
                              ▼
Tailwind UI primitives
          │
          ▼
DynamicForm / DynamicList + domain-specific UI
```

## 4. Phase 1 — Foundation: DocType และ Data Layer

### 4.1 โครงสร้างที่เพิ่ม

```text
src/
  doctypes/
    Arsenal.json
  lib/
    doctypes/
      schema.ts
      registry.ts
      validator.ts
    policies/       # Policy Engine ส่วนกลาง
      engine.ts
    repository/     # Repository Abstraction
      interface.ts
      sheets/
        client.ts
        repository.ts
```

### 4.2 รูปแบบ DocType

แต่ละ DocType ระบุชื่อฟิลด์, ความสัมพันธ์, สิทธิ์, Cache, Concurrency และ **Computed Fields**

```json
{
  "name": "Arsenal",
  "sheetName": "Arsenal",
  "primaryKey": "id",
  "permissions": {
    "read": ["admin", "duty_officer"],
    "create": ["admin"],
    "update": ["admin"],
    "delete": ["admin"]
  },
  "cache": {
    "tags": ["doctype-arsenal"],
    "ttl": 300
  },
  "concurrency": {
    "optimistic": true,
    "versionField": "updatedAt"
  },
  "fields": [
    {
      "fieldname": "id",
      "type": "String",
      "sheetColumn": "A",
      "sheetHeader": "id",
      "hidden": true,
      "readOnly": true,
      "systemManaged": true
    },
    {
      "fieldname": "name",
      "type": "String",
      "label": "รายการอุปกรณ์",
      "sheetColumn": "B",
      "sheetHeader": "name",
      "required": true
    },
    {
      "fieldname": "quantity",
      "type": "Number",
      "label": "จำนวน",
      "sheetColumn": "C",
      "sheetHeader": "quantity"
    },
    {
      "fieldname": "price",
      "type": "Number",
      "label": "ราคาต่อหน่วย",
      "sheetColumn": "D",
      "sheetHeader": "price"
    },
    {
      "fieldname": "totalValue",
      "type": "Number",
      "label": "มูลค่ารวม",
      "computed": true,
      "formula": "quantity * price"
    },
    {
      "fieldname": "ownerId",
      "type": "Link",
      "target": "Personnel",
      "displayField": "firstName",
      "resolve": "lazy",
      "sheetColumn": "F",
      "sheetHeader": "ownerId"
    },
    {
      "fieldname": "updatedAt",
      "type": "Date",
      "sheetColumn": "Z",
      "sheetHeader": "updatedAt",
      "hidden": true,
      "systemManaged": true
    }
  ]
}
```

### 4.3 คุณสมบัติขั้นต่ำของ field metadata

- โครงสร้าง: `fieldname`, `type`, `label`, `sheetColumn`, `sheetHeader`
- Validation: `required`, `min`, `max`
- พฤติกรรม: `default`, `unique`, `systemManaged`
- **พฤติกรรมคำนวณ (Computed):** `computed`, `formula`, `dependsOn` (บอกพฤติกรรมข้อมูล ไม่ใช่แค่เก็บอย่างไร)
- ความสัมพันธ์ (Link): `target`, `displayField`, `resolve`
- สิทธิ์: จะถูกตีความโดย Policy Engine กลาง

### 4.4 หลักการสำคัญ (Data Consistency & Abstraction)

- **Schema Compatibility Check:** ตรวจ `sheetHeader` ป้องกันคอลัมน์เลื่อน ซ้ำ หรือหาย
- **Repository Interface:** Generic API ต้องไม่เรียกใช้ Google Sheets API ตรงๆ ต้องเรียกผ่าน Interface เท่านั้น เพื่อเตรียมรองรับ PostgreSQL ในอนาคต

## 5. Phase 2 — Policy Engine และ Generic Resource API

ความรับผิดชอบของระบบ:

- **Policy Engine กลาง:** ตรวจสิทธิ์ ไม่ฮาร์ดโค้ดใน Route อนาคตต้องรองรับ Field-level และ Record-level permission
- **Batch Relation Resolver:** เลี่ยง N+1 สำหรับ Link fields
- **Optimistic Concurrency:** ตรวจสอบ `updatedAt` คืนค่า HTTP 409
- **Cache Invalidation:** เรียก `revalidateTag` ทันทีหลังเปลี่ยนแปลง

## 6. Phase 3 — Tailwind Design System และ Dynamic UI (ห้ามทำจนกว่า Phase 1-2 จะเสถียร)

สร้าง `<DynamicForm>` และ `<DynamicList>` มารองรับ Metadata แต่จะต้องเริ่มทำหลังจากทดสอบ Backend API เสร็จสมบูรณ์แล้วเท่านั้น เพื่อป้องกัน UI ซ่อน Bug ของระบบข้างล่าง

## 7. Phase 4 — Modular Architecture

หลัง data layer เสถียร ให้ทยอยจัดกลุ่ม feature (`core`, `hr`, `duty`, `inventory`)

## 8. ลำดับการส่งมอบ (Action Plan)

**เป้าหมายเร่งด่วนที่สุด (Immediate Next Step):** ทำ Backend Pipeline เส้นนี้ให้เสร็จ
`DocType → Registry → Validator → Sheets Repository → Arsenal CRUD API`

### Milestone A — Backend Pipeline (ทำทันที)
- [ ] สร้าง DocType contract (รองรับ Computed field, Link)
- [ ] สร้าง Policy Engine พื้นฐานสำหรับจัดการ Permission
- [ ] สร้าง Repository Abstraction Interface
- [ ] สร้าง Google Sheets Repository (พร้อม Schema Compatibility Check, Concurrency, Cache)
- [ ] สร้าง Generic Resource API
- [ ] เขียน Unit/Integration Test สำหรับ Arsenal CRUD

*(Milestone C, D จะตามมาหลังจาก Milestone B เสร็จสมบูรณ์)*

## 6. Milestone B: Dynamic UI (Odoo/Frappe Style)

### Architecture เป้าหมาย

```text
                    ┌──────────────────┐
                    │   DocType JSON   │
                    │                  │
                    │ fields           │
                    │ types            │
                    │ required         │
                    │ computed         │
                    │ permissions      │
                    └────────┬─────────┘
                             │
                             ▼
┌──────────────┐      ┌───────────────┐
│ Dynamic UI   │ ───▶ │ Core Engine   │
│              │      │               │
│ List         │      │ Validator     │
│ Form         │      │ Policy        │
│ Detail       │      │ Computed      │
│ Filter       │      │ Resource      │
└──────────────┘      └───────┬───────┘
                              │
                              ▼
                     GoogleSheetsRepository
```

UI จะไม่มีการเขียน Hardcode สำหรับ DocType ใดๆ (ไม่มี `if (docType === "Arsenal")`) แต่จะเป็น **Dynamic Renderer** ที่สร้าง UI ตาม Schema Metadata

## 7. Phase D2: Duty Calendar — Framework Data Mode

ใน Phase นี้เราจะพิสูจน์ว่า **Framework UX ใช้งานจริงได้ โดยไม่แตะ Production Legacy Data**

### D2 Architecture

```text
                         BK100 Spreadsheet
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
       LEGACY DATA ZONE                     FRAMEWORK ZONE
              │                                   │
       🔒 READ ONLY                         🟢 READ / WRITE
              │                                   │
      ┌───────┼────────┐                ┌─────────┼─────────┐
      │       │        │                │         │         │
 Personnel   Duty    Leave          BKFW_Personnel       ...
      │       │        │                      │
      │      NCO   DutySlots                   │
      │                                        │
      └───────────────❌────────────────────────┘
                       NO WRITE
```

**หลักการสำคัญของ D2:** `Legacy is Read-Only, BKFW is Framework-Owned` อย่างเด็ดขาด

### ลำดับการทำงาน D2

1. **D2.0** Legacy Isolation Test (พิสูจน์ว่าห้ามเขียนทับข้อมูลเก่า)
2. **D2.1** BKFW Personnel Read
3. **D2.2** Duty Calendar
4. **D2.3** Duty Assignment UI
5. **D2.4** Conflict Visualization
6. **D2.5** Leave Integration
7. **D2.6** Calendar E2E Test

หลังจาก D2 สมบูรณ์ จึงจะขยับไป **D3 Dashboard** และท้ายสุดคือ **D4 Migration / Legacy Reconciliation** (ซึ่งจะจัดการข้อมูลเก่าจริงๆ)
