import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'BKFW_Personnel!1:1'
  });
  console.log(res.data.values);
}
check();
