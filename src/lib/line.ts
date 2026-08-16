export const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push';

export async function pushLineMessage(to: string, messages: any[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  
  await fetch(LINE_PUSH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      to,
      messages
    })
  });
}
