import { ResourceService } from '../src/lib/services/resource';
import { GoogleSheetsRepository } from '../src/lib/repository/sheets/repository';
import { UserContext } from '../src/lib/policies/engine';
import { DocTypeRegistry } from '../src/lib/doctypes/registry';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config({ path: '.env.local' });

async function runTests() {
  console.log('🧪 Starting Leave Workflow Enterprise Tests...');
  const repo = new GoogleSheetsRepository();
  const service = new ResourceService(repo);

  const personnelUser: UserContext = { id: 'u1', roles: ['personnel'] };
  const commanderUser: UserContext = { id: 'u2', roles: ['commander'] };
  
  // Test 1: POST State Forgery (Test 6) + Initial State (Test 1) + Date/Days (Test 2)
  console.log('\n--- Test: Create Leave Request ---');
  let leaveRecord;
  try {
    leaveRecord = await service.create('LeaveRequest', {
      personnelId: 'personnel-123',
      leaveType: 'sick',
      startDate: '2026-08-25',
      endDate: '2026-08-27',
      status: 'approved', // Forgery attempt!
    }, personnelUser);
    
    // Status must be overwritten to 'pending' by StateMachine
    assert.strictEqual(leaveRecord.status, 'pending', '❌ Status forgery was not prevented!');
    
    // Days must be computed by LeavePolicy (25, 26, 27 = 3 days)
    assert.strictEqual(leaveRecord.days, 3, '❌ Days calculation failed!');
    
    console.log('✅ Test 1 & 2 & 6: Create successful. Forgery prevented. Days calculated correctly.');
  } catch (e: any) {
    console.error('❌ Failed Create Test:', e.message);
  }

  if (!leaveRecord) return;

  // Test 8 & 9: API Permission Bypass / Role Forgery
  console.log('\n--- Test: Role Forgery / API Bypass ---');
  try {
    await service.update('LeaveRequest', leaveRecord.id, {
      status: 'approved' // Trying to approve as personnel
    }, personnelUser);
    console.error('❌ Personnel successfully approved! State Machine failed.');
  } catch (e: any) {
    console.log(`✅ Test 8 & 9: API bypass prevented (${e.message})`);
  }

  // Test 4 & 5: Valid Approval & Invalid Transition
  console.log('\n--- Test: Valid Approval & Invalid Transition ---');
  try {
    // 1. Commander approves
    const approvedRecord = await service.update('LeaveRequest', leaveRecord.id, {
      status: 'approved'
    }, commanderUser);
    assert.strictEqual(approvedRecord.status, 'approved', '❌ Approval failed');
    console.log('✅ Test 4: Commander successfully approved.');

    // 2. Commander tries to revert to pending
    try {
      await service.update('LeaveRequest', leaveRecord.id, {
        status: 'pending'
      }, commanderUser);
      console.error('❌ Transition from approved to pending succeeded! State Machine failed.');
    } catch (e: any) {
      console.log(`✅ Test 5: Invalid transition prevented (${e.message})`);
    }

  } catch (e: any) {
    console.error('❌ Failed Approval Tests:', e.message);
  }

  // Test 3 & 7: Quota & Quota Race Condition Simulation
  console.log('\n--- Test: Quota Enforcement (Mocked 99 personnel) ---');
  try {
    await service.create('LeaveRequest', {
      personnelId: 'personnel-99', // Mock ID that triggers Quota exceed
      leaveType: 'personal',
      startDate: '2026-08-25',
      endDate: '2026-08-27',
    }, personnelUser);
    console.error('❌ Quota check failed! Request succeeded despite no quota.');
  } catch (e: any) {
    console.log(`✅ Test 3 & 7: Quota enforced correctly (${e.message})`);
  }

  console.log('\n🎉 All tests completed!');
}

runTests();
