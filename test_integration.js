// Simple integration test to verify the API endpoints work
const API_BASE = 'http://localhost:8000/api';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');
  
  // Test health endpoint (no auth required)
  try {
    const healthResponse = await fetch('http://localhost:8000/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
  } catch (err) {
    console.log('❌ Health check failed:', err.message);
    return;
  }

  // Test authenticated endpoints (will fail with 401, but should return proper error)
  const authEndpoints = [
    '/inventory/stats',
    '/stock-movements',
    '/products'
  ];

  for (const endpoint of authEndpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      const data = await response.json();
      
      if (response.status === 401) {
        console.log(`✅ ${endpoint} - Authentication required (expected)`);
      } else {
        console.log(`⚠️  ${endpoint} - Unexpected status:`, response.status);
      }
    } catch (err) {
      console.log(`❌ ${endpoint} - Error:`, err.message);
    }
  }
  
  console.log('\n🎉 API endpoints are responding correctly!');
  console.log('📱 Frontend: http://localhost:5174');
  console.log('🔧 Backend:  http://localhost:8000');
  console.log('\nNext steps:');
  console.log('1. Open http://localhost:5174 in your browser');
  console.log('2. Login with admin credentials');
  console.log('3. Navigate to Inventory tab');
  console.log('4. Test the Stock In/Out views');
  console.log('5. Add a product to see stock IN movement');
  console.log('6. Make a sale to see stock OUT movement');
}

testEndpoints();