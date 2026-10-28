/**
 * Comprehensive System Audit Script
 * Verifies End-to-End functionality of ParkWise:
 * - Server health and readiness
 * - Static page serving (all 9 pages + CSS)
 * - Full Auth Lifecycle (Register, Login, Me, Update Profile)
 * - Profile Photo Lifecycle (Upload, Fetch, Static Serve, Delete)
 * - Locations & Slots API
 * - Vehicles API
 * - Bookings Lifecycle (Create, List, Cancel)
 */

const http = require('http');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:5001';

function request(method, pathUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const headers = options.headers || {};
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function uploadMultipart(pathUrl, token, fieldName, filename, fileBuffer, mimeType) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(pathUrl, BASE_URL);

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const reqOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

async function runAudit() {
  console.log('==================================================');
  console.log('   ParkWise End-to-End System Audit Suite         ');
  console.log('==================================================');
  console.log(`Auditing server at: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Health & Readiness
  console.log('--- 1. Health & Server Readiness ---');
  try {
    const ready = await request('GET', '/api/ready');
    assert(ready.status === 200 && ready.json && ready.json.connected === true, 'GET /api/ready: Database is connected and ready');

    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'GET /api/health: Server responds with 200 OK');
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. Static HTML & CSS Pages
  console.log('\n--- 2. Static Assets & Pages Audit ---');
  const pages = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/profile.html',
    '/locations.html',
    '/booking.html',
    '/history.html',
    '/admin.html',
    '/login.html',
    '/register.html',
    '/css/footer.css',
  ];

  for (const page of pages) {
    try {
      const res = await request('GET', page);
      const isOk = res.status === 200;
      assert(isOk, `Static GET ${page} -> HTTP 200 (Length: ${res.body.length} bytes)`);
    } catch (err) {
      assert(false, `Static GET ${page} -> Error: ${err.message}`);
    }
  }

  // 3. Locations & Slots
  console.log('\n--- 3. Locations & Slots API ---');
  let sampleLocationId = null;
  let sampleSlotId = null;
  try {
    const locRes = await request('GET', '/api/locations');
    assert(locRes.status === 200 && locRes.json && locRes.json.success, 'GET /api/locations returns 200 with locations list');
    const locations = locRes.json.data || locRes.json.locations || [];
    assert(locations.length > 0, `Locations count: ${locations.length} active parking locations`);

    if (locations.length > 0) {
      sampleLocationId = locations[0].id || locations[0]._id;
      const slotRes = await request('GET', `/api/locations/${sampleLocationId}/slots`);
      assert(slotRes.status === 200 && slotRes.json && slotRes.json.success, `GET /api/locations/:id/slots returns 200`);
      const slots = slotRes.json.slots || slotRes.json.data || [];
      const availableSlot = slots.find(s => s.available && (s.vehicleType === 'car' || !s.vehicleType)) || slots[0];
      if (availableSlot) {
        sampleSlotId = availableSlot.id || availableSlot._id;
      }
    }
  } catch (err) {
    assert(false, `Locations & Slots API Error: ${err.message}`);
  }

  // 4. Authentication Flow (Register, Login, Me)
  console.log('\n--- 4. Authentication & User Profile ---');
  const auditEmail = `audit_user_${Date.now()}@test.io`;
  const auditPassword = 'SecurePassword123!';
  let authToken = null;
  let userId = null;

  try {
    const regRes = await request('POST', '/api/auth/register', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Audit Test User',
        email: auditEmail,
        password: auditPassword,
        phone: '9876500000',
      }),
    });

    assert(regRes.status === 201 && regRes.json && regRes.json.success, `POST /api/auth/register: User created (${auditEmail})`);
    authToken = regRes.json?.token || regRes.json?.data?.token;
    userId = regRes.json?.user?.id || regRes.json?.data?.user?.id;

    // Login test
    const loginRes = await request('POST', '/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: auditEmail,
        password: auditPassword,
      }),
    });
    assert(loginRes.status === 200 && loginRes.json && loginRes.json.success, 'POST /api/auth/login: Authentication successful');
    if (!authToken) {
      authToken = loginRes.json?.token || loginRes.json?.data?.token;
    }

    // GET /api/auth/me
    const meRes = await request('GET', '/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const returnedEmail = meRes.json && (meRes.json.user?.email || meRes.json.data?.email);
    assert(meRes.status === 200 && returnedEmail === auditEmail, 'GET /api/auth/me: Returns current user credentials');

    // PUT /api/auth/profile
    const updateRes = await request('PUT', '/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Audit User Renamed',
        phone: '9876511111',
      }),
    });
    const returnedName = updateRes.json && (updateRes.json.user?.name || updateRes.json.data?.user?.name);
    assert(updateRes.status === 200 && returnedName === 'Audit User Renamed', 'PUT /api/auth/profile: Updates profile name and phone');
  } catch (err) {
    assert(false, `Authentication flow error: ${err.message}`);
  }

  // 5. Profile Photo CRUD with Multer
  console.log('\n--- 5. Multer Profile Photo CRUD ---');
  if (authToken) {
    try {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const uploadRes = await uploadMultipart('/api/auth/profile-photo', authToken, 'profilePhoto', 'test_avatar.png', pngBuffer, 'image/png');

      assert(uploadRes.status === 200 && uploadRes.json && uploadRes.json.success, 'POST /api/auth/profile-photo: Multer uploaded photo successfully');
      const photoUrl = uploadRes.json && (uploadRes.json.user?.profilePhoto || uploadRes.json.data?.profilePhoto || uploadRes.json.profilePhoto);
      assert(!!photoUrl, `Profile photo path returned: ${photoUrl}`);

      if (photoUrl) {
        // Verify photo is statically served
        const staticPhotoRes = await request('GET', photoUrl);
        assert(staticPhotoRes.status === 200, `GET ${photoUrl} static serving returns 200`);
      }

      // GET /api/auth/profile-photo
      const getPhotoRes = await request('GET', '/api/auth/profile-photo', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const fetchedPhoto = getPhotoRes.json && (getPhotoRes.json.profilePhoto || getPhotoRes.json.data?.profilePhoto);
      assert(getPhotoRes.status === 200 && fetchedPhoto === photoUrl, 'GET /api/auth/profile-photo: Returns persisted profile photo URL');

      // DELETE /api/auth/profile-photo
      const deletePhotoRes = await request('DELETE', '/api/auth/profile-photo', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      assert(deletePhotoRes.status === 200 && deletePhotoRes.json && deletePhotoRes.json.success, 'DELETE /api/auth/profile-photo: Successfully removed photo');
    } catch (err) {
      assert(false, `Profile photo CRUD error: ${err.message}`);
    }
  }

  // 6. Vehicles API
  console.log('\n--- 6. Vehicles Management API ---');
  if (authToken) {
    try {
      const getVehicles = await request('GET', '/api/vehicles/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      assert(getVehicles.status === 200 && getVehicles.json && getVehicles.json.success, 'GET /api/vehicles/me: Returns user vehicle list');

      const addVehicle = await request('POST', '/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationNumber: 'MH14EV1234',
          type: 'ev',
          label: 'My City EV',
        }),
      });
      assert(addVehicle.status === 201 && addVehicle.json && addVehicle.json.success, 'POST /api/vehicles: Added new EV vehicle');
    } catch (err) {
      assert(false, `Vehicles API error: ${err.message}`);
    }
  }

  // 7. Booking Lifecycle (Reserve, List, Cancel)
  console.log('\n--- 7. Booking Lifecycle API ---');
  if (authToken && sampleLocationId && sampleSlotId) {
    let bookingId = null;
    try {
      const createBookingRes = await request('POST', '/api/bookings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: sampleLocationId,
          slotId: sampleSlotId,
          vehicleNumber: 'MH12AB9999',
          vehicleType: 'car',
          durationHours: 2,
          requestId: crypto.randomUUID(),
        }),
      });

      assert(createBookingRes.status === 201 && createBookingRes.json && createBookingRes.json.success, `POST /api/bookings: Booking created successfully in DB (Status: ${createBookingRes.status})`);
      if (createBookingRes.json && createBookingRes.json.booking) {
        bookingId = createBookingRes.json.booking.id || createBookingRes.json.booking._id;
      }

      // GET /api/bookings/me
      const listBookingsRes = await request('GET', '/api/bookings/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      assert(listBookingsRes.status === 200 && listBookingsRes.json && listBookingsRes.json.success, 'GET /api/bookings/me: Returns active bookings for user');

      if (bookingId) {
        // Cancel booking (PATCH /api/bookings/:id/cancel)
        const cancelRes = await request('PATCH', `/api/bookings/${bookingId}/cancel`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'Audit Suite Test Cancellation' }),
        });
        assert(cancelRes.status === 200 && cancelRes.json && cancelRes.json.success, 'PATCH /api/bookings/:id/cancel: Booking cancelled and slot released');
      }
    } catch (err) {
      assert(false, `Booking lifecycle error: ${err.message}`);
    }
  }

  console.log('\n==================================================');
  console.log(`Audit Summary: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
