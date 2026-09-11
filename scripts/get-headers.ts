import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Personnel!1:1' });
  console.log(res.data.values?.[0]);
}
run().catch(console.error);
