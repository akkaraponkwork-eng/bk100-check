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
        const getRes = await fetch(`${origin}/api/bot-settings`, { headers: { 'x-internal-token': process.env.LINE_CHANNEL_ACCESS_TOKEN || '' } });
        const existing = await getRes.json();

        await fetch(`${origin}/api/bot-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
          },
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
    /* ปิดฟีเจอร์ 1 ไว้ชั่วคราว
    else if (event.type === 'follow') {
      // User added the bot as a friend
      await replyLineMessage(replyToken, [{
        type: 'text',
        text: 'สวัสดีครับ! ยินดีต้อนรับสู่ระบบของ น้องบก.ร้อย 🫡\n\nเพื่อความสะดวกในการรับแจ้งเตือนเวรและลางาน รบกวนผูกบัญชีก่อนนะครับ โดยกดที่เมนู "จัดการบัญชี" ด้านล่างได้เลยครับ!'
      }]);
    }
    */
    else if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();
      const origin = request.nextUrl.origin;

      if (text === 'เช็คเวร') { // || text === 'เวรของฉัน') {
        /* ปิดฟีเจอร์ 1 ไว้ชั่วคราว
        const isPersonal = text === 'เวรของฉัน';
        let personnelIdToFilter = null;
        
        // If checking personal duty, look up user first
        if (isPersonal) {
          const userId = event.source.userId;
          if (!userId) {
            await replyLineMessage(replyToken, [{ type: 'text', text: 'ไม่สามารถระบุตัวตนของคุณได้ครับ' }]);
            return NextResponse.json({ status: 'ok' });
          }
          
          try {
            // Need to fetch from users api (but that requires admin role). 
            // We'll bypass auth by creating a specialized internal method or just hitting the sheet directly.
            // For now, we hit the sheet directly using google apis (similar to what users/route.ts does)
            const { google } = require('googleapis');
            const auth = new google.auth.JWT({
              email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
              key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
              scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            const sheets = google.sheets({ version: 'v4', auth });
            const userRes = await sheets.spreadsheets.values.get({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'Users!A2:B',
            });
            const userRows = userRes.data.values || [];
            const userRow = userRows.find((r: any[]) => r[0] === userId);
            
            if (!userRow || !userRow[1]) {
              await replyLineMessage(replyToken, [{ type: 'text', text: 'คุณยังไม่ได้ผูกบัญชีครับ กรุณากดเมนู "จัดการบัญชี" ด้านล่างเพื่อผูกบัญชีก่อนครับ 🫡' }]);
              return NextResponse.json({ status: 'ok' });
            }
            personnelIdToFilter = userRow[1];
          } catch (e) {
            console.error('Error fetching user for personal duty:', e);
            await replyLineMessage(replyToken, [{ type: 'text', text: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลผู้ใช้ครับ' }]);
            return NextResponse.json({ status: 'error' });
          }
        }
        */

        const [dutyRes, personnelRes] = await Promise.all([
          fetch(`${origin}/api/duty`, { headers: { 'x-internal-token': process.env.LINE_CHANNEL_ACCESS_TOKEN || '' } }),
          fetch(`${origin}/api/personnel`, { headers: { 'x-internal-token': process.env.LINE_CHANNEL_ACCESS_TOKEN || '' } })
        ]);

        const dutyData = await dutyRes.json();
        const personnelData = await personnelRes.json();

        const personnelList = personnelData.personnel || [];
        const getPersonnelName = (id: string) => {
          const p = personnelList.find((x: any) => x.id === id);
          return p ? `${p.rank}${p.firstName} ${p.lastName}` : 'ไม่ระบุ';
        };

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
        const allDuties = dutyData.shifts || [];

        /* ปิดฟีเจอร์ 1 ไว้ชั่วคราว
        if (isPersonal) {
          // Find future duties for this person
          const myDuties = allDuties.filter((d: any) => d.date >= todayStr && (d.timeSlots || []).some((s: any) => s.personnelId === personnelIdToFilter));
          myDuties.sort((a: any, b: any) => a.date.localeCompare(b.date)); // Sort chronologically
          
          if (myDuties.length === 0) {
            await replyLineMessage(replyToken, [{ type: 'text', text: 'คุณไม่มีเวรในเร็วๆ นี้ครับ 🎉' }]);
            return NextResponse.json({ status: 'ok' });
          }

          let summaryText = `📋 **สรุปตารางเวรของคุณ**\n`;
          myDuties.slice(0, 5).forEach((duty: any) => { // show up to 5 upcoming duties
            const dDate = new Date(duty.date);
            summaryText += `\n📅 ${dDate.toLocaleDateString('th-TH')}\n📍 ${duty.location}\n`;
            const mySlots = duty.timeSlots.filter((s: any) => s.personnelId === personnelIdToFilter);
            mySlots.sort((a: any, b: any) => a.order - b.order).forEach((slot: any) => {
              summaryText += `- ${slot.start}-${slot.end}\n`;
            });
          });
          
          await replyLineMessage(replyToken, [{ type: 'text', text: summaryText }]);
        } else {
        */
        // Check Group/General Duty for today
        const todayDuties = allDuties.filter((d: any) => d.date === todayStr);

        if (todayDuties.length === 0) {
          await replyLineMessage(replyToken, [{ type: 'text', text: 'วันนี้ยังไม่มีการจัดตารางเวรครับ 😴' }]);
          return NextResponse.json({ status: 'ok' });
        }

        let summaryText = '';
        todayDuties.forEach((duty: any, i: number) => {
          const dDate = new Date(duty.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' });
          summaryText += `ขออนุญาตแจ้งเวร${duty.location}ประจำวันที่ ${dDate}\n`;
          const slots = duty.timeSlots || [];
          slots.sort((a: any, b: any) => a.order - b.order).forEach((slot: any, index: number) => {
            const name = slot.customName || getPersonnelName(slot.personnelId);
            summaryText += `${index + 1}.${name}\n${slot.start}-${slot.end}\n`;
          });
          if (i < todayDuties.length - 1) summaryText += '\n';
        });
        summaryText += 'ครับ';

        await replyLineMessage(replyToken, [{
          type: 'text',
          text: summaryText
        }]);
        // }
      } else if (text.includes('น้องบก') || text.includes('บก.ร้อย')) {
        await replyLineMessage(replyToken, [
          {
            type: 'text',
            text: 'น้องบก.ร้อย มาแล้วครับ! 🫡\nเลือกเมนูด้านล่างได้เลยครับ'
          },
          {
            type: 'flex',
            altText: 'เมนูหลัก น้องบก.ร้อย',
            contents: {
              type: 'carousel',
              contents: [
                {
                  type: 'bubble',
                  hero: {
                    type: 'image',
                    url: `${origin}/images/duty_check_carousel.jpg`,
                    size: 'full',
                    aspectRatio: '1:1',
                    aspectMode: 'cover',
                    action: {
                      type: 'message',
                      label: 'เช็คเวร',
                      text: 'เช็คเวร'
                    }
                  }
                },
                {
                  type: 'bubble',
                  hero: {
                    type: 'image',
                    url: `${origin}/images/link_account_carousel.jpg`,
                    size: 'full',
                    aspectRatio: '1:1',
                    aspectMode: 'cover',
                    action: {
                      type: 'uri',
                      label: 'จัดการบัญชี',
                      uri: process.env.NEXT_PUBLIC_LIFF_ID ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/link-account` : 'https://liff.line.me/2011067034-H9LnJMX7/link-account'
                    }
                  }
                }
              ]
            }
          }
        ]);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
