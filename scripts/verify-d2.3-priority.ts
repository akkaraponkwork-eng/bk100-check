import { ReadinessStatus } from '../src/hooks/useReadiness';

function calculateOperationalStatus(
  personnelStatus: string,
  hasLeave: boolean,
  hasDuty: boolean
): { status: ReadinessStatus, eligible: boolean } {
  if (personnelStatus === 'prisoner') return { status: 'prisoner', eligible: false };
  if (personnelStatus === 'inactive') return { status: 'inactive', eligible: false };
  if (personnelStatus === 'sick') return { status: 'sick', eligible: false };
  if (hasLeave) return { status: 'on_leave', eligible: false };
  if (hasDuty) return { status: 'on_duty', eligible: false };
  if (personnelStatus === 'available') return { status: 'available', eligible: true };
  return { status: personnelStatus as ReadinessStatus || 'available', eligible: personnelStatus === 'available' };
}

function runPriorityTests() {
  console.log('--- Testing D2.3 Operational Status Priority ---');

  const tests = [
    { p: 'prisoner', l: false, d: false, e: 'prisoner', el: false, desc: 'Prisoner is prisoner' },
    { p: 'prisoner', l: true, d: true, e: 'prisoner', el: false, desc: 'Prisoner overrides all' },
    { p: 'inactive', l: true, d: false, e: 'inactive', el: false, desc: 'Inactive overrides leave' },
    { p: 'sick', l: false, d: true, e: 'sick', el: false, desc: 'Sick overrides duty' },
    { p: 'available', l: true, d: true, e: 'on_leave', el: false, desc: 'Leave overrides duty' },
    { p: 'available', l: false, d: true, e: 'on_duty', el: false, desc: 'Available + Duty = On Duty' },
    { p: 'available', l: false, d: false, e: 'available', el: true, desc: 'Available = Available' },
    { p: 'unknown', l: false, d: false, e: 'unknown', el: false, desc: 'Unknown falls back' },
  ];

  let failed = 0;
  tests.forEach((t, i) => {
    const res = calculateOperationalStatus(t.p, t.l, t.d);
    if (res.status === t.e && res.eligible === t.el) {
      console.log(`✅ Test ${i+1}: ${t.desc} -> ${res.status} (Eligible: ${res.eligible})`);
    } else {
      console.error(`❌ Test ${i+1}: ${t.desc} -> Expected ${t.e} (${t.el}), got ${res.status} (${res.eligible})`);
      failed++;
    }
  });

  if (failed > 0) throw new Error(`${failed} tests failed.`);
  console.log('🎉 All Priority Tests Passed!');
}

runPriorityTests();
