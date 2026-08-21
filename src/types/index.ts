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
  num?: number;          // ลำดับคิวการเข้าเวร
  bedNumber?: string;    // หมายเลขเตียง
  leaveDetails?: {
    startDate: string;
    endDate: string;
  };
}

export interface PunishmentEntry {
  id?: string;
  personnelId: string;
  shift: number; // 1-6 specific shift to do, 0 if not assigned yet
  startDate: string;
  endDate: string;
  status?: 'todo' | 'progress' | 'done';
  source?: 'bed' | 'manual';
  remark?: string;
}

export interface ExceptionEntry {
  personnelId: string;
  reason: 'ผู้ช่วยสิบเวร' | 'ป่วย' | 'ธุระการ' | 'งดเวร';
  startDate: string;
  endDate: string;
}

// ==================== Kanban ====================
export interface KanbanTask {
  id: string;
  title: string;         // ชื่องาน เช่น บก.ร้อย, คลังผ้า
  category: 'รปจ' | 'งานนอก/อื่นๆ';
  location: string;
  count: number | '';    // จำนวนคน (legacy)
  countSenior?: number | ''; // ยอดพี่
  countJunior?: number | ''; // ยอดน้อง
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
  personnelId: string;   // Personnel.id หรือ '' ถ้าว่าง
  customName?: string;   // ชื่อนอกระบบ (ไม่มีใน Personnel list)
  order: number;
  isPunishment?: boolean;
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
  category: 'รปจ' | 'งานนอก/อื่นๆ';
  taskName: string;
  location: string;
  count: number | '';
  remark: string;
  isFixed?: boolean;
}

// ==================== Auth & Roles ====================
export type UserRole = 'admin' | 'commander' | 'duty_officer' | 'nco' | 'personnel';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  commander: 'ผู้บังคับบัญชา',
  duty_officer: 'นายเวร',
  nco: 'นายสิบเวร',
  personnel: 'กำลังพล',
};

export interface AppUser {
  lineUserId: string;
  personnelId: string;
  role: UserRole;
  displayName: string;
  pictureUrl?: string;
}

// ==================== Leave Management ====================
export type LeaveType = 'เยี่ยมญาติ';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  personnelId: string;
  type: LeaveType;
  startDate: string;   // yyyy-MM-dd
  endDate: string;     // yyyy-MM-dd
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string; // personnelId of approver
  approvedAt?: string; // ISO datetime
  createdAt: string;   // ISO datetime
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

// ==================== Org Chart (ทำเนียบ) ====================
export interface OrgChartMember {
  id: string;
  rank: string;
  name: string;
  position: string;
  imageUrl?: string;
  level: number; // 1 = Top Commander, 2 = Deputy, etc.
  order: number; // For sorting within the same level
}

// ==================== ภารกิจ (Missions / Calendar Events) ====================
export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const MISSION_STATUS_LABELS: Record<MissionStatus, { label: string; color: string }> = {
  pending: { label: 'มอบหมายแล้ว', color: '#3b82f6' },
  in_progress: { label: 'กำลังดำเนินการ', color: '#f59e0b' },
  completed: { label: 'เสร็จสิ้น', color: '#10b981' },
  cancelled: { label: 'ยกเลิก', color: '#6b7280' },
};

export interface Mission {
  id: string;
  title: string;
  date: string;                   // yyyy-MM-dd
  startTime?: string;             // HH:mm
  endTime?: string;               // HH:mm
  location?: string;
  assignedPersonnelIds: string[]; // ID กำลังพลที่ได้รับมอบหมาย (ว่างถ้าเป็นภารกิจกองร้อย)
  status: MissionStatus;
  remark?: string;
  createdBy?: string;             // ชื่อ/ID ผู้สั่งการ
  createdAt: string;              // ISO datetime
  updatedAt?: string;             // ISO datetime
}

export interface MissionYearlySummary {
  year: number;
  totalMissions: number;
  completedMissions: number;
  inProgressMissions: number;
  pendingMissions: number;
  totalPersonnelAssigned: number;
  monthlyBreakdown: { month: string; count: number; completed: number }[];
  topPersonnel: { personnelId: string; rank: string; name: string; count: number }[];
}

// ==================== Bed Reports & Beds (ตรวจโรงนอน) ====================
export interface BedEntry {
  bedNo: string;
  personnelId?: string;
  ownerName?: string;
}

export interface BedViolation {
  bedNo: string;
  remark: string;
  actualSleeperId?: string; // When the person sleeping is not the bed owner
}

export interface BedMonthlyStats {
  bedNo: string;
  ownerName?: string;
  count: number;
  remarks: string[];
}

export interface BedReport {
  id: string;
  rawText: string;
  status: 'pending' | 'processed';
  createdAt: string;
  processedAt?: string;
  violations?: string; // JSON string ของ BedViolation[]
}

