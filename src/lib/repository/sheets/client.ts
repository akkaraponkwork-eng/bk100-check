import { google, sheets_v4 } from 'googleapis';

export class GoogleSheetsClient {
  private static instance: sheets_v4.Sheets | null = null;
  private static sheetId: string | null = null;

  static getInstance(): { sheets: sheets_v4.Sheets; sheetId: string } {
    if (!this.instance) {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!clientEmail || !privateKey || !spreadsheetId) {
        throw new Error('Google Sheets credentials are not properly configured in environment variables.');
      }

      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.instance = google.sheets({ version: 'v4', auth });
      this.sheetId = spreadsheetId;
    }

    return { sheets: this.instance, sheetId: this.sheetId! };
  }
}
