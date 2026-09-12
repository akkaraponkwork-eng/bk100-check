import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ['BKFW_Roles!A2:C', 'BKFW_Permissions!A2:D', 'BKFW_RolePermissions!A2:C'],
  });

  const roles = res.data.valueRanges?.[0].values || [];
  const perms = res.data.valueRanges?.[1].values || [];
  const rolePerms = res.data.valueRanges?.[2].values || [];

  console.log(`Roles count: ${roles.length}`);
  console.log(`Perms count: ${perms.length}`);
  console.log(`RolePerms count: ${rolePerms.length}`);

  const personnelRole = roles.find(r => r[1] === 'personnel');
  if (personnelRole) {
    const pPerms = rolePerms.filter(rp => rp[1] === personnelRole[0]);
    console.log(`Personnel has ${pPerms.length} perms`);
    for (const rp of pPerms) {
      const p = perms.find(p => p[0] === rp[2]);
      if (p) console.log(` - ${p[1]}`);
    }
  }
}
run().catch(console.error);
