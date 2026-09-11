import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
import { ShadowGuard } from '../src/lib/repository/shadow-guard';

// Bypass shadow mode for this cleanup script
process.env.APP_ENV = 'production';
process.env.DATA_MODE = 'write';
process.env.ALLOW_PRODUCTION_WRITE = 'true';
dotenv.config({ path: '.env.local' });

async function cleanupSandbox() {
  console.log('🧹 D1.3 Cleanup Test Data from Sandbox\n');
  ShadowGuard.checkStartupGuard();

  const client = GoogleSheetsClient.getInstance();
  const { sheets, sheetId } = client;

  const targets = ['LeaveRequest', 'DutyAssignment'];

  for (const tab of targets) {
    console.log(`\n--- Inspecting ${tab} ---`);
    
    // Get internal grid ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === tab);
    const gridId = sheet?.properties?.sheetId;

    if (gridId === undefined) {
      console.log(`⚠️ Tab ${tab} not found.`);
      continue;
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: tab,
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
      console.log(`✅ No data rows found in ${tab}.`);
      continue;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const personnelIdIdx = headers.indexOf('personnelId');

    if (personnelIdIdx === -1) continue;

    // Delete requests must be in reverse order to not shift indexes during deletion
    const deleteRequests: any[] = [];
    
    for (let i = dataRows.length - 1; i >= 0; i--) {
      const row = dataRows[i];
      const pId = row[personnelIdIdx];
      
      // Heuristic for test data: personnel-123, MOCK_, or normal UUIDs from the test suite
      if (pId === 'personnel-123' || pId?.startsWith('MOCK_') || pId?.length === 36) {
        console.log(`🗑️  Scheduling delete for row ${i + 2} (Test data: ${pId})`);
        deleteRequests.push({
          deleteDimension: {
            range: {
              sheetId: gridId,
              dimension: 'ROWS',
              startIndex: i + 1, // 0-indexed API (row 2 is index 1)
              endIndex: i + 2,
            }
          }
        });
      }
    }

    if (deleteRequests.length > 0) {
      console.log(`🚀 Executing ${deleteRequests.length} deletions...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: deleteRequests
        }
      });
      console.log(`✅ Successfully deleted ${deleteRequests.length} rows.`);
    } else {
      console.log(`✅ No test data found to delete in ${tab}.`);
    }
  }
}

cleanupSandbox();
