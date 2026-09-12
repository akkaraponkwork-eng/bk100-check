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

  console.log(`\n📊 Roles (${roles.length}):`);
  for (const r of roles) console.log(`  [${r[1]}] ${r[2]}`);

  console.log(`\n🔑 Permissions (${perms.length}):`);
  for (const p of perms) console.log(`  [${p[3]}] ${p[1]}`);

  console.log(`\n🔗 Role ↔ Permission Matrix:`);
  for (const r of roles) {
    const myPerms = rolePerms
      .filter(rp => rp[1] === r[0])
      .map(rp => perms.find(p => p[0] === rp[2])?.[1] ?? '???');
    console.log(`\n  ${r[2]} (${r[1]}): ${myPerms.length} perms`);
    for (const pk of myPerms) console.log(`    ✓ ${pk}`);
  }
}
run().catch(console.error);
