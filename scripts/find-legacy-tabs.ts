import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupLegacyTabs() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingTabs = spreadsheet.data.sheets?.map(s => s.properties?.title) ?? [];

  const walkSync = (dir: string, filelist: string[] = []) => {
    fs.readdirSync(dir).forEach(file => {
      const dirFile = path.join(dir, file);
      try {
        filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
      } catch (err) {
        if ((err as any).code === 'ENOENT' || (err as any).code === 'EPERM') {}
      }
    });
    return filelist;
  };

  const apiFiles = walkSync(path.join(__dirname, '../src/app/api')).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  const foundTabs = new Set<string>();

  apiFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const matches = content.match(/range:\s*['"`]([A-Za-z0-9_-]+)!/g);
    if (matches) {
      matches.forEach(m => {
        const match = m.match(/['"`]([A-Za-z0-9_-]+)!/);
        if (match) {
          foundTabs.add(match[1]);
        }
      });
    }
  });

  console.log('Legacy Tabs found in API routes:', Array.from(foundTabs).join(', '));
  console.log('Existing Tabs:', existingTabs.join(', '));

  const missingTabs = Array.from(foundTabs).filter(tab => !existingTabs.includes(tab));
  console.log('Missing Tabs:', missingTabs.join(', '));

  for (const tabName of missingTabs) {
    console.log(`Creating missing legacy tab: ${tabName}`);
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }]
        }
      });
    } catch (e: any) {
       console.error(`Error creating tab ${tabName}:`, e.message);
    }
  }

  // Headers can be tricky without doctypes, let's just make sure the tabs exist.
  // I will check specific tabs that are usually required.
}

setupLegacyTabs().catch(console.error);
