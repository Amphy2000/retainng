const fs = require('fs');
const text = fs.readFileSync('.env.local', 'utf8');
const env = {};
text.split('\n').forEach(line => {
  const parts = line.split('=');
  const k = parts[0] ? parts[0].trim() : '';
  const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  if (k) env[k] = v;
});

const GREEN_API_ID = env.GREEN_API_ID || '710722811593';
const GREEN_API_TOKEN = env.GREEN_API_TOKEN || 'c7cea54f5c6f4d31a9b74eb6576493a8ec085b4f65a04a62b5';
const GREEN_API_URL = env.GREEN_API_URL || 'https://7107.api.greenapi.com';

async function test() {
  console.log('1. Checking GreenAPI state...');
  try {
    const res = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/getStateInstance/${GREEN_API_TOKEN}`);
    const data = await res.json();
    console.log('State response:', data);
  } catch (err) {
    console.error('State check error:', err);
  }

  console.log('2. Testing send to 09169153129...');
  try {
    let cleanPhone = '09169153129'.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1);
    const chatId = `${cleanPhone}@c.us`;
    console.log('ChatId:', chatId);

    const sendRes = await fetch(`${GREEN_API_URL}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        message: 'Hello! This is a direct test message from RetainNG.',
      }),
    });
    const sendData = await sendRes.json();
    console.log('Send response status:', sendRes.status, sendData);
  } catch (err) {
    console.error('Send error:', err);
  }
}

test();
