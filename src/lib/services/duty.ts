import { ResourceQueryService } from './query';
import { ConflictError, ValidationError } from '../utils/errors';

export class DutyPolicy {
  /**
   * ตรวจสอบว่ากำลังพลลางานอยู่ในวันที่กำหนดหรือไม่
   * (Optionally it could query LeavePolicy, but we can do it via QueryService directly)
   */
  static async hasActiveLeave(queryService: ResourceQueryService, personnelId: string, dutyDate: string): Promise<boolean> {
    const leaves = await queryService.findMany('LeaveRequest', {
      filters: { personnelId }
    });

    const activeLeaves = leaves.filter(l => 
      l.status !== 'rejected' && 
      l.status !== 'cancelled' &&
      l.startDate <= dutyDate && 
      l.endDate >= dutyDate
    );

    return activeLeaves.length > 0;
  }

  /**
   * ตรวจสอบว่ากำลังพลพร้อมปฏิบัติหน้าที่หรือไม่ (สถานะ inactive ห้ามจัดเวร)
   */
  static async isPersonnelActive(queryService: ResourceQueryService, personnelId: string): Promise<boolean> {
    const personnel = await queryService.get('Personnel', personnelId);
    if (!personnel) {
      throw new ValidationError(`Personnel with ID '${personnelId}' not found.`);
    }
    return personnel.status !== 'inactive';
  }

  /**
   * ตรวจสอบว่ามีเวรซ้ำหรือไม่ (personnelId + dutyDate + dutyType) 
   * และต้องไม่ใช่สถานะ cancelled
   */
  static async hasDuplicateDuty(
    queryService: ResourceQueryService, 
    personnelId: string, 
    dutyDate: string, 
    dutyType: string,
    excludeDutyId?: string
  ): Promise<boolean> {
    const duties = await queryService.findMany('DutyAssignment', {
      filters: { personnelId, dutyDate, dutyType }
    });

    const activeDuties = duties.filter(d => 
      d.status !== 'cancelled' && 
      d.id !== excludeDutyId
    );

    return activeDuties.length > 0;
  }

  /**
   * ตรวจสอบว่ามีเวรอยู่แล้วในช่วงวันที่กำหนดหรือไม่ (ใช้ตอนกด Approve Leave)
   */
  static async hasDutyInRange(
    queryService: ResourceQueryService,
    personnelId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    const duties = await queryService.findMany('DutyAssignment', {
      filters: { personnelId }
    });

    const activeDuties = duties.filter(d => 
      d.status !== 'cancelled' &&
      d.dutyDate >= startDate &&
      d.dutyDate <= endDate
    );

    return activeDuties.length > 0;
  }
}
