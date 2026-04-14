/**
 * Multi-page system end-to-end tests
 */

const BASE_URL = 'http://localhost:3000';

async function testPages() {
  console.log('\n=== TESTING MULTI-PAGE SYSTEM ===\n');

  try {
    // Test 1: Home page
    console.log('📄 TEST 1: Home page');
    const homeRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeRes.text();
    if (homeRes.status === 200 && homeHtml.includes('OrderBot Pro') && homeHtml.includes('Get Started')) {
      console.log('✅ Home page loads (hero landing page)');
    } else {
      console.log('❌ Home page issue');
    }

    // Test 2: Auth page
    console.log('\n📄 TEST 2: Auth page');
    const authRes = await fetch(`${BASE_URL}/auth.html`);
    const authHtml = await authRes.text();
    if (authRes.status === 200 && authHtml.includes('Sign In') && authHtml.includes('Sign Up')) {
      console.log('✅ Auth page loads (login/signup forms)');
    } else {
      console.log('❌ Auth page issue');
    }

    // Test 3: Order page
    console.log('\n📄 TEST 3: Order page');
    const orderRes = await fetch(`${BASE_URL}/order.html`);
    const orderHtml = await orderRes.text();
    if (orderRes.status === 200 && orderHtml.includes('Dashboard') && orderHtml.includes('Create New Order')) {
      console.log('✅ Order page loads (dashboard)');
    } else {
      console.log('❌ Order page issue');
    }

    // Test 4: App.js utilities
    console.log('\n📄 TEST 4: Shared utilities');
    const appRes = await fetch(`${BASE_URL}/app.js`);
    const appJs = await appRes.text();
    if (appRes.status === 200 && appJs.includes('signUp') && appJs.includes('fetchOrders')) {
      console.log('✅ App.js utilities loaded');
    } else {
      console.log('❌ App.js issue');
    }

    // Test 5: API endpoints (without auth - should fail)
    console.log('\n🔌 TEST 5: API endpoints (no token)');
    const noAuthRes = await fetch(`${BASE_URL}/api/orders`);
    const noAuthData = await noAuthRes.json();
    if (noAuthRes.status === 401 && noAuthData.error) {
      console.log('✅ API correctly rejects requests without token');
    } else {
      console.log('❌ API auth check issue');
    }

    // Test 6: CSP Headers
    console.log('\n🔒 TEST 6: Security headers');
    const secRes = await fetch(`${BASE_URL}/`);
    const csp = secRes.headers.get('Content-Security-Policy');
    if (csp) {
      console.log('✅ CSP headers configured');
    } else {
      console.log('⚠️  CSP headers not found');
    }

  } catch (err) {
    console.error('❌ Test error:', err.message);
  }

  console.log('\n=== TESTS COMPLETE ===\n');
}

testPages();
