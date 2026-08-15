const fs = require('fs');
const { google } = require('googleapis');
const crypto = require('crypto');

// Manual dotenv parser
const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function fixTodayData() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey) {
    // Remove surrounding quotes if present and replace \\n with \n
    privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  }
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error('Missing Google Sheets API credentials');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  // Hardcode today as 2026-08-15
  const today = '2026-08-15';
  
  console.log(`Fixing data for ${today}...`);

  // 1. Reset Record in Records!A:D
  const recordRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Records!A2:D',
  });
  const recordRows = recordRes.data.values || [];
  const recordIndex = recordRows.findIndex(r => r[0] === today);
  
  // Set totalCompany=0, totalDistributed=0, remaining=0
  const recordData = [today, 0, 0, 0];
  
  if (recordIndex !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Records!A${recordIndex + 2}:D${recordIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [recordData] }
    });
    console.log('Reset Record to 0');
  } else {
    console.log('No record found for today, nothing to reset in Records.');
  }

  // 2. Clear duplicated tasks in Tasks!A:K and replace with defaults
  let taskRows = [];
  try {
    const taskRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Tasks!A2:K',
    });
    taskRows = taskRes.data.values || [];
  } catch {}

  const otherTasks = taskRows.filter(r => r[1] !== today); // Keep tasks from other dates
  console.log(`Found ${taskRows.length - otherTasks.length} tasks for today. Deleting them...`);
  
  const DEFAULT_TASKS = [
    { title: 'บก.ร้อย', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'คลังผ้า', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'คลังโยธา', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'รถไถ', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'ตัดหญ้า', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'ตัดแต่ง', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'ทั่วไป (กองร้อย)', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'ชุดช่าง บก.พัน', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'ป่วย', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'ตร.ศบบ.', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
    { title: 'บ้านพัก ผบ.ศบบ.', category: 'รปจ', location: '', count: '', countSenior: '', countJunior: '', status: 'todo', isFixed: true },
  ];

  const newTasks = DEFAULT_TASKS.map(t => [
    crypto.randomUUID(),
    today,
    t.title,
    t.category,
    t.location,
    t.count,
    t.countSenior,
    t.countJunior,
    t.status,
    '', // remark
    String(t.isFixed)
  ]);

  const allTasksToSave = [...otherTasks, ...newTasks];

  // Clear and rewrite Tasks
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'Tasks!A2:K',
  });

  if (allTasksToSave.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Tasks!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allTasksToSave }
    });
  }
  
  console.log('Replaced tasks with defaults successfully.');
}

fixTodayData().catch(console.error);
