import { DocTypeRegistry } from '../src/lib/doctypes/registry';
import { PolicyEngine } from '../src/lib/policies/engine';

async function runTests() {
  console.log('--- Starting D2.2 RBAC & Schema Tests ---');

  // Test 1: Personnel rank values are Thai
  const personnelDocType = DocTypeRegistry.get('Personnel');
  const rankField = personnelDocType.fields.find(f => f.fieldname === 'rank');
  if (rankField && rankField.options) {
    const hasPrivate = rankField.options.some(o => o === 'พลฯ');
    if (hasPrivate) {
      console.log('✅ [D2-Test-1] Personnel rank uses exact Thai strings ("พลฯ", etc.)');
    } else {
      console.error('❌ [D2-Test-1] Personnel rank does NOT use exact Thai strings');
    }
  }

  // Test 2: NCOAssignment DocType is registered and separate from DutyAssignment
  try {
    const ncoDocType = DocTypeRegistry.get('NCOAssignment');
    console.log(`✅ [D2-Test-2] NCOAssignment registered. Sheet: ${ncoDocType.storage?.sheetName}`);
  } catch (e) {
    console.error('❌ [D2-Test-2] NCOAssignment is missing!');
  }

  // Test 3: DutyAssignment has 3 shifts
  try {
    const dutyDocType = DocTypeRegistry.get('DutyAssignment');
    const dutyTypeField = dutyDocType.fields.find(f => f.fieldname === 'dutyType');
    if (dutyTypeField && dutyTypeField.options && dutyTypeField.options.length === 3) {
      console.log(`✅ [D2-Test-3] DutyAssignment uses 3 explicit shifts: ${dutyTypeField.options.join(', ')}`);
    } else {
      console.error('❌ [D2-Test-3] DutyAssignment does NOT have exactly 3 shifts!');
    }
  } catch (e) {
    console.error('❌ [D2-Test-3] DutyAssignment is missing!');
  }

  // Test 4: RBAC Engine can evaluate permissions
  try {
    const docType = DocTypeRegistry.get('DutyAssignment');
    const userAdmin = { id: 'u1', roles: ['admin'] };
    const userSoldier = { id: 'u2', roles: ['personnel'] };

    const canAdminCreate = PolicyEngine.can(docType, 'create', userAdmin);
    const canSoldierCreate = PolicyEngine.can(docType, 'create', userSoldier);
    const canSoldierRead = PolicyEngine.can(docType, 'read', userSoldier);

    if (canAdminCreate && !canSoldierCreate && canSoldierRead) {
      console.log('✅ [D2-Test-4] PolicyEngine correctly evaluates DocType JSON permissions based on roles');
    } else {
      console.error('❌ [D2-Test-4] PolicyEngine evaluation failed!');
    }
  } catch (e) {
    console.error('❌ [D2-Test-4] Error evaluating RBAC: ' + e);
  }

  console.log('\n🎉 All D2.2 Backend Foundation Tests Completed! 🎉');
}

runTests().catch(console.error);
