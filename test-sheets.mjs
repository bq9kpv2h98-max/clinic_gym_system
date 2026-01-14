import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

console.log('=== Google Sheets Connection Test ===\n');

console.log('1. Checking environment variables...');
console.log(`GOOGLE_SHEETS_SPREADSHEET_ID: ${GOOGLE_SHEETS_SPREADSHEET_ID ? 'SET' : 'NOT SET'}`);
console.log(`GOOGLE_SHEETS_CREDENTIALS: ${GOOGLE_SHEETS_CREDENTIALS ? 'SET (length: ' + GOOGLE_SHEETS_CREDENTIALS.length + ')' : 'NOT SET'}`);

if (!GOOGLE_SHEETS_CREDENTIALS || !GOOGLE_SHEETS_SPREADSHEET_ID) {
  console.error('\n❌ Environment variables are not set properly!');
  process.exit(1);
}

console.log('\n2. Parsing credentials JSON...');
try {
  const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
  console.log(`✅ Credentials parsed successfully`);
  console.log(`   Client email: ${credentials.client_email}`);
  console.log(`   Project ID: ${credentials.project_id}`);
} catch (error) {
  console.error('❌ Failed to parse credentials:', error.message);
  process.exit(1);
}

console.log('\n3. Initializing Google Sheets client...');
try {
  const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheetsClient = google.sheets({ version: 'v4', auth });
  console.log('✅ Google Sheets client initialized');

  console.log('\n4. Testing API access...');
  const response = await sheetsClient.spreadsheets.get({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
  });

  console.log('✅ Successfully accessed spreadsheet!');
  console.log(`   Title: ${response.data.properties.title}`);
  console.log(`   Sheets: ${response.data.sheets.map(s => s.properties.title).join(', ')}`);

  console.log('\n5. Testing write access...');
  const testData = [
    ['テスト日時', 'テスト名前', 'テスト電話番号', 'テストメール', 'テスト希望日時', 'テスト症状']
  ];

  const writeResponse = await sheetsClient.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: '予約情報!A:Z',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: testData,
    },
  });

  console.log('✅ Successfully wrote test data!');
  console.log(`   Updated range: ${writeResponse.data.updates.updatedRange}`);
  console.log(`   Updated rows: ${writeResponse.data.updates.updatedRows}`);

  console.log('\n✅ All tests passed! Google Sheets integration is working correctly.');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  if (error.response) {
    console.error('   API Error:', error.response.data);
  }
  process.exit(1);
}
