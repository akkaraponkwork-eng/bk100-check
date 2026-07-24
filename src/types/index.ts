// ==================== กำลังพล ====================
export interface Personnel {
  id: string;
  rank: string;          // ยศ เช่น พลฯ, ส.ต., จ.ส.ต.
  firstName: string;
  lastName: string;
  batch: number;         // ผลัด เช่น 168, 169
  phone?: string;
  status: 'available' | 'on_duty' | 'leave' | 'sick';
  dutyCount: number;     // จำนวนเวรสะสม (fairness)
  isNCOEligible?: boolean; // สามารถเป็นสิบเวรได้ไหม
}

// ==================== Kanban ====================
export interface KanbanTask {
  id: string;
  title: string;         // ชื่องาน เช่น บก.ร้อย, คลังผ้า
  category: 'หมวดที่ 1' | 'หมวดที่ 2';
  location: string;
  count: number | '';    // จำนวนคน
  status: 'todo' | 'in_progress' | 'done';
  date: string;          // yyyy-MM-dd
  remark?: string;
  isFixed?: boolean;     // งานประจำ ลบไม่ได้
}

// ==================== ยอดกำลังพลประจำวัน ====================
export interface DailyRecord {
  id?: string;
  date: string;
  totalCompany: number;
  totalDistributed: number;
  remaining: number;
  tasks: KanbanTask[];
}

// ==================== เวรยาม ====================
export interface ShiftSlot {
  id: string;
  start: string;         // "18:00"
  end: string;           // "20:00"
  personnelId: string;
  order: number;
}

export interface DutyShift {
  id: string;
  date: string;          // yyyy-MM-dd
  location: string;      // เช่น "หน้าคลังอาวุธ"
  batchMode: 'mixed' | 'batch_only';
  targetBatch?: number;  // ถ้าแยกผลัด
  timeSlots: ShiftSlot[];
}

// ==================== สิบเวร (NCO) ====================
export interface NCODuty {
  id: string;
  date: string;          // yyyy-MM-dd
  personnelId: string;
  remark?: string;
}

export interface NCOMonthlyRoster {
  month: string;         // "2026-08" (YYYY-MM)
  duties: NCODuty[];
}

// ==================== Calendar ====================
export type CalendarEventType = 'duty' | 'task' | 'nco' | 'holiday';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;          // yyyy-MM-dd
  type: CalendarEventType;
  refId?: string;
  color?: string;
}

// ==================== Excel Import ====================
export interface ExcelColumnMapping {
  rank: string;
  firstName: string;
  lastName: string;
  batch: string;
  phone: string;
}

export interface ExcelRow {
  [key: string]: string | number | undefined;
}

// ==================== Legacy (backward compat) ====================
export interface Task {
  id: string;
  category: 'หมวดที่ 1' | 'หมวดที่ 2';
  taskName: string;
  location: string;
  count: number | '';
  remark: string;
  isFixed?: boolean;
}
