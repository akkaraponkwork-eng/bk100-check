import { NextRequest, NextResponse } from 'next/server';
import { ResourceService } from '@/lib/services/resource';
import { DocTypeRegistry } from '@/lib/doctypes/registry';

// Simple in-memory cache for idempotency in this PoC
// In production, this should be Redis or a database table
const idempotencyCache = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing x-idempotency-key header' }, { status: 400 });
    }

    if (idempotencyCache.has(idempotencyKey)) {
      return NextResponse.json({ error: 'Duplicate confirmation detected' }, { status: 409 });
    }

    // Mark as processing (simple lock)
    idempotencyCache.add(idempotencyKey);

    const body = await req.json();
    const { assignments } = body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      idempotencyCache.delete(idempotencyKey);
      return NextResponse.json({ error: 'Invalid or empty assignments array' }, { status: 400 });
    }

    const dutyDocType = DocTypeRegistry.get('DutyAssignment');
    const personnelDocType = DocTypeRegistry.get('Personnel');
    const leaveDocType = DocTypeRegistry.get('LeaveRequest');

    // 1. Re-read necessary data to re-validate
    const allPersonnel = await ResourceService.list(personnelDocType, { 'x-mock-role': 'System' } as any);
    const allLeaves = await ResourceService.list(leaveDocType, { 'x-mock-role': 'System' } as any);
    const allDuties = await ResourceService.list(dutyDocType, { 'x-mock-role': 'System' } as any);

    const results = [];

    for (const assign of assignments) {
      // 2. Re-validate Business Rules
      const person = allPersonnel.find((p: any) => p.id === assign.personnelId);
      if (!person) {
        throw new Error(`Personnel ${assign.personnelId} not found`);
      }

      // Rule: prisoner, inactive, sick are not eligible
      if (['prisoner', 'inactive', 'sick'].includes(person.status)) {
        throw new Error(`Conflict: Personnel ${person.firstName} is currently ${person.status} and cannot be assigned.`);
      }

      // Rule: Check leave overlap
      const hasLeave = allLeaves.some((l: any) => 
        l.personnelId === person.id && 
        l.status === 'approved' && 
        l.startDate <= assign.date && 
        l.endDate >= assign.date
      );
      if (hasLeave) {
        throw new Error(`Conflict: Personnel ${person.firstName} is on leave on ${assign.date}.`);
      }

      // Rule: Duplicate assignment on same date
      const hasDuty = allDuties.some((d: any) => 
        d.personnelId === person.id && 
        d.dutyDate === assign.date &&
        d.status !== 'cancelled'
      );
      if (hasDuty) {
        throw new Error(`Conflict: Personnel ${person.firstName} already has a duty assigned on ${assign.date}.`);
      }

      // 3. Create using ResourceService (triggers DutyPolicy & ConcurrencyGuard & Hook & ShadowGuard)
      const mockReq = { headers: new Headers({ 'x-mock-role': 'System' }) } as any; // Bypass API level RBAC for batch internal call
      const created = await ResourceService.create(dutyDocType, {
        personnelId: assign.personnelId,
        dutyDate: assign.date,
        dutyType: assign.dutyType,
        status: 'scheduled',
        assignerId: 'SYS_AUTO', // System assigned
        remarks: assign.reason || 'Auto-assigned'
      }, mockReq);
      
      results.push(created);
    }

    return NextResponse.json({ success: true, count: results.length, data: results });

  } catch (err: any) {
    // If there's an error (e.g. ConflictError), we should arguably rollback all created in this batch
    // But for this PoC without transactions, we just return the error.
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 400 });
  }
}
