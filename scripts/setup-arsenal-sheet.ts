import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import ArsenalDocType from '../src/doctypes/Arsenal.json';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupSheet() {
  console.log('Setting up Google Sheet...');
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  try {
    // 1. Create the 'Arsenal' tab
    console.log(`Creating tab: ${ArsenalDocType.sheetName}`);
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: ArsenalDocType.sheetName,
                }
              }
            }
          ]
        }
      });
      console.log('✅ Tab created successfully.');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️ Tab already exists, proceeding to setup headers.');
      } else {
        throw e;
      }
    }

    // 2. Set the header row
    console.log('Setting up headers...');
    const headers = ArsenalDocType.fields
      .filter((f: any) => f.sheetHeader)
      .map((f: any) => f.sheetHeader);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${ArsenalDocType.sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers]
      }
    });

    console.log(`✅ Headers configured: ${headers.join(', ')}`);
    console.log('🎉 Setup complete! You can now run E2E tests.');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupSheet();
