#!/usr/bin/env node
/**
 * 測試 GAS 寫入：嘗試在 personal!P18 寫入 "text"
 */
const https = require('https');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwJ3xPlfON7pkmeVKzpQImQhnlzpMz6Fn4Z1E7PwXVBZBvlncA7VCQ3tITyq9x8puAu/exec';
const SHEET_ID = '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM';

const payload = {
  sheetId: SHEET_ID,
  sheet: 'personal',
  cell: 'P18',
  value: 'text'
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.get(urlObj, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        console.log(`  ↪ Redirect → ${res.headers.location.substring(0, 80)}...`);
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Body: ${body.substring(0, 1000)}`);
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ raw: body.substring(0, 500) }); }
      });
    }).on('error', reject);
  });
}

function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    console.log(`📤 POST to ${urlObj.hostname}${urlObj.pathname.substring(0, 50)}...`);
    console.log(`   Payload: ${body}`);

    const req = https.request(options, res => {
      console.log(`  Status: ${res.statusCode}`);
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        console.log(`  ↪ Redirect (${res.statusCode}) → ${redirectUrl.substring(0, 80)}...`);
        // GAS redirect 後用 GET 拿回結果
        return httpsGet(redirectUrl).then(resolve).catch(reject);
      }
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        console.log(`  Body: ${responseBody.substring(0, 1000)}`);
        try { resolve(JSON.parse(responseBody)); }
        catch (e) { resolve({ raw: responseBody.substring(0, 500) }); }
      });
    });
    req.on('error', err => {
      console.error(`  ❌ Request error: ${err.message}`);
      reject(err);
    });
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🧪 測試 GAS 寫入：personal!P18 = "text"\n');
  
  try {
    const result = await httpsPost(GAS_URL, payload);
    console.log('\n📋 Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
  }
}

main();
