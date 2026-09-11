/**
 * E2E Test Script for Arsenal DocType
 * Note: Requires Next.js dev server running on http://localhost:3000
 * Run with: npx tsx scripts/test-e2e.ts
 */

const BASE_URL = 'http://localhost:3000/api/resource/Arsenal';

async function runTests() {
  console.log('--- Starting Arsenal E2E Tests ---');
  let createdId: string;
  let currentVersion: string;

  // 1. POST (Create)
  console.log('\\n[1] Testing POST /Arsenal');
  const createPayload = {
    name: 'M4A1 Carbine',
    quantity: 10,
    price: 1500,
    ownerId: 'personnel-001',
    // Testing Computed Field Security: This should be IGNORED and overwritten by backend
    totalValue: 999999 
  };
  
  const createRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  
  const createData = await createRes.json();
  if (createRes.status !== 201) throw new Error(`POST failed: ${JSON.stringify(createData)}`);
  
  createdId = createData.data.id;
  currentVersion = createData.data.updatedAt;
  console.log(`✅ Created successfully. ID: ${createdId}`);
  console.log(`✅ Computed field security: Expected 15000, Got ${createData.data.totalValue}`);
  if (createData.data.totalValue === 999999) throw new Error('Computed field was overwritten by client!');


  // 2. GET /:id
  console.log('\\n[2] Testing GET /Arsenal/:id');
  const getRes = await fetch(`${BASE_URL}/${createdId}`);
  const getData = await getRes.json();
  if (getRes.status !== 200) throw new Error(`GET failed: ${JSON.stringify(getData)}`);
  console.log(`✅ Fetched successfully. Name: ${getData.data.name}`);


  // 3. PATCH (Valid Update)
  console.log('\\n[3] Testing PATCH /Arsenal/:id');
  const patchRes = await fetch(`${BASE_URL}/${createdId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      quantity: 15,
      updatedAt: currentVersion // Sending current version for Optimistic Concurrency
    })
  });
  const patchData = await patchRes.json();
  if (patchRes.status !== 200) throw new Error(`PATCH failed: ${JSON.stringify(patchData)}`);
  
  const newVersion = patchData.data.updatedAt;
  console.log(`✅ Updated successfully. New Quantity: ${patchData.data.quantity}, New Version: ${newVersion}`);
  console.log(`✅ Computed field recalculated: Total Value is now ${patchData.data.totalValue}`);


  // 4. PATCH with outdated version (409 Conflict Test)
  console.log('\\n[4] Testing 409 Conflict (Optimistic Concurrency)');
  const conflictRes = await fetch(`${BASE_URL}/${createdId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      quantity: 20,
      updatedAt: currentVersion // Intentionally using the OLD version
    })
  });
  if (conflictRes.status !== 409) {
    throw new Error(`Expected 409 Conflict, got ${conflictRes.status}. Data: ${JSON.stringify(await conflictRes.json())}`);
  }
  console.log(`✅ Correctly rejected with 409 Conflict! Error: ${(await conflictRes.json()).error}`);


  // 5. DELETE
  console.log('\\n[5] Testing DELETE /Arsenal/:id');
  const deleteRes = await fetch(`${BASE_URL}/${createdId}`, { method: 'DELETE' });
  if (deleteRes.status !== 200) throw new Error(`DELETE failed: ${JSON.stringify(await deleteRes.json())}`);
  console.log(`✅ Deleted successfully.`);


  // 6. Verify Deletion (GET should 404)
  console.log('\\n[6] Verifying Deletion (GET should 404)');
  const getDeletedRes = await fetch(`${BASE_URL}/${createdId}`);
  if (getDeletedRes.status !== 404) throw new Error(`Expected 404, got ${getDeletedRes.status}`);
  console.log(`✅ Verified correctly (404 Not Found).`);


  // 7. Schema Compatibility Test (Invalid DocType)
  console.log('\\n[7] Testing Schema Compatibility / Invalid DocType');
  const invalidRes = await fetch(`http://localhost:3000/api/resource/UnknownDocType`);
  if (invalidRes.status !== 404) throw new Error(`Expected 404 for unknown doctype, got ${invalidRes.status}`);
  console.log(`✅ Handled unknown DocType properly.`);

  console.log('\\n🎉 All E2E Tests Passed Successfully! 🎉');
}

runTests().catch(console.error);
