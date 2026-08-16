import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function migrate() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.error('Missing Google credentials');
    process.exit(1);
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'AdminAccounts!A:B',
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      console.log('No admin accounts found.');
      return;
    }

    let updated = false;

    // Start from i=1 assuming row 0 is header ('Username', 'Password')
    // If there's no header, this will skip the first user. Let's check the first row.
    let startIndex = 0;
    if (rows[0] && rows[0][0] === 'Username') {
      startIndex = 1;
    }

    for (let i = startIndex; i < rows.length; i++) {
      const username = rows[i][0];
      const password = rows[i][1];

      if (!password) continue;

      if (!password.startsWith('$2a$') && !password.startsWith('$2b$')) {
        console.log(`Hashing password for user: ${username}`);
        const hashedPassword = await bcrypt.hash(password, 10);
        rows[i][1] = hashedPassword;
        updated = true;
      }
    }

    if (updated) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'AdminAccounts!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
      console.log('Passwords successfully migrated to bcrypt.');
    } else {
      console.log('All passwords are already hashed.');
    }

  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrate();
