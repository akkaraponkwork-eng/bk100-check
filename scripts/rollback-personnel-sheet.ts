import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
import { ShadowGuard } from '../src/lib/repository/shadow-guard';

process.env.APP_ENV = 'production';
process.env.DATA_MODE = 'write';
process.env.ALLOW_PRODUCTION_WRITE = 'true';
dotenv.config({ path: '.env.local' });

async function rollback() {
  console.log('🔄 D1.5 Rollback: Restoring physical sheets');
  ShadowGuard.checkStartupGuard();

  const client = GoogleSheetsClient.getInstance();
  const { sheets, sheetId } = client;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const allSheets = spreadsheet.data.sheets || [];

  const personnelSheet = allSheets.find(s => s.properties?.title === 'Personnel');
  const legacySheet = allSheets.find(s => s.properties?.title === 'PersonnelLegacy');

  const requests: any[] = [];

  if (personnelSheet) {
    console.log('Renaming newly created "Personnel" -> "BKFW_Personnel"');
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: personnelSheet.properties?.sheetId,
          title: 'BKFW_Personnel',
        },
        fields: 'title',
      },
    });
  }

  if (legacySheet) {
    console.log('Renaming original "PersonnelLegacy" -> "Personnel"');
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: legacySheet.properties?.sheetId,
          title: 'Personnel',
        },
        fields: 'title',
      },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests },
    });
    console.log('✅ Rollback complete. Physical sheets restored.');
  } else {
    console.log('✅ Nothing to rollback.');
  }
}

rollback().catch(console.error);
