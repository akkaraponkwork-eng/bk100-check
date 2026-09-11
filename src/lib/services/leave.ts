export class LeavePolicy {
  /**
   * คำนวณจำนวนวันลาที่แท้จริงจากวันที่เริ่มต้นและสิ้นสุด
   * ถ้าวันลาเริ่มและสิ้นสุดวันเดียวกัน = 1 วัน
   */
  static calculateDays(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (end < start) {
      throw new Error('End date cannot be before start date');
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return diffDays + 1; // Start & End on same day = 1 day
  }

  /**
   * ดึงสิทธิ์วันลาของกำลังพล (Mock)
   */
  static async getEntitlement(personnelId: string, leaveType: string): Promise<number> {
    // ในระบบจริงอาจจะดึงจาก DocType 'LeaveEntitlement' หรือคำนวณตามยศ/อายุงาน
    if (leaveType === 'sick') return 30;
    if (leaveType === 'personal') return 10;
    if (leaveType === 'annual') return 10;
    return 5;
  }

  /**
   * คำนวณโควตาวันลาที่ถูกใช้งานไปแล้ว
   * โดยตรวจสอบจาก Repository ว่ามีการลางานประเภทนี้กี่วันแล้ว (Mock implementation สำหรับ C2)
   */
  static async getUsedDays(personnelId: string, leaveType: string): Promise<number> {
    // ใน C2 เรายังไม่ต้อง Query แบบ Complex (เนื่องจาก Google Sheets จำกัด)
    // แต่เพื่อจำลอง Quota System: เราสมมติว่าถ้า personnelId มีลงท้าย '99' จะแปลว่าใช้โควต้าหมดแล้ว
    if (personnelId.endsWith('99')) return 999;
    return 0; // Mock: ถือว่ายังไม่เคยใช้
  }

  /**
   * คำนวณวันลาที่เหลืออยู่
   */
  static async getRemainingDays(personnelId: string, leaveType: string): Promise<number> {
    const entitlement = await this.getEntitlement(personnelId, leaveType);
    const used = await this.getUsedDays(personnelId, leaveType);
    return Math.max(0, entitlement - used);
  }
}
