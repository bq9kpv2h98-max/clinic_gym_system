import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

console.log('=== Testing Reservation Data Save ===\n');

// Simulate reservation data
const reservationData = [
  new Date().toLocaleString('ja-JP'),
  '最終テスト',
  '09055556666',
  'final@test.com',
  '2026年1月24日(土) 10:00-13:00',
  'Google Sheets連携の最終テストです'
];

console.log('Reservation data to save:');
console.log(reservationData);

try {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheetsClient = google.sheets({ version: 'v4', auth });

  console.log('\nAttempting to append data to "予約情報" sheet...');
  
  const response = await sheetsClient.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: '予約情報!A:Z',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [reservationData],
    },
  });

  console.log('\n✅ Successfully saved reservation data!');
  console.log(`Updated range: ${response.data.updates.updatedRange}`);
  console.log(`Updated rows: ${response.data.updates.updatedRows}`);
  console.log(`Updated cells: ${response.data.updates.updatedCells}`);
} catch (error) {
  console.error('\n❌ Failed to save reservation data:', error.message);
  if (error.response) {
    console.error('API Error:', JSON.stringify(error.response.data, null, 2));
  }
  console.error('\nFull error:', error);
  process.exit(1);
}
