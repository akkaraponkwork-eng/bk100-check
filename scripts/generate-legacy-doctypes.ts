import fs from 'fs';
import path from 'path';
import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const legacyDoctypes = [
  {
    name: "LegacyUsers",
    sheetName: "Users",
    fields: ["lineUserId", "personnelId", "role", "displayName", "pictureUrl"]
  },
  {
    name: "LegacyRecords",
    sheetName: "Records",
    fields: ["date", "totalCompany", "totalDistributed", "remaining"]
  },
  {
    name: "LegacyTasks",
    sheetName: "Tasks",
    fields: ["id", "date", "title", "category", "location", "count", "countSenior", "countJunior", "status", "remark", "isFixed"]
  },
  {
    name: "LegacyDuty",
    sheetName: "Duty",
    fields: ["date", "location"]
  },
  {
    name: "LegacyDutySlots",
    sheetName: "DutySlots",
    fields: ["id", "dutyDate", "start", "end", "personnelId", "customName", "order", "isPunishment"]
  },
  {
    name: "LegacyLeave",
    sheetName: "Leave",
    fields: ["id", "personnelId", "leaveType", "startDate", "endDate", "days", "status", "remark", "timestamp"]
  },
  {
    name: "LegacyBotSettings",
    sheetName: "BotSettings",
    fields: ["groupId", "isBotActive"]
  },
  {
    name: "LegacyOrgChart",
    sheetName: "OrgChart",
    fields: ["role", "personnelId"]
  },
  {
    name: "LegacyNotifications",
    sheetName: "Notifications",
    fields: ["id", "userId", "title", "message", "type", "link", "isRead", "timestamp"]
  },
  {
    name: "LegacyNCO",
    sheetName: "NCO",
    fields: ["id", "date", "personnelId", "status"]
  },
  {
    name: "LegacyBeds",
    sheetName: "Beds",
    fields: ["id", "bedNumber", "status", "personnelId"]
  },
  {
    name: "LegacyBedReports",
    sheetName: "BedReports",
    fields: ["id", "date", "bedNumber", "status", "remark"]
  },
  {
    name: "LegacyAdminAccounts",
    sheetName: "AdminAccounts",
    fields: ["username", "passwordHash", "role"]
  },
  {
    name: "LegacyDutyMeta",
    sheetName: "DutyMeta",
    fields: ["id", "name", "value"]
  }
];

async function generate() {
  const doctypesDir = path.join(__dirname, '../src/doctypes');
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  for (const doc of legacyDoctypes) {
    const filePath = path.join(doctypesDir, `${doc.name}.json`);
    
    const doctypeJson = {
      name: doc.name,
      sheetName: doc.sheetName,
      storage: {
        provider: "google-sheets",
        sheetName: doc.sheetName,
        mode: "legacy-readonly" // Ensure shadow-guard allows writes via legacy API, but blocks framework
      },
      primaryKey: "id",
      fields: doc.fields.map(f => ({
        fieldname: f,
        type: "String",
        sheetHeader: f,
        label: f
      }))
    };

    fs.writeFileSync(filePath, JSON.stringify(doctypeJson, null, 2));
    console.log(`Generated Doctype: ${doc.name}.json`);

    // Set headers in Google Sheets
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${doc.sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [doc.fields] }
      });
      console.log(`✅ Headers set for tab: ${doc.sheetName}`);
    } catch (e: any) {
      console.error(`❌ Error setting headers for ${doc.sheetName}:`, e.message);
    }
  }
}

generate().catch(console.error);
