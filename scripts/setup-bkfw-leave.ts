import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import LeaveRequestDocType from '../src/doctypes/LeaveRequest.json';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setup() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const sheetName = LeaveRequestDocType.storage.sheetName; // BKFW_LeaveRequest

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              }
            }
          }
        ]
      }
    });
    console.log(`✅ Tab ${sheetName} created.`);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log(`ℹ️ Tab ${sheetName} already exists.`);
    } else {
      throw e;
    }
  }

  const headers = LeaveRequestDocType.fields
    .filter((f: any) => f.sheetHeader)
    .map((f: any) => f.sheetHeader);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers]
    }
  });

  console.log(`✅ Headers of ${sheetName} set:`, headers);
}

setup();
