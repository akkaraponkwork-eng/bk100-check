import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { DutyShift, ShiftSlot } from '@/types';
import { pushLineMessage } from '@/lib/line';

export const dynamic = 'force-dynamic';

function getSheetAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) throw new Error('Missing credentials');
  const auth = new google.auth.JWT({
    email: clientEmail, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { auth, sheetId };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    
    // Check for Vercel Cron header, auth header, or URL secret
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}` 
                || request.headers.get('x-vercel-cron') === '1'
                || (secret && (secret === process.env.CRON_SECRET || secret === process.env.INTERNAL_API_SECRET));
    
    // For local testing, allow if no cron secret is set, otherwise enforce it
    if (process.env.NODE_ENV === 'production' && !isCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    // BKK timezone YYYY-MM-DD
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const internalHeaders = { 'x-internal-token': process.env.INTERNAL_API_SECRET || 'bk100-internal-fallback' };

    // 1. Fetch all required data
    const responses = await Promise.all([
      fetch(`${origin}/api/personnel`, { headers: internalHeaders }),
      fetch(`${origin}/api/duty`, { headers: internalHeaders }),
      fetch(`${origin}/api/duty-meta`, { headers: internalHeaders }),
      fetch(`${origin}/api/bot-settings`, { headers: internalHeaders })
    ]);

    for (const res of responses) {
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Fetch failed for ${res.url}: ${res.status} ${text}` }, { status: 500 });
      }
    }

    const [
      { personnel },
      { shifts },
      { punishments, exceptions },
      botSettings
    ] = await Promise.all(responses.map(r => r.json()));

    const autoDutyTime = botSettings.autoDutyTime || '12:00';
    const autoHour = parseInt(autoDutyTime.split(':')[0], 10);
    const currentHour = today.getHours();

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true';

    if (!isPreview && currentHour !== autoHour) {
      return NextResponse.json({ message: `Not the scheduled time. Scheduled for ${autoHour}:00 (BKK), Current hour is ${currentHour}:00 (BKK)` });
    }

    // Check if duty for today already exists
    const existingShift = shifts?.find((s: any) => s.date === todayStr);
    if (!isPreview && existingShift && existingShift.timeSlots?.length > 0 && existingShift.timeSlots.some((s: any) => s.personnelId)) {
      return NextResponse.json({ message: 'Duty for today already exists' });
    }

    // 2. Prepare data structures (same logic as handleAutoFill in frontend)
    const todayPunishments = (punishments || []).filter((p: any) => p.startDate <= todayStr && p.endDate >= todayStr);
    const punishedIds = Array.from(new Set(todayPunishments.map((p: any) => p.personnelId)));

    const isPersonnelAvailable = (p: any, dateStr: string, exceptionsList: any[]) => {
      if (p.status !== 'available') return false;
      const exc = exceptionsList.find((e: any) => e.personnelId === p.id && e.startDate <= dateStr && e.endDate >= dateStr && e.reason !== 'ผู้ช่วยสิบเวร');
      return !exc;
    };

    const sortPersonnelByBatchAndNum = (a: any, b: any) => {
      const batchA = Number(a.batch) || 0;
      const batchB = Number(b.batch) || 0;
      const yearA = batchA % 100;
      const termA = Math.floor(batchA / 100);
      const yearB = batchB % 100;
      const termB = Math.floor(batchB / 100);
      if (yearA !== yearB) return yearA - yearB;
      if (termA !== termB) return termA - termB;
      return (a.num || 0) - (b.num || 0);
    };

    const available = (personnel || [])
      .filter((p: any) => p.rank?.includes('พลฯ'))
      .filter((p: any) => isPersonnelAvailable(p, todayStr, exceptions || []))
      .sort(sortPersonnelByBatchAndNum);

    const availableNotPunished = available.filter((p: any) => !punishedIds.includes(p.id));

    // 3. Find last assigned person
    let lastAssignedId = '';
    const pastDates = (shifts || []).map((s: any) => s.date).filter((d: string) => d < todayStr).sort().reverse();
    
    const shiftsMap = (shifts || []).reduce((acc: any, s: any) => ({ ...acc, [s.date]: s }), {});

    for (const d of pastDates) {
      const shift = shiftsMap[d];
      if (!shift || !shift.timeSlots) continue;
      const sortedSlots = [...shift.timeSlots].sort((a: any, b: any) => b.order - a.order);
      const lastSlot = sortedSlots.find((s: any) => s.personnelId && !s.isPunishment);
      if (lastSlot) {
        lastAssignedId = lastSlot.personnelId;
        break;
      }
    }

    let aIdx = 0;
    if (lastAssignedId) {
      const idx = availableNotPunished.findIndex((p: any) => p.id === lastAssignedId);
      if (idx !== -1) aIdx = idx + 1;
      else {
        const lastPerson = personnel.find((p: any) => p.id === lastAssignedId);
        if (lastPerson) {
          const nextIdx = availableNotPunished.findIndex((p: any) => sortPersonnelByBatchAndNum(p, lastPerson) > 0);
          aIdx = nextIdx !== -1 ? nextIdx : 0;
        }
      }
    }

    // 4. Fill slots
    const newSlotPersonnelIds = Array(6).fill('');

    todayPunishments.forEach((p: any) => {
      const shiftIdx = p.shift - 1;
      if (shiftIdx >= 0 && shiftIdx < 6) {
        newSlotPersonnelIds[shiftIdx] = p.personnelId;
      }
    });

    for (let i = 0; i < 6; i++) {
      if (newSlotPersonnelIds[i] === '') {
        if (availableNotPunished.length > 0) {
          newSlotPersonnelIds[i] = availableNotPunished[aIdx % availableNotPunished.length].id;
          aIdx++;
        }
      }
    }

    // 5. Construct Shift
    const location = shifts.length > 0 ? shifts[shifts.length - 1].location : 'กองร้อยทหารปืนใหญ่';
    const previousShift = shifts?.find((s: any) => s.date === pastDates[0]) || null;
    const timeSlots: ShiftSlot[] = [];

    for (let i = 0; i < 6; i++) {
      let start = '';
      let end = '';
      if (previousShift && previousShift.timeSlots && previousShift.timeSlots[i]) {
        start = previousShift.timeSlots[i].start;
        end = previousShift.timeSlots[i].end;
      } else {
        const h = i * 4;
        start = h.toString().padStart(2, '0') + ':00';
        end = (h + 4).toString().padStart(2, '0') + ':00';
      }

      const pid = newSlotPersonnelIds[i];
      const isPunished = punishedIds.includes(pid);

      timeSlots.push({
        id: crypto.randomUUID(),
        start,
        end,
        personnelId: pid,
        customName: '',
        order: i + 1,
        isPunishment: isPunished
      });
    }

    const newShift: DutyShift = {
      id: todayStr,
      date: todayStr,
      location,
      batchMode: 'mixed',
      timeSlots
    };

    // 6. Save directly to Google Sheets (Bypassing requirePermission inside POST /api/duty)
    if (!isPreview) {
      const { auth, sheetId } = getSheetAuth();
      const sheets = google.sheets({ version: 'v4', auth });

      // Update Duty Sheet
      const getDutyRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Duty!A2:B',
      });
      const dutyRows = getDutyRes.data.values || [];
      const rowIndex = dutyRows.findIndex((r: any) => r[0] === newShift.date);

      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Duty!A${rowIndex + 2}:B${rowIndex + 2}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[newShift.date, newShift.location]] }
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'Duty!A:B',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[newShift.date, newShift.location]] }
        });
      }

      // Update DutySlots Sheet
      let slotRows: string[][] = [];
      try {
        const slotRes = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'DutySlots!A2:H',
        });
        slotRows = slotRes.data.values || [];
      } catch {}

      const otherSlots = slotRows.filter((r: any) => r[1] !== newShift.date);
      const newSlots = newShift.timeSlots.map((slot: any, index: number) => [
        crypto.randomUUID(),
        newShift.date,
        slot.start,
        slot.end,
        slot.personnelId,
        slot.customName || '',
        String(index),
        String(slot.isPunishment || false)
      ]);

      const allSlotsToSave = [...otherSlots, ...newSlots];

      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: 'DutySlots!A2:H',
        });
      } catch {}

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'DutySlots!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allSlotsToSave }
      });
    }

    if (isPreview) {
      // เพิ่มชื่อเข้าไปใน timeSlots สำหรับการแสดงผล Preview
      const slotsWithNames = newShift.timeSlots.map((slot: any) => {
        const p = availableNotPunished.find((avail: any) => avail.id === slot.personnelId) || personnel.find((px: any) => px.id === slot.personnelId);
        return {
          ...slot,
          name: p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ'
        };
      });

      return NextResponse.json({
        success: true,
        message: 'Preview mode: Duty auto-assigned successfully (not saved)',
        newShift: {
          ...newShift,
          timeSlots: slotsWithNames
        },
        debug: {
          availablePersonnel: availableNotPunished.map((p: any) => ({
            id: p.id,
            name: `${p.rank}${p.firstName} ${p.lastName}`,
            batch: p.batch,
            num: p.num
          })),
          punishedIds,
          lastAssignedId
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Duty auto-assigned successfully', newShift });

  } catch (error: any) {
    console.error('Error auto-assigning duty:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
