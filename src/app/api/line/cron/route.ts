import { NextRequest, NextResponse } from 'next/server';
import { pushLineMessage } from '@/lib/line';

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const force = request.nextUrl.searchParams.get('force') === 'true';
    
    // Get bot settings
    const getRes = await fetch(`${origin}/api/bot-settings`);
    const settings = await getRes.json();
    
    if (!settings.groupId || !settings.alertTimes || settings.alertTimes.length === 0) {
      return NextResponse.json({ status: 'skipped', reason: 'Bot not configured or no alert times' });
    }

    const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
    
    // Check if current time is in alertTimes (or if force=true)
    if (!settings.alertTimes.includes(now) && !force) {
      return NextResponse.json({ status: 'skipped', reason: `Current time ${now} not in alertTimes` });
    }

    // Fetch duty data
    const [dutyRes, personnelRes] = await Promise.all([
      fetch(`${origin}/api/duty`),
      fetch(`${origin}/api/personnel`)
    ]);
    
    const dutyData = await dutyRes.json();
    const personnelData = await personnelRes.json();
    
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
    const todayDuties = (dutyData.duties || []).filter((d: any) => d.date === todayStr);
    const personnelList = personnelData.personnel || [];
    
    const getPersonnelName = (id: string) => {
      const p = personnelList.find((x: any) => x.id === id);
      return p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ';
    };

    if (todayDuties.length === 0) {
      return NextResponse.json({ status: 'skipped', reason: 'No duty for today' });
    }

    let summaryText = `📢 **แจ้งเตือนเวรประจำวันที่ ${new Date().toLocaleDateString('th-TH')}**\n`;
    
    todayDuties.forEach((duty: any) => {
      summaryText += `\n📍 ${duty.location}\n`;
      const slots = duty.timeSlots || [];
      slots.sort((a: any, b: any) => a.order - b.order).forEach((slot: any) => {
        const name = slot.customName || getPersonnelName(slot.personnelId);
        summaryText += `- ${slot.start}-${slot.end} : ${name}\n`;
      });
    });

    summaryText += '\n*ขอให้ผู้มีรายชื่อเตรียมตัวเข้าเวรด้วยครับ! 🫡*';

    await pushLineMessage(settings.groupId, [{
      type: 'text',
      text: summaryText
    }]);

    return NextResponse.json({ status: 'success', pushedTime: now });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
