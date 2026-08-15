import { NextRequest, NextResponse } from 'next/server';

const LINE_API = 'https://api.line.me/v2/bot/message/reply';

async function replyLineMessage(replyToken: string, messages: any[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  
  await fetch(LINE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      replyToken,
      messages
    })
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if it's a verification request
    if (!body.events || body.events.length === 0) {
      return NextResponse.json({ status: 'ok' });
    }

    const event = body.events[0];
    const replyToken = event.replyToken;

    if (event.type === 'join' && event.source.type === 'group') {
      const groupId = event.source.groupId;
      
      // Save groupId using our own API
      try {
        const origin = request.nextUrl.origin;
        // First get existing settings to preserve alertTimes
        const getRes = await fetch(`${origin}/api/bot-settings`);
        const existing = await getRes.json();
        
        await fetch(`${origin}/api/bot-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            groupId: groupId, 
            alertTimes: existing.alertTimes || [] 
          })
        });

        await replyLineMessage(replyToken, [{
          type: 'text',
          text: 'สวัสดีครับ! น้องบก.ร้อย รายงานตัวครับ 🫡\n\nผมได้เชื่อมต่อกับระบบแล้ว ตั้งแต่นี้ผมจะคอยแจ้งเตือนเวรยามและสรุปยอดกำลังพลให้นะครับ\n\nพิมพ์ "เช็คเวร" เพื่อดูตารางเวรวันนี้ได้เลยครับ!'
        }]);
      } catch (e) {
        console.error('Error saving groupId:', e);
      }
    } 
    else if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();
      
      if (text === 'เช็คเวร') {
        const origin = request.nextUrl.origin;
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
          await replyLineMessage(replyToken, [{ type: 'text', text: 'วันนี้ยังไม่มีการจัดตารางเวรครับ 😴' }]);
          return NextResponse.json({ status: 'ok' });
        }

        let summaryText = `📋 **สรุปตารางเวรประจำวันที่ ${new Date().toLocaleDateString('th-TH')}**\n`;
        
        todayDuties.forEach((duty: any) => {
          summaryText += `\n📍 ${duty.location}\n`;
          const slots = duty.timeSlots || [];
          slots.sort((a: any, b: any) => a.order - b.order).forEach((slot: any) => {
            const name = slot.customName || getPersonnelName(slot.personnelId);
            summaryText += `- ${slot.start}-${slot.end} : ${name}\n`;
          });
        });

        await replyLineMessage(replyToken, [{
          type: 'text',
          text: summaryText
        }]);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
