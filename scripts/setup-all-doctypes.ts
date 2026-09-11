import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupAllDocTypes() {
  const doctypesDir = path.join(__dirname, '../src/doctypes');
  const files = fs.readdirSync(doctypesDir).filter(f => f.endsWith('.json'));
  
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) ?? [];

  console.log('Existing tabs:', existingTabs);

  for (const file of files) {
    if (file.includes('Test')) continue; // skip test doctypes
    
    const doctype = JSON.parse(fs.readFileSync(path.join(doctypesDir, file), 'utf-8'));
    const tabName = doctype.storage?.sheetName || doctype.sheetName || doctype.name;
    
    if (!tabName) continue;

    console.log(`\nProcessing doctype: ${file} (Target Tab: ${tabName})`);

    // Create tab if it doesn't exist
    if (!existingTabs.includes(tabName)) {
      console.log(`Creating missing tab: ${tabName}`);
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: tabName } } }]
          }
        });
        existingTabs.push(tabName);
      } catch (e: any) {
         console.error(`Error creating tab ${tabName}:`, e.message);
      }
    } else {
      console.log(`Tab ${tabName} already exists.`);
    }

    // Set headers
    const headers = doctype.fields
      ?.filter((f: any) => f.sheetHeader || f.fieldname || f.name)
      ?.map((f: any) => f.sheetHeader || f.fieldname || f.name) || [];

    if (headers.length > 0) {
      console.log(`Setting headers for ${tabName}: ${headers.join(', ')}`);
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tabName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] }
        });
      } catch (e: any) {
        console.error(`Error setting headers for ${tabName}:`, e.message);
      }
    }
  }
  
  console.log('\nAll missing doctypes have been setup.');
}

setupAllDocTypes().catch(console.error);
