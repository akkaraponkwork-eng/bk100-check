import { GoogleSheetsRepository } from '../src/lib/repository/sheets/repository';
import { DocType } from '../src/lib/doctypes/schema';
import PersonnelSchema from '../src/doctypes/Personnel.json';
import dotenv from 'dotenv';
import assert from 'assert';
import { ReadOnlyError } from '../src/lib/repository/shadow-guard';

// Force environment if not set
process.env.APP_ENV = 'production';
process.env.DATA_MODE = 'shadow';
dotenv.config({ path: '.env.local' });

async function testShadowGuard() {
  console.log('🧪 Testing ShadowGuard in D1.1...');
  
  const repo = new GoogleSheetsRepository();
  const personnelDocType = PersonnelSchema as unknown as DocType;

  // 1. Test GET (Should succeed)
  try {
    console.log('--- Test 1: GET Personnel ---');
    const records = await repo.list(personnelDocType, { limit: 1 });
    console.log(`✅ Test 1 Passed: Read operation successful. Retrieved ${records.length} records.`);
  } catch (error: any) {
    console.error(`❌ Test 1 Failed: Should allow read, but got error: ${error.message}`);
    process.exit(1);
  }

  // 2. Test POST (Should fail)
  try {
    console.log('--- Test 2: POST Personnel ---');
    await repo.create(personnelDocType, { personnelCode: 'TEST' });
    console.error('❌ Test 2 Failed: POST should have been blocked!');
    process.exit(1);
  } catch (error: any) {
    assert(error instanceof ReadOnlyError || error.name === 'ReadOnlyError', 'Error should be ReadOnlyError');
    console.log(`✅ Test 2 Passed: POST blocked successfully (${error.message})`);
  }

  // 3. Test PATCH (Should fail)
  try {
    console.log('--- Test 3: PATCH Personnel ---');
    await repo.update(personnelDocType, 'some-id', { personnelCode: 'TEST2' });
    console.error('❌ Test 3 Failed: PATCH should have been blocked!');
    process.exit(1);
  } catch (error: any) {
    assert(error instanceof ReadOnlyError || error.name === 'ReadOnlyError', 'Error should be ReadOnlyError');
    console.log(`✅ Test 3 Passed: PATCH blocked successfully (${error.message})`);
  }

  // 4. Test DELETE (Should fail)
  try {
    console.log('--- Test 4: DELETE Personnel ---');
    await repo.delete(personnelDocType, 'some-id');
    console.error('❌ Test 4 Failed: DELETE should have been blocked!');
    process.exit(1);
  } catch (error: any) {
    assert(error instanceof ReadOnlyError || error.name === 'ReadOnlyError', 'Error should be ReadOnlyError');
    console.log(`✅ Test 4 Passed: DELETE blocked successfully (${error.message})`);
  }

  console.log('\n🎉 All ShadowGuard tests passed! Production write protection is solid.');
}

testShadowGuard();
