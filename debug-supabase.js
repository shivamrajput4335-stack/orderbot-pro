const SUPABASE_URL = 'https://xaajavxegbcahusslypx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYWphdnhlZ2JjYWh1c3NseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzM2NzMsImV4cCI6MjA5MTUwOTY3M30.zmuiRqI2juksLci9BGgG-p1MIrI9BGBDLY6J6pasUps';

async function testSignup() {
  console.log('Testing Supabase signup...\n');
  
  const testEmail = `orderbot_test_${Date.now()}@gmail.com`;
  const testPassword = 'Test@Password123';

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('\nResponse Body:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSignup();
