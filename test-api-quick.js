/**
 * Quick API test
 */

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('\n=== API ENDPOINT TEST ===\n');

  try {
    const res = await fetch(`${BASE_URL}/api/orders`);
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('Content-Type'));
    
    const text = await res.text();
    console.log('Response (first 200 chars):', text.substring(0, 200));
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON:', data);
    } catch {
      console.log('Not JSON - content is HTML or plain text');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAPI();
