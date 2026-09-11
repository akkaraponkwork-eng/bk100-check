import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type MigrationRule = 'identity' | 'explicit-map' | 'metadata' | 'require-manual';

interface FieldMigration {
  source: string | null; // null means no legacy source
  target: string;
  rule: MigrationRule;
  mapping?: Record<string, string | boolean | null>;
}

const personnelMigrationConfig: Record<string, FieldMigration> = {
  id: { source: 'id', target: 'id', rule: 'identity' },
  rank: { 
    source: 'rank', 
    target: 'rank', 
    rule: 'explicit-map',
    mapping: {}
  },
  firstName: { source: 'firstName', target: 'firstName', rule: 'identity' },
  lastName: { source: 'lastName', target: 'lastName', rule: 'identity' },
  nickname: { source: 'nickname', target: 'nickname', rule: 'identity' },
  batch: { source: 'batch', target: 'batch', rule: 'identity' },
  phone: { source: 'phone', target: 'phone', rule: 'identity' },
  status: { source: 'status', target: 'status', rule: 'identity' },
  isNCOEligible: { 
    source: 'isNCOEligible', 
    target: 'isNCOEligible', 
    rule: 'explicit-map',
    mapping: {
      'TRUE': true,
      'FALSE': false,
      '': null
    }
  },
  bedNumber: { source: 'bedNumber', target: 'bedNumber', rule: 'identity' },
  personnelCode: { source: null, target: 'personnelCode', rule: 'require-manual' },
  updatedAt: { source: null, target: 'updatedAt', rule: 'metadata' }
};

async function migrate() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  console.log('┌──────────────────────────────────────────────┐');
  console.log('│ Personnel Migration Preview                  │');
  console.log('├──────────────────────────────────────────────┤');
  console.log('│ Source: Personnel (Legacy)                   │');
  console.log('│ Target: BKFW_Personnel                       │');
  console.log(`│ Mode: ${apply ? 'APPLY' : 'DRY-RUN'}                              │`);
  console.log('├──────────────────────────────────────────────┤');

  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  // 1. Fetch Legacy Data
  const legacyRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Personnel', // Legacy sheet
  });

  const legacyRows = legacyRes.data.values || [];
  if (legacyRows.length === 0) throw new Error('Legacy sheet is empty');
  
  const headers = legacyRows[0];
  const dataRows = legacyRows.slice(1);

  let exactMatch = 0;
  let transformed = 0;
  let warnings = 0;
  let rejected = 0;

  const toApply: any[] = [];

  for (const row of dataRows) {
    // Convert row array to object based on headers
    const sourceRecord: Record<string, string> = {};
    headers.forEach((h, i) => {
      sourceRecord[h] = row[i] || '';
    });

    const targetRecord: Record<string, any> = {};
    let rowRejected = false;
    let rejectReasons: string[] = [];
    let rowWarnings: string[] = [];
    let isTransformed = false;

    console.log(`\nID: ${sourceRecord['id']}`);

    for (const [targetField, config] of Object.entries(personnelMigrationConfig)) {
      const sourceVal = config.source ? sourceRecord[config.source] : null;

      if (config.rule === 'identity') {
        if (config.source === null) {
          rowRejected = true;
          rejectReasons.push(`${targetField}: No source mapped for identity`);
          console.log(`${targetField}:\n  missing → missing\n  ❌ REJECT (No source)`);
        } else {
          targetRecord[targetField] = sourceVal;
          console.log(`├── ${targetField} → EXACT`);
        }
      } 
      else if (config.rule === 'explicit-map') {
        if (sourceVal !== null && config.mapping && config.mapping.hasOwnProperty(sourceVal)) {
          targetRecord[targetField] = config.mapping[sourceVal];
          isTransformed = true;
          console.log(`├── ${targetField} "${sourceVal}" → "${targetRecord[targetField]}" (TRANSFORMED)`);
        } else {
          rowRejected = true;
          const errorMsg = targetField === 'isNCOEligible' ? 'UNKNOWN BOOLEAN REPRESENTATION' : `UNKNOWN MAPPING for "${sourceVal}"`;
          rejectReasons.push(`${targetField}: ${errorMsg}`);
          console.log(`├── ${targetField} "${sourceVal}" → ${errorMsg} → ❌ REJECT`);
        }
      }
      else if (config.rule === 'require-manual') {
        rowRejected = true;
        rejectReasons.push(`Missing required field ${targetField}`);
        console.log(`├── ${targetField}\n  missing → missing\n  ❌ REJECT (Missing required field)`);
      }
      else if (config.rule === 'metadata') {
        targetRecord[targetField] = new Date().toISOString();
      }
    }

    if (rowRejected) {
      rejected++;
      console.log(`❌ REJECTED`);
      rejectReasons.forEach(r => console.log(`   Reason: ${r}`));
    } else {
      if (isTransformed) {
        transformed++;
      } else {
        exactMatch++;
      }
      toApply.push(targetRecord);
    }
  }

  console.log('\n┌──────────────────────────────────────────────┐');
  console.log(`│ Rows scanned       : ${dataRows.length.toString().padEnd(24)}│`);
  console.log(`│ Exact match        : ${exactMatch.toString().padEnd(24)}│`);
  console.log(`│ Transformed        : ${transformed.toString().padEnd(24)}│`);
  console.log(`│ Warning            : ${warnings.toString().padEnd(24)}│`);
  console.log(`│ Rejected           : ${rejected.toString().padEnd(24)}│`);
  console.log('└──────────────────────────────────────────────┘');

  if (apply) {
    const targetSheet = 'BKFW_Personnel';
    if (targetSheet !== 'BKFW_Personnel') {
      throw new Error("MIGRATION TARGET MUST BE BKFW_Personnel");
    }

    if (rejected > 0) {
      console.error('\n❌ CANNOT APPLY: There are rejected rows. Fix mappings first.');
      process.exit(1);
    }
    console.log('\n🚀 Writing to BKFW_Personnel...');
    // We would write to BKFW_Personnel here, but we ensure id is preserved.
    // Left unimplemented until mapping is finalized.
  } else {
    console.log('\nRun with --apply to execute migration (currently disabled due to rejects).');
  }
}

migrate().catch(console.error);
