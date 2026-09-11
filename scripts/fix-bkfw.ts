import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import PersonnelDocType from '../src/doctypes/Personnel.json';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fix() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  
  const headers = PersonnelDocType.fields
    .filter((f: any) => f.sheetHeader)
    .map((f: any) => f.sheetHeader);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `BKFW_Personnel!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers]
    }
  });

  console.log('✅ Headers of BKFW_Personnel fixed:', headers);
}

fix();
