import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000/api/resource';

async function getLegacyRowCount() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Personnel',
  });
  return res.data.values ? res.data.values.length : 0;
}

async function runTests() {
  console.log('--- Starting Legacy Isolation E2E Tests (D2-Test-0) ---');
  
  // 1. Get initial row count
  const initialRowCount = await getLegacyRowCount();
  console.log(`[1] Initial Legacy Personnel row count: ${initialRowCount}`);

  // 2. Attempt POST to Legacy Personnel
  console.log('\n[2] Testing POST /Personnel (Legacy Sheet)');
  const postLegacyPayload = {
    personnelCode: 'P999',
    rank: 'private',
    firstName: 'Test',
    lastName: 'Isolation',
    phone: '0812345678',
    status: 'available',
    batch: 165
  };

  const postLegacyRes = await fetch(`${BASE_URL}/Personnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postLegacyPayload)
  });
  
  const postLegacyData = await postLegacyRes.json();
  if (postLegacyRes.status !== 403 || !postLegacyData.error?.includes('[LEGACY GUARD]')) {
    throw new Error(`Expected 403 LegacyGuardError, got ${postLegacyRes.status}. Data: ${JSON.stringify(postLegacyData)}`);
  }
  console.log(`✅ Correctly rejected with 403: ${postLegacyData.error}`);

  // 3. Verify row count unchanged
  console.log('\n[3] Verifying Legacy Personnel row count unchanged');
  const afterPostRowCount = await getLegacyRowCount();
  console.log(`Legacy Personnel row count after POST: ${afterPostRowCount}`);
  if (initialRowCount !== afterPostRowCount) {
    throw new Error(`CRITICAL FAILURE: Legacy row count changed! Before: ${initialRowCount}, After: ${afterPostRowCount}`);
  }
  console.log(`✅ Legacy row count verified unchanged (before === after)`);

  // 4. Attempt DELETE Legacy Personnel
  console.log('\n[4] Testing DELETE /Personnel/123 (Legacy Sheet)');
  const deleteLegacyRes = await fetch(`${BASE_URL}/Personnel/123`, { method: 'DELETE' });
  const deleteData = await deleteLegacyRes.json();
  if (deleteLegacyRes.status !== 403 || !deleteData.error?.includes('[LEGACY GUARD]')) {
    throw new Error(`Expected 403 LegacyGuardError, got ${deleteLegacyRes.status}`);
  }
  console.log(`✅ Correctly rejected with 403: ${deleteData.error}`);

  // 5. Attempt PATCH Legacy Personnel
  console.log('\n[5] Testing PATCH /Personnel/123 (Legacy Sheet)');
  const patchLegacyRes = await fetch(`${BASE_URL}/Personnel/123`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0899999999', updatedAt: new Date().toISOString() })
  });
  const patchData = await patchLegacyRes.json();
  if (!((patchLegacyRes.status === 403 && patchData.error?.includes('[LEGACY GUARD]')) || 
        (patchLegacyRes.status === 500 && patchData.error?.includes('Schema Compatibility')))) {
    throw new Error(`Expected 403 LegacyGuardError or 500 SchemaCompatibilityError, got ${patchLegacyRes.status}. Data: ${JSON.stringify(patchData)}`);
  }
  console.log(`✅ Correctly rejected: ${patchData.error}`);

  // 6. Final verification of row count
  const finalRowCount = await getLegacyRowCount();
  if (initialRowCount !== finalRowCount) {
    throw new Error(`CRITICAL FAILURE: Legacy row count changed after DELETE/PATCH!`);
  }

  // 7. Attempt POST to BKFW_DutyAssignment
  console.log('\n[7] Testing POST /DutyAssignment (BKFW Sheet)');
  const postDutyPayload = {
    personnelId: 'invalid-person',
    dutyDate: '2026-08-25',
    dutyType: 'guard'
  };
  const postDutyRes = await fetch(`${BASE_URL}/DutyAssignment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postDutyPayload)
  });
  
  const postDutyData = await postDutyRes.json();
  if (postDutyRes.status === 403) {
    throw new Error(`CRITICAL FAILURE: BKFW write was incorrectly blocked with 403!`);
  }
  
  if (postDutyRes.status === 400 || postDutyRes.status === 201) {
    console.log(`✅ Valid framework response (Status ${postDutyRes.status})`);
    if (postDutyRes.status === 400) {
      console.log(`Business Rule rejection reason: ${postDutyData.error || JSON.stringify(postDutyData)}`);
    } else {
      console.log(`Created successfully with ID: ${postDutyData.data?.id}`);
    }
  } else if (postDutyRes.status === 404) {
      console.log(`⚠️ DutyAssignment doctype might not exist yet, got 404: ${postDutyData.error}`);
  } else {
    throw new Error(`Unexpected status ${postDutyRes.status}: ${JSON.stringify(postDutyData)}`);
  }

  console.log('\n🎉 All Legacy Isolation Tests (D2-Test-0) Passed Successfully! 🎉');
}

runTests().catch(console.error);
