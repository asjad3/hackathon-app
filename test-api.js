// Test script for API endpoints
// Run with: node test-api.js

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // Test 1: GET /api/rumors
    console.log('1. Testing GET /api/rumors');
    const rumorsRes = await fetch(`${BASE_URL}/api/rumors`);
    const rumors = await rumorsRes.json();
    console.log(`   ✅ Status: ${rumorsRes.status}`);
    console.log(`   ✅ Response: ${Array.isArray(rumors) ? `${rumors.length} rumors` : 'Invalid format'}`);
    console.log('');

    if (rumors.length > 0) {
      const firstRumor = rumors[0];
      const rumorId = firstRumor.id;

      // Test 2: GET /api/rumors/:id
      console.log(`2. Testing GET /api/rumors/${rumorId}`);
      const rumorRes = await fetch(`${BASE_URL}/api/rumors/${rumorId}`);
      const rumor = await rumorRes.json();
      console.log(`   ✅ Status: ${rumorRes.status}`);
      console.log(`   ✅ Has evidence: ${rumor.evidence ? 'Yes' : 'No'}`);
      console.log(`   ✅ Has history: ${rumor.history ? 'Yes' : 'No'}`);
      console.log('');

      if (rumor.evidence && rumor.evidence.length > 0) {
        const evidenceId = rumor.evidence[0].id;

        // Test 3: POST /api/evidence/:id/vote (first vote)
        console.log(`3. Testing POST /api/evidence/${evidenceId}/vote (first vote)`);
        const vote1Res = await fetch(`${BASE_URL}/api/evidence/${evidenceId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isHelpful: true })
        });
        const vote1 = await vote1Res.json();
        console.log(`   ✅ Status: ${vote1Res.status}`);
        console.log(`   ✅ Success: ${vote1.success}`);
        if (vote1.newTrustScore) {
          console.log(`   ✅ New Trust Score: ${(vote1.newTrustScore * 100).toFixed(2)}%`);
        }
        console.log('');

        // Test 4: POST /api/evidence/:id/vote (duplicate vote - should fail)
        console.log(`4. Testing POST /api/evidence/${evidenceId}/vote (duplicate vote)`);
        const vote2Res = await fetch(`${BASE_URL}/api/evidence/${evidenceId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isHelpful: false })
        });
        const vote2 = await vote2Res.json();
        console.log(`   ✅ Status: ${vote2Res.status}`);
        console.log(`   ✅ Blocked duplicate: ${vote2Res.status === 400 && !vote2.success ? 'Yes' : 'No'}`);
        console.log(`   ✅ Error message: ${vote2.message || 'N/A'}`);
        console.log('');
      }
    }

    // Test 5: POST /api/rumors (create new rumor)
    console.log('5. Testing POST /api/rumors (create rumor)');
    const createRes = await fetch(`${BASE_URL}/api/rumors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: 'Test rumor from API test script' })
    });
    const newRumor = await createRes.json();
    console.log(`   ✅ Status: ${createRes.status}`);
    console.log(`   ✅ Created: ${newRumor.id ? 'Yes' : 'No'}`);
    console.log('');

    // Test 6: GET /api/auth/user
    console.log('6. Testing GET /api/auth/user');
    const authRes = await fetch(`${BASE_URL}/api/auth/user`, {
      credentials: 'include'
    });
    const user = await authRes.json();
    console.log(`   ✅ Status: ${authRes.status}`);
    console.log(`   ✅ User ID: ${user.id || 'N/A'}`);
    console.log('');

    console.log('✅ All API tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Make sure the server is running on http://localhost:5000');
  }
}

testAPI();
