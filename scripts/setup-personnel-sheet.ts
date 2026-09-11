import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import PersonnelDocType from '../src/doctypes/Personnel.json';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupSheet() {
  console.log('Setting up Google Sheet...');
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  try {
    // 1. Create the 'Personnel' tab
    console.log(`Creating tab: ${PersonnelDocType.sheetName}`);
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: PersonnelDocType.sheetName,
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
    const headers = PersonnelDocType.fields
      .filter((f: any) => f.sheetHeader)
      .map((f: any) => f.sheetHeader);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${PersonnelDocType.sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers]
      }
    });

    console.log(`✅ Headers configured: ${headers.join(', ')}`);
    
    // 3. Insert mock data
    console.log('Checking for existing data...');
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${PersonnelDocType.sheetName}!A2:A2`,
    });
    
    if (!existing.data.values || existing.data.values.length === 0) {
      console.log('Inserting mock data...');
      const mockValues = headers.map(h => {
        if (h === 'id') return crypto.randomUUID();
        if (h === 'personnelCode') return 'BK-1001';
        if (h === 'rank') return 'private';
        if (h === 'firstName') return 'สมชาย';
        if (h === 'lastName') return 'ใจดี';
        if (h === 'nickname') return 'ชาย';
        if (h === 'batch') return 168;
        if (h === 'phone') return '0812345678';
        if (h === 'status') return 'available';
        if (h === 'isNCOEligible') return 'false';
        if (h === 'bedNumber') return 'A01';
        if (h === 'updatedAt') return new Date().toISOString();
        return '';
      });
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${PersonnelDocType.sheetName}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [mockValues]
        }
      });
      console.log('✅ Mock data inserted.');
    } else {
      console.log('ℹ️ Data already exists, skipping mock insert.');
    }
    
    console.log('🎉 Setup complete! You can now test the Personnel UI.');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupSheet();
