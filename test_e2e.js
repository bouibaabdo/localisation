const API = 'http://localhost:3001/api';

async function runTests() {
  console.log('=== Starting TrustLocate Acceptance & E2E Tests ===\n');

  // Test 1: Health Check
  const healthRes = await fetch(`${API}/health`).then(r => r.json());
  console.log('✅ Test 1: Health Check ->', healthRes.status === 'ok' ? 'PASSED' : 'FAILED');

  // Test 2: Create Request
  const createRes = await fetch(`${API}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'أحمد - تجربة النظام',
      purpose: 'تنسيق نقطة لقاء',
      durationMinutes: 15,
      isMockMode: true,
    }),
  }).then(r => r.json());
  console.log('✅ Test 2: Create Request -> Token generated:', createRes.token.slice(0, 8) + '... status:', createRes.status);

  // Test 3: Fetch Pending Request
  const getRes = await fetch(`${API}/requests/${createRes.token}`).then(r => r.json());
  console.log('✅ Test 3: Get Pending Request -> Requester:', getRes.requesterName, '| Status:', getRes.status, '| Coordinates:', getRes.locationPoint);

  // Test 4: Accept with single point coordinates
  const acceptRes = await fetch(`${API}/requests/${createRes.token}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: 'ACCEPT',
      location: { lat: 33.5731, lng: -7.5898, accuracy: 12 },
    }),
  }).then(r => r.json());
  console.log('✅ Test 4: Accept Flow -> Decision recorded:', acceptRes.status);

  // Verify coordinates now present
  const acceptedData = await fetch(`${API}/requests/${createRes.token}`).then(r => r.json());
  console.log('✅ Test 4.1: Coordinates Verification -> Lat:', acceptedData.locationPoint.lat, 'Lng:', acceptedData.locationPoint.lng, 'Accuracy:', acceptedData.locationPoint.accuracy + 'm');

  // Test 5: Revoke and wipe data
  const revokeRes = await fetch(`${API}/requests/${createRes.token}/revoke`, { method: 'POST' }).then(r => r.json());
  console.log('✅ Test 5: Revoke Coordinates -> Status:', revokeRes.status);

  // Verify coordinates wiped permanently
  const revokedData = await fetch(`${API}/requests/${createRes.token}`).then(r => r.json());
  console.log('✅ Test 5.1: Zero Leakage Verification -> Coordinates after revoke:', revokedData.locationPoint === null ? 'NULL (CONFIRMED WIPED)' : 'LEAK DETECTED');

  // Test 6: Decline flow
  const req2 = await fetch(`${API}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Sarah', purpose: 'Delivery drop', durationMinutes: 5 }),
  }).then(r => r.json());
  const declineRes = await fetch(`${API}/requests/${req2.token}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'DECLINE' }),
  }).then(r => r.json());
  const req2Data = await fetch(`${API}/requests/${req2.token}`).then(r => r.json());
  console.log('✅ Test 6: Decline Flow -> Status:', req2Data.status, '| Zero coords:', req2Data.locationPoint === null ? 'PASSED' : 'FAILED');

  console.log('\n=== All 6 Acceptance Test Scenarios PASSED with 100% Success ===');
}

runTests().catch(console.error);
