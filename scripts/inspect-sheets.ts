/**
 * Script to inspect actual Google Sheets structure
 * Reads headers + first 3 data rows from each tab to compare with DocType schemas
 */
import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TABS_TO_INSPECT = [
  'Duty',
  'NCO',
  'Leave',
  'DutySlots',
];

async function inspectSheets() {
  console.log('🔍 Inspecting Google Sheets structure...\n');
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  // First get list of all tabs in the spreadsheet
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const allTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) ?? [];
  
  console.log('📊 All tabs in spreadsheet:');
  allTabs.forEach(tab => console.log(`   - ${tab}`));
  console.log('');

  for (const tabName of TABS_TO_INSPECT) {
    if (!allTabs.includes(tabName)) {
      console.log(`⚠️  Tab "${tabName}" — NOT FOUND in spreadsheet`);
      console.log('');
      continue;
    }

    try {
      // Get first 4 rows (header + 3 data rows)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!A1:Z4`,
      });

      const rows = res.data.values ?? [];
      const headers = rows[0] ?? [];
      const dataRows = rows.slice(1);

      console.log(`✅ Tab: "${tabName}"`);
      console.log(`   Headers (${headers.length}): ${headers.join(' | ')}`);
      
      if (dataRows.length === 0) {
        console.log('   Data: (empty — no rows yet)');
      } else {
        dataRows.forEach((row, i) => {
          const preview: Record<string, string> = {};
          headers.forEach((h, idx) => {
            preview[h] = row[idx] ?? '(empty)';
          });
          console.log(`   Row ${i + 1}:`, JSON.stringify(preview, null, 0)
            .replace(/[{}]/g, '')
            .replace(/","/g, '", "')
            .substring(0, 200));
        });
      }
      console.log('');
    } catch (e: any) {
      console.log(`❌ Tab "${tabName}" — Error reading: ${e.message}`);
      console.log('');
    }
  }

  console.log('✅ Inspection complete.');
}

inspectSheets();
