import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { Mission, MissionYearlySummary } from '@/types';

export const dynamic = 'force-dynamic';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) throw new Error('Missing Google credentials');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { auth, sheetId };
}

// GET /api/missions/summary?year=2026
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetYear = parseInt(searchParams.get('year') || '', 10);
    if (isNaN(targetYear)) {
      targetYear = new Date().getFullYear();
    }
    const yearPrefix = String(targetYear);

    const { auth, sheetId } = getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    let missionRows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Missions!A2:L',
      });
      missionRows = (res.data.values || []).filter(r => r && r[0]);
    } catch (e) {
      console.warn('Missions sheet not accessible for summary');
    }

    // Personnel map for names
    let personnelMap: Record<string, { rank: string; name: string }> = {};
    try {
      const pRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Personnel!A2:E',
      });
      (pRes.data.values || []).forEach(p => {
        if (p[0]) {
          personnelMap[p[0]] = {
            rank: p[1] || '',
            name: `${p[2] || ''} ${p[3] || ''}`.trim(),
          };
        }
      });
    } catch {}

    const yearMissions = missionRows
      .filter(r => (r[2] || '').startsWith(yearPrefix))
      .map(r => ({
        id: r[0],
        title: r[1] || '',
        date: r[2] || '',
        assignedPersonnelIds: r[6] ? r[6].split(',').map(s => s.trim()).filter(Boolean) : [],
        status: r[7] || 'pending',
      }));

    const totalMissions = yearMissions.length;
    const completedMissions = yearMissions.filter(m => m.status === 'completed').length;
    const inProgressMissions = yearMissions.filter(m => m.status === 'in_progress').length;
    const pendingMissions = yearMissions.filter(m => m.status === 'pending').length;

    // Monthly breakdown (1-12)
    const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const mStr = `${yearPrefix}-${String(i + 1).padStart(2, '0')}`;
      const inMonth = yearMissions.filter(m => m.date.startsWith(mStr));
      return {
        month: monthNamesThai[i],
        count: inMonth.length,
        completed: inMonth.filter(m => m.status === 'completed').length,
      };
    });

    // Top Personnel
    const personCountMap: Record<string, number> = {};
    let totalAssignments = 0;
    yearMissions.forEach(m => {
      m.assignedPersonnelIds.forEach(pid => {
        personCountMap[pid] = (personCountMap[pid] || 0) + 1;
        totalAssignments += 1;
      });
    });

    const topPersonnel = Object.entries(personCountMap)
      .map(([pid, count]) => {
        const info = personnelMap[pid] || { rank: '', name: pid };
        return {
          personnelId: pid,
          rank: info.rank,
          name: info.name,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const summary: MissionYearlySummary = {
      year: targetYear,
      totalMissions,
      completedMissions,
      inProgressMissions,
      pendingMissions,
      totalPersonnelAssigned: totalAssignments,
      monthlyBreakdown,
      topPersonnel,
    };

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('GET /api/missions/summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
