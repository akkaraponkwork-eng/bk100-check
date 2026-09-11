/**
 * Test Script for Vehicle DocType to prove the Generic Resource Framework
 */

const BASE_URL = 'http://localhost:3000/api/resource/Vehicle';

async function runTests() {
  console.log('--- Starting Vehicle Framework Tests ---');

  // 1. POST (Create)
  console.log('\\n[1] Testing POST /Vehicle');
  const createPayload = {
    licensePlate: '1กท 9999',
    brand: 'Toyota Hilux Revo',
    status: 'พร้อมใช้งาน'
  };
  
  const createRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  
  const createData = await createRes.json();
  if (createRes.status !== 201) throw new Error(`POST failed: ${JSON.stringify(createData)}`);
  
  const createdId = createData.data.id;
  console.log(`✅ Created successfully. ID: ${createdId}`);


  // 2. GET (List)
  console.log('\\n[2] Testing GET /Vehicle');
  const getRes = await fetch(BASE_URL);
  const getData = await getRes.json();
  if (getRes.status !== 200) throw new Error(`GET failed: ${JSON.stringify(getData)}`);
  console.log(`✅ Fetched successfully. Total vehicles: ${getData.data.length}`);
  console.log(`✅ First vehicle: ${getData.data[0].brand} (${getData.data[0].licensePlate})`);

  console.log('\\n🎉 Vehicle Test Passed Successfully! The Generic Resource Framework is proven! 🎉');
}

runTests().catch(console.error);
