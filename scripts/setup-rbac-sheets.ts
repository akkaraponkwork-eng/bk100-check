import { Assistant } from 'next/font/google';
import { GoogleSheetsClient } from '../src/lib/repository/sheets/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// COMPATIBILITY_MAP to seed
const COMPATIBILITY_MAP: Record<string, string[]> = {
  admin: [
    'Duty.read', 'Duty.create', 'Duty.update', 'Duty.delete',
    'Calendar.read', 'Calendar.manage',
    'Leave.read', 'Leave.approve',
    'Personnel.read', 'Personnel.manage',
    'Kanban.read', 'Kanban.manage',
    'Reports.read', 'Settings.read',
    'Beds.read', 'Beds.manage',
    'Sick.manage', 'Sick.request'
  ],
  commander: [
    'Duty.read', 'Duty.create', 'Duty.update',
    'Calendar.read', 'Calendar.manage',
    'Leave.read', 'Leave.approve',
    'Personnel.read',
    'Kanban.read',
    'Reports.read', 'Settings.read',
    'Beds.read',
    'Sick.request'
  ],
  duty_officer: [
    'Duty.read', 'Duty.update', 'Duty.create',
    'Calendar.read', 'Calendar.manage',
    'Leave.approve',
    'Kanban.read', 'Kanban.manage',
    'Reports.read',
    'Beds.read', 'Beds.manage',
    'Sick.manage', 'Sick.request'
  ],
  nco: [
    'Duty.read',
    'Calendar.read', 'Calendar.manage',
    'Leave.read',
    'Personnel.read',
    'Kanban.read', 'Kanban.manage',
    'Reports.read',
    'Beds.read', 'Beds.manage',
    'Sick.manage', 'Sick.request'
  ],
  personnel: [
    'Duty.read',
    'Calendar.read',
    'Leave.read',
    'Sick.request'
  ]
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  commander: 'ผู้บังคับบัญชา',
  duty_officer: 'นายเวร',
  nco: 'นายสิบเวร',
  assistant_nco: 'ผู้ช่วยสิบเวร',
  personnel: 'กำลังพล'
};

async function setup() {
  const { sheets, sheetId } = GoogleSheetsClient.getInstance();

  const requiredSheets = [
    { name: 'BKFW_Roles', headers: ['id', 'key', 'name'] },
    { name: 'BKFW_Permissions', headers: ['id', 'key', 'name', 'group'] },
    { name: 'BKFW_RolePermissions', headers: ['id', 'roleId', 'permissionId'] }
  ];

  for (const sheet of requiredSheets) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            { addSheet: { properties: { title: sheet.name } } }
          ]
        }
      });
      console.log(`✅ Created ${sheet.name}`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) throw e;
      console.log(`ℹ️ ${sheet.name} already exists`);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheet.name}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [sheet.headers] }
    });
  }

  // Clear data first
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: 'BKFW_Roles!A2:C' });
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: 'BKFW_Permissions!A2:D' });
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: 'BKFW_RolePermissions!A2:C' });

  // 1. Roles
  const roleRows = Object.entries(ROLE_LABELS).map(([key, name]) => [
    crypto.randomUUID(), key, name
  ]);
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'BKFW_Roles!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: roleRows }
  });
  console.log('✅ Seeded Roles');

  // 2. Permissions
  const uniquePermKeys = Array.from(new Set(Object.values(COMPATIBILITY_MAP).flat()));
  const permRows = uniquePermKeys.map(key => {
    const group = key.split('.')[0];
    const name = key;
    return [crypto.randomUUID(), key, name, group];
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'BKFW_Permissions!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: permRows }
  });
  console.log('✅ Seeded Permissions');

  // 3. RolePermissions
  const roleMap = Object.fromEntries(roleRows.map(r => [r[1], r[0]]));
  const permMap = Object.fromEntries(permRows.map(p => [p[1], p[0]]));

  const rolePermRows: string[][] = [];
  for (const [roleKey, perms] of Object.entries(COMPATIBILITY_MAP)) {
    const roleId = roleMap[roleKey];
    for (const permKey of perms) {
      const permId = permMap[permKey];
      rolePermRows.push([crypto.randomUUID(), roleId, permId]);
    }
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'BKFW_RolePermissions!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rolePermRows }
  });
  console.log('✅ Seeded RolePermissions');

  console.log('✅ Done!');
}

setup().catch(console.error);
