const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com';

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error('Missing LINE_CHANNEL_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

async function createRichMenu() {
  const richMenuData = {
    "size": {
      "width": 2500,
      "height": 843
    },
    "selected": true,
    "name": "Nong BK Menu",
    "chatBarText": "เมนูคำสั่ง",
    "areas": [
      {
        "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
        "action": { "type": "message", "text": "เช็คเวร" }
      },
      {
        "bounds": { "x": 833, "y": 0, "width": 834, "height": 843 },
        "action": { "type": "uri", "uri": `https://liff.line.me/2011067034-H9LnJMX7/leave` }
      },
      {
        "bounds": { "x": 1667, "y": 0, "width": 833, "height": 843 },
        "action": { "type": "uri", "uri": `https://liff.line.me/2011067034-H9LnJMX7/link-account` }
      }
    ]
  };

  try {
    console.log('Creating Rich Menu...');
    const response = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers,
      body: JSON.stringify(richMenuData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    
    console.log('Rich Menu created successfully:', data.richMenuId);
    return data.richMenuId;
  } catch (error) {
    console.error('Error creating Rich Menu:', error);
    process.exit(1);
  }
}

async function uploadRichMenuImage(richMenuId: string, imagePath: string) {
  console.log(`Uploading image for Rich Menu ${richMenuId}...`);
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'image/jpeg'
      },
      body: imageBuffer
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(JSON.stringify(data));
    }
    
    console.log('Image uploaded successfully.');
  } catch (error) {
    console.error('Error uploading image:', error);
    process.exit(1);
  }
}

async function setDefaultRichMenu(richMenuId: string) {
  console.log(`Setting Rich Menu ${richMenuId} as default...`);
  try {
    const response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(JSON.stringify(data));
    }
    
    console.log('Default Rich Menu set successfully!');
  } catch (error) {
    console.error('Error setting default Rich Menu:', error);
    process.exit(1);
  }
}

async function main() {
  const imagePath = path.resolve(__dirname, 'richmenu.jpg');
  if (!fs.existsSync(imagePath)) {
    console.error(`Please put a rich menu image at ${imagePath}`);
    console.error('The image should be 2500x843 pixels (JPEG or PNG)');
    process.exit(1);
  }

  const richMenuId = await createRichMenu();
  await uploadRichMenuImage(richMenuId, imagePath);
  await setDefaultRichMenu(richMenuId);
  console.log('\n--- Done! ---');
  console.log('Rich Menu ID:', richMenuId);
}

main();
