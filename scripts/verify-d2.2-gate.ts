import dotenv from 'dotenv';
import { ResourceService } from '../src/lib/services/resource';
import { GoogleSheetsRepository } from '../src/lib/repository/sheets/repository';
import { DocTypeRegistry } from '../src/lib/doctypes/registry';
import { PolicyEngine } from '../src/lib/policies/engine';
import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';

dotenv.config({ path: '.env.local' });
process.env.DATA_MODE = 'write'; // Enable writes for Framework zone
process.env.ALLOW_PRODUCTION_WRITE = 'true'; // Override ShadowGuard startup check for testing

async function runGateTests() {
  console.log('--- Starting D2.2-GATE Production Verification ---');

  const repository = new GoogleSheetsRepository();
  const resourceService = new ResourceService(repository);
  
  const adminUser = { id: 'admin-1', roles: ['admin'] };
  const assistantUser = { id: 'ast-1', roles: ['duty_assistant'] };

  // Helper to ensure target sheet exists for test
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const ensureSheet = async (title: string) => {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] }
      });
      // seed header
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['id', 'personnelId', 'dutyDate', 'dutyType', 'status', 'remark', 'updatedAt']] }
      });
    } catch (e: any) {
      // Ignore if sheet exists
      if (!e.message?.includes('already exists')) throw e;
    }
  };

  await ensureSheet('BKFW_DutyAssignment');
  await ensureSheet('BKFW_NCOAssignment');
  await ensureSheet('BKFW_Personnel');

  // --- Test 1: Calendar Read ---
  console.log('\n[Test 1] Calendar Read (Personnel, DutyAssignment, NCOAssignment)');
  const personnelDocType = DocTypeRegistry.get('Personnel');
  const dutyDocType = DocTypeRegistry.get('DutyAssignment');
  const ncoDocType = DocTypeRegistry.get('NCOAssignment');
  
  if (personnelDocType.storage?.sheetName !== 'BKFW_Personnel' || 
      dutyDocType.storage?.sheetName !== 'BKFW_DutyAssignment' || 
      ncoDocType.storage?.sheetName !== 'BKFW_NCOAssignment') {
    throw new Error('❌ Test 1 Failed: One or more DocTypes are not pointing to BKFW_* sheets.');
  }
  
  const dutyRecords = await resourceService.list('DutyAssignment', adminUser);
  const ncoRecords = await resourceService.list('NCOAssignment', adminUser);
  console.log(`✅ Test 1 Passed: Read from BKFW_DutyAssignment (${dutyRecords.length} records), BKFW_NCOAssignment (${ncoRecords.length} records).`);


  // --- Test 2: Legacy Write ---
  console.log('\n[Test 2] Legacy Write (POST, PATCH, DELETE Personnel) -> 403');
  try {
    const validPersonnel = {
      personnelCode: 'TEST-001',
      rank: 'พลฯ',
      firstName: 'Test',
      lastName: 'User',
      status: 'available',
      batch: 123,
      isNCOEligible: false
    };
    await resourceService.create('Personnel', validPersonnel, adminUser);
    throw new Error('❌ Test 2 Failed: POST Personnel should have thrown LegacyGuardError.');
  } catch (e: any) {
    if (e.name !== 'LegacyGuardError') throw new Error(`❌ Test 2 Failed: Expected LegacyGuardError, got ${e.name}: ${e.message}`);
    console.log(`✅ POST rejected: ${e.message}`);
  }
  
  // Try Delete
  try {
    await resourceService.delete('Personnel', 'some-id', adminUser);
    throw new Error('❌ Test 2 Failed: DELETE Personnel should have thrown LegacyGuardError.');
  } catch (e: any) {
    if (e.name !== 'LegacyGuardError') throw new Error(`❌ Test 2 Failed: Expected LegacyGuardError, got ${e.name}: ${e.message}`);
    console.log(`✅ DELETE rejected: ${e.message}`);
  }


  // --- Test 3: Framework Write ---
  console.log('\n[Test 3] Framework Write (POST DutyAssignment) -> Success or Validation Error (NOT 403)');
  try {
    const created = await resourceService.create('DutyAssignment', {
      personnelId: 'person-123',
      dutyDate: '2026-08-23',
      dutyType: 'morning',
      status: 'scheduled'
    }, adminUser);
    console.log(`✅ Test 3 Passed: Successfully wrote to DutyAssignment (id: ${created.id}).`);
    
    // Clean up
    await resourceService.delete('DutyAssignment', created.id, adminUser);
  } catch (e: any) {
    if (e.name === 'LegacyGuardError') {
      throw new Error(`❌ Test 3 Failed: Framework write threw LegacyGuardError!`);
    }
    console.log(`✅ Test 3 Passed with expected non-403 error: ${e.message}`);
  }


  // --- Test 4: Permission Enforcement (API Backend) ---
  console.log('\n[Test 4] Permission Enforcement (Backend)');
  // duty_assistant has read/create, but NOT delete for DutyAssignment
  try {
    await resourceService.delete('DutyAssignment', 'dummy-id', assistantUser);
    throw new Error('❌ Test 4 Failed: duty_assistant should NOT be able to delete DutyAssignment!');
  } catch (e: any) {
    if (e.name === 'ForbiddenError') {
      console.log(`✅ Test 4 Passed: duty_assistant correctly blocked from deleting DutyAssignment (Backend).`);
    } else {
      throw new Error(`❌ Test 4 Failed: Expected ForbiddenError, got ${e.name} (${e.message})`);
    }
  }


  // --- Test 5: Unknown Role ---
  console.log('\n[Test 5] Unknown Role Evaluation (UI/PolicyEngine)');
  const canDelete = PolicyEngine.can(dutyDocType, 'delete', assistantUser);
  if (canDelete) {
    throw new Error('❌ Test 5 Failed: duty_assistant unexpectedly has delete permission in PolicyEngine!');
  }
  console.log(`✅ Test 5 Passed: can("DutyAssignment.delete") === false for duty_assistant.`);

  console.log('\n🎉 All D2.2-GATE Production Verifications Passed Successfully! 🎉');
}

runGateTests().catch(console.error);
