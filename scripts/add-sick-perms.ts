import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  // Fetch roles
  const rolesRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'BKFW_Roles!A2:C' });
  const roles = rolesRes.data.values || [];
  const roleMap = Object.fromEntries(roles.map(r => [r[1], r[0]])); // key -> id

  // Fetch permissions
  const permsRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'BKFW_Permissions!A2:D' });
  const perms = permsRes.data.values || [];
  const existingPermKeys = new Set(perms.map(p => p[1]));

  const newPerms = [
    { key: 'Sick.manage', name: 'Sick.manage', group: 'Sick' },
    { key: 'Sick.request', name: 'Sick.request', group: 'Sick' }
  ];

  let addedPermIds: string[] = [];

  for (const p of newPerms) {
    if (!existingPermKeys.has(p.key)) {
      const id = crypto.randomUUID();
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'BKFW_Permissions!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[id, p.key, p.name, p.group]] }
      });
      console.log(`Added permission: ${p.key}`);
      addedPermIds.push(id);
    } else {
      console.log(`Permission ${p.key} already exists`);
      // Find its ID
      const exist = perms.find(x => x[1] === p.key);
      if (exist) addedPermIds.push(exist[0]);
    }
  }

  // Grant to admin by default
  const adminRoleId = roleMap['admin'];
  if (adminRoleId && addedPermIds.length > 0) {
    const rpRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'BKFW_RolePermissions!A2:C' });
    const rp = rpRes.data.values || [];
    
    for (const pid of addedPermIds) {
      const alreadyHas = rp.some(x => x[1] === adminRoleId && x[2] === pid);
      if (!alreadyHas) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'BKFW_RolePermissions!A:C',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[crypto.randomUUID(), adminRoleId, pid]] }
        });
        console.log(`Granted permission to admin: ${pid}`);
      }
    }
  }
}

run().catch(console.error);
