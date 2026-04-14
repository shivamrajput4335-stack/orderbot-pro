const API_URL = 'http://localhost:3000';
const SUPABASE_URL = 'https://xaajavxegbcahusslypx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYWphdnhlZ2JjYWh1c3NseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzM2NzMsImV4cCI6MjA5MTUwOTY3M30.zmuiRqI2juksLci9BGgG-p1MIrI9BGBDLY6J6pasUps';

console.log('\n🧪 Starting OrderBot Pro Full End-to-End Test\n');
console.log('='.repeat(60));

let testUser = {
  email: `test_${Date.now()}@example.com`,
  password: 'Test@Password123'
};

let authToken = null;
let orderId = null;

async function test(name, fn) {
  try {
    console.log(`\n✅ TEST: ${name}`);
    await fn();
  } catch (err) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${err.message}`);
    if (err.response) {
      console.error(`   Status: ${err.response.status}`);
      console.error(`   Data:`, err.response.data);
    }
    throw err;
  }
}

async function signup() {
  await test('SIGNUP: Create new user account via Supabase', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Signup failed: ${data.error_description || data.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`   📧 User created: ${testUser.email}`);
    console.log(`   ✅ Response: User ID: ${data.user?.id}`);
  });
}

async function login() {
  await test('LOGIN: Authenticate user and get access token via Supabase', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Login failed: ${data.error_description || data.message || 'Unknown error'}`);
    }

    const data = await response.json();
    authToken = data.access_token;
    
    if (!authToken) {
      throw new Error('No access token received');
    }

    console.log(`   🔐 Login successful`);
    console.log(`   🎫 Access token received (length: ${authToken.length})`);
  });
}

async function createOrder() {
  await test('CREATE ORDER: Submit new order with auth token', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'John Doe',
        product: 'test-product',
        quantity: 5
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Order creation failed: ${data.error || 'Unknown error'}`);
    }

    const data = await response.json();
    orderId = data.data?.id;

    if (!orderId) {
      throw new Error('No order ID received');
    }

    console.log(`   📦 Order created successfully`);
    console.log(`   🆔 Order ID: ${orderId}`);
    console.log(`   ✅ Response:`, JSON.stringify(data, null, 2));
  });
}

async function getOrders() {
  await test('GET ORDERS: Retrieve all user orders', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Get orders failed: ${data.error ||'Unknown error'}`);
    }

    const data = await response.json();
    const orders = data.data || [];

    console.log(`   📋 Retrieved ${orders.length} order(s)`);
    console.log(`   ✅ Response:`, JSON.stringify(data, null, 2));

    // Verify the order we just created is in the list
    const foundOrder = orders.find(o => o.id === orderId);
    if (!foundOrder) {
      throw new Error('Created order not found in orders list');
    }
    console.log(`   ✓ Created order found in list`);
  });
}

async function deleteOrder() {
  await test('DELETE ORDER: Remove the created order', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    if (!orderId) {
      throw new Error('No order ID available to delete');
    }

    const response = await fetch(`${API_URL}/order/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Delete failed: ${data.error || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`   🗑️  Order deleted successfully`);
    console.log(`   ✅ Response:`, JSON.stringify(data, null, 2));
  });
}

async function verifyOrderDeleted() {
  await test('VERIFY: Confirm order is deleted', async () => {
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const response = await fetch(`${API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Get orders failed: ${data.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const orders = data.data || [];

    const foundOrder = orders.find(o => o.id === orderId);
    if (foundOrder) {
      throw new Error('Deleted order still exists in orders list');
    }

    console.log(`   ✓ Confirmed: Order no longer exists`);
    console.log(`   📋 Current orders: ${orders.length}`);
  });
}

async function runAllTests() {
  try {
    await signup();
    await login();
    await createOrder();
    await getOrders();
    await deleteOrder();
    await verifyOrderDeleted();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ ALL TESTS PASSED! 🎉\n');
    console.log('📊 Test Summary:');
    console.log(`   ✅ User signup successful`);
    console.log(`   ✅ User login successful`);
    console.log(`   ✅ Order creation successful`);
    console.log(`   ✅ Order retrieval successful`);
    console.log(`   ✅ Order deletion successful`);
    console.log(`   ✅ Deletion verification successful\n`);
    console.log('🚀 OrderBot Pro is fully functional!\n');
    
    process.exit(0);
  } catch (err) {
    console.log('\n' + '='.repeat(60));
    console.log('\n❌ TEST SUITE FAILED\n');
    process.exit(1);
  }
}

// Run the tests
runAllTests();
