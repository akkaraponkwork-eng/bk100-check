import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function restore() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const header = [['id', 'rank', 'firstName', 'lastName', 'batch', 'phone', 'status', 'dutyCount', 'isNCOEligible', 'num', 'bedNumber']];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Personnel!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: header
    }
  });

  console.log('✅ Personnel legacy headers restored.');
}

restore();
