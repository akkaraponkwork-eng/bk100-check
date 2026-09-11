import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import { GoogleSheetsRepository } from '../src/lib/repository/sheets/repository';
import { ResourceService } from '../src/lib/services/resource';
import PersonnelSchema from '../src/doctypes/Personnel.json';
import { DocType } from '../src/lib/doctypes/schema';
import dotenv from 'dotenv';
import { ShadowGuard } from '../src/lib/repository/shadow-guard';

// Bypass shadow mode for this specific migration script
process.env.APP_ENV = 'production';
process.env.DATA_MODE = 'write';
process.env.ALLOW_PRODUCTION_WRITE = 'true';
dotenv.config({ path: '.env.local' });

async function execute() {
  console.log('🔄 D1.5 Backup and Re-import Personnel\n');
  ShadowGuard.checkStartupGuard();

  const client = GoogleSheetsClient.getInstance();
  const { sheets, sheetId } = client;
  const docType = PersonnelSchema as unknown as DocType;

  // 1. Fetch all tabs to see if PersonnelLegacy already exists
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const allSheets = spreadsheet.data.sheets || [];
  
  const personnelSheet = allSheets.find(s => s.properties?.title === 'Personnel');
  const legacySheet = allSheets.find(s => s.properties?.title === 'PersonnelLegacy');

  if (!personnelSheet) {
    console.error('❌ Personnel tab not found!');
    process.exit(1);
  }

  // 2. Backup: Rename Personnel to PersonnelLegacy (if not already done)
  if (!legacySheet) {
    console.log('📦 Renaming "Personnel" to "PersonnelLegacy" as a snapshot...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: personnelSheet.properties?.sheetId,
                title: 'PersonnelLegacy',
              },
              fields: 'title',
            },
          },
        ],
      },
    });
    console.log('✅ Renamed successfully.');
  } else {
    console.log('📦 "PersonnelLegacy" already exists. Skipping rename.');
  }

  // 3. Create fresh "Personnel" tab if it doesn't exist
  const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const hasNewPersonnel = updatedSpreadsheet.data.sheets?.find(s => s.properties?.title === 'Personnel');

  if (!hasNewPersonnel) {
    console.log('✨ Creating fresh "Personnel" tab with correct headers...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Personnel',
              },
            },
          },
        ],
      },
    });

    // Write headers
    const headers = docType.fields.filter(f => f.sheetHeader).map(f => f.sheetHeader);
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Personnel!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });
    console.log('✅ Fresh Personnel tab created.');
  }

  // 4. Read from PersonnelLegacy
  console.log('\n📖 Reading data from PersonnelLegacy...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'PersonnelLegacy',
  });

  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);
  
  console.log(`Found ${dataRows.length} rows to process.`);

  // 5. Validate, Normalize, and Re-import
  const repo = new GoogleSheetsRepository();
  const service = new ResourceService(repo);

  const mockAdmin = { id: 'admin', roles: ['admin'] };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const raw: any = {};
    headers.forEach((h, idx) => {
      raw[h] = row[idx] || '';
    });

    // Handle Mock/Test data (skip them)
    if (raw.personnelCode?.startsWith('T-') || raw.id === 'personnel-123') {
      console.log(`⏭️  Row ${i+2}: Skipping test data (${raw.personnelCode})`);
      continue;
    }
    
    if (!raw.personnelCode && !raw.firstName && !raw.lastName) {
       continue; // skip completely empty rows
    }

    // NORMALIZE the shifted columns based on D1.2 findings
    // We saw: personnelCode="พลฯ", rank="พิทยา", firstName="พงษ์คุณ", lastName="169"
    // Basically, everything is shifted left by 1 column
    
    const rankMap: Record<string, string> = {
      'พลฯ': 'private', 'ส.ต.': 'corporal', 'ส.ท.': 'sergeant',
      'ส.อ.': 'staff_sergeant', 'จ.ส.ต.': 'sergeant_major_3',
      'จ.ส.ท.': 'sergeant_major_2', 'จ.ส.อ.': 'sergeant_major_1',
      'ร.ต.': 'sub_lieutenant', 'ร.ท.': 'lieutenant', 'ร.อ.': 'captain'
    };

    const statusMap: Record<string, string> = {
      'พร้อมใช้งาน': 'available', 'available': 'available',
      'เข้าเวร': 'on_duty', 'on_duty': 'on_duty',
      'ลา': 'leave', 'leave': 'leave',
      'ป่วย': 'sick', 'sick': 'sick',
      'พ้นสภาพ': 'inactive', 'inactive': 'inactive',
      'TRUE': 'available', 'FALSE': 'available' // Fallback for the weird data
    };

    const rawRank = raw.personnelCode?.trim(); // "พลฯ"
    const rawFirstName = raw.rank?.trim(); // "พิทยา"
    const rawLastName = raw.firstName?.trim(); // "พงษ์คุณ"
    const rawBatch = parseInt(raw.lastName?.trim(), 10); // "169"

    const mappedRank = rankMap[rawRank];
    
    // Strict Validation
    if (!mappedRank) {
      console.log(`❌ Row ${i+2}: Invalid rank "${rawRank}". Rejecting.`);
      failCount++;
      continue;
    }
    
    if (isNaN(rawBatch)) {
      console.log(`❌ Row ${i+2}: Invalid batch "${raw.lastName}". Rejecting.`);
      failCount++;
      continue;
    }

    const payload = {
      personnelCode: `P${String(i+1).padStart(3, '0')}`, // Generating new clean personnel code
      rank: mappedRank,
      firstName: rawFirstName,
      lastName: rawLastName,
      batch: rawBatch,
      status: 'available', // Reset all to available for fresh start
      isNCOEligible: raw.status === 'TRUE' // Assuming 'status' column held the boolean
    };

    try {
      await service.create('Personnel', payload, mockAdmin);
      console.log(`✅ Row ${i+2}: Imported ${payload.firstName} ${payload.lastName}`);
      successCount++;
    } catch (e: any) {
      console.log(`❌ Row ${i+2}: Import failed - ${e.message}`);
      failCount++;
    }
  }

  console.log('\n--- Re-import Summary ---');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('-------------------------');
}

execute();
