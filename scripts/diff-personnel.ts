import { GoogleSheetsRepository } from '../src/lib/repository/sheets/repository';
import { DocType } from '../src/lib/doctypes/schema';
import PersonnelSchema from '../src/doctypes/Personnel.json';
import dotenv from 'dotenv';

// Force environment if not set
process.env.APP_ENV = 'production';
process.env.DATA_MODE = 'shadow';
dotenv.config({ path: '.env.local' });

async function diffPersonnel() {
  console.log('🔍 D1.2 Data Diff / Personnel Validation\n');
  
  const repo = new GoogleSheetsRepository();
  const docType = PersonnelSchema as unknown as DocType;
  
  try {
    const records = await repo.list(docType);
    console.log(`Loaded ${records.length} records from 'Personnel' sheet.\n`);

    const rankOptions = docType.fields.find(f => f.fieldname === 'rank')?.options || [];
    const statusOptions = docType.fields.find(f => f.fieldname === 'status')?.options || [];

    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;

    records.forEach((row, index) => {
      const issues: string[] = [];
      const rowNum = index + 2; // +1 for header, +1 for 0-index

      // Check rank
      if (!row.rank) {
        issues.push('❌ Missing rank');
      } else if (!rankOptions.includes(row.rank)) {
        issues.push(`❌ Invalid rank: "${row.rank}"`);
      }

      // Check status
      if (!row.status) {
        issues.push('❌ Missing status');
      } else if (!statusOptions.includes(row.status)) {
        issues.push(`❌ Invalid status: "${row.status}"`);
      }

      // Check batch
      if (row.batch === null || row.batch === undefined) {
        issues.push('❌ Missing batch');
      } else if (typeof row.batch !== 'number') {
        issues.push(`❌ Invalid batch type: ${typeof row.batch} (value: ${row.batch})`);
      }

      // Check isNCOEligible
      if (row.isNCOEligible !== null && row.isNCOEligible !== undefined && typeof row.isNCOEligible !== 'boolean') {
        issues.push(`❌ Invalid isNCOEligible type: ${typeof row.isNCOEligible} (value: ${row.isNCOEligible})`);
      }

      // Check required text fields
      if (!row.firstName) issues.push('❌ Missing firstName');
      if (!row.lastName) issues.push('❌ Missing lastName');
      if (!row.personnelCode) issues.push('❌ Missing personnelCode');

      if (issues.length === 0) {
        console.log(`✅ Row ${rowNum} (${row.personnelCode}): OK`);
        validCount++;
      } else {
        const isWarning = !issues.some(i => i.startsWith('❌'));
        if (isWarning) {
          console.log(`⚠️ Row ${rowNum}: ${issues.join(', ')}`);
          warningCount++;
        } else {
          console.log(`❌ Row ${rowNum}: ${issues.join(', ')}`);
          invalidCount++;
        }
      }
    });

    console.log('\n--- Summary ---');
    console.log(`✅ Valid: ${validCount}`);
    console.log(`⚠️ Warning: ${warningCount}`);
    console.log(`❌ Invalid: ${invalidCount}`);
    console.log('---------------');

  } catch (error: any) {
    console.error(`Failed to diff personnel: ${error.message}`);
    process.exit(1);
  }
}

diffPersonnel();
