import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_PRICE_MATRIX,
  SIZE_OPTIONS,
  LENGTH_OPTIONS,
  SPECIALTY_FLAT_PRICE,
  INITIAL_HAIRSTYLES,
  INITIAL_PROMOTIONS,
  INITIAL_BOOKINGS,
  INITIAL_THREADS,
  calculateStylePrice
} from '../public/js/data.js';
import { createApp } from '../server.js';

test('Catalog & pricing data layer holds real salon prices', () => {
  // Real Knotless / Box Braids / Twist matrix is populated.
  assert.equal(OFFICIAL_PRICE_MATRIX.jumbo.midback, 130);
  assert.equal(OFFICIAL_PRICE_MATRIX.jumbo.butt, 160);
  assert.equal(OFFICIAL_PRICE_MATRIX.jumbo.knee, 200);
  assert.equal(OFFICIAL_PRICE_MATRIX.large.midback, 160);
  assert.equal(OFFICIAL_PRICE_MATRIX.medium.midback, 180);
  assert.equal(OFFICIAL_PRICE_MATRIX.medium.knee, 300);
  assert.equal(OFFICIAL_PRICE_MATRIX.smedium.midback, 200);
  assert.equal(OFFICIAL_PRICE_MATRIX.smedium.knee, 400);
  assert.equal(OFFICIAL_PRICE_MATRIX.small.midback, 250);
  assert.equal(OFFICIAL_PRICE_MATRIX.small.knee, 500);

  // Size & length options drive the matrix table.
  assert.equal(SIZE_OPTIONS.length, 5);
  assert.equal(LENGTH_OPTIONS.length, 3);

  // Flat specialty rate (Pick n' Drop / Switch / Hardread / Softdread).
  assert.equal(SPECIALTY_FLAT_PRICE, 250);

  // Real salon hairstyles are seeded (photos added later by the owner).
  assert.equal(INITIAL_HAIRSTYLES.length, 7);
  assert.ok(INITIAL_HAIRSTYLES.some((s) => s.id === 'knotless' && s.pricingMode === 'matrix'));
  assert.ok(INITIAL_HAIRSTYLES.some((s) => s.id === 'softdread' && s.pricingMode === 'flat'));
  assert.ok(INITIAL_HAIRSTYLES.every((s) => !s.image)); // photos added later

  // Demo/mockup records remain cleared.
  assert.equal(INITIAL_PROMOTIONS.length, 0);
  assert.equal(INITIAL_BOOKINGS.length, 0);
  assert.equal(INITIAL_THREADS.length, 0);

  // Price calculation resolves against the real matrix.
  assert.equal(calculateStylePrice(null, 'medium', 'midback'), 0);
  assert.equal(calculateStylePrice({}, 'medium', 'midback'), 180);
  assert.equal(calculateStylePrice({}, 'small', 'knee'), 500);

  // A flat-price style still resolves.
  const flat = { pricingMode: 'flat', flatPrice: 250 };
  assert.equal(calculateStylePrice(flat, 'medium', 'midback'), 250);
  assert.equal(calculateStylePrice(flat, 'small', 'knee'), 300);
});

test('REST API endpoints support styles, bookings, promotions & two-way messaging', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check reflects the seeded real catalog
    const healthRes = await fetch(`${base}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.stylesCount, 7);
    assert.equal(health.promotionsCount, 0);
    assert.equal(health.bookingsCount, 0);

    // 2. Add a new hairstyle (flat-priced so it resolves without a matrix)
    const styleRes = await fetch(`${base}/api/styles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Waist Boho Twists',
        category: 'Twists',
        pricingMode: 'flat',
        flatPrice: 250,
        defaultSize: 'medium',
        defaultLength: 'butt'
      })
    });
    assert.equal(styleRes.status, 201);
    const createdStyle = await styleRes.json();
    assert.equal(createdStyle.name, 'Test Waist Boho Twists');
    assert.equal(createdStyle.computedStartingPrice, 250);

    // 3. Launch a new advertisement
    const promoRes = await fetch(`${base}/api/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        title: 'Festive Braids Flash Deal',
        discountPercent: 20,
        code: 'test20'
      })
    });
    assert.equal(promoRes.status, 201);
    const createdPromo = await promoRes.json();
    assert.equal(createdPromo.code, 'TEST20');

    // 4. Create booking & verify double-booking conflict protection + depositPaid toggle
    const bkRes = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        clientName: 'Test Client',
        clientPhone: '+267 72 000 111',
        styleName: 'Test Waist Boho Twists',
        stylistId: 'nicole',
        date: '2026-12-19',
        time: '14:30',
        total: 240
      })
    });
    assert.equal(bkRes.status, 201);
    const createdBooking = await bkRes.json();
    assert.match(createdBooking.id, /^NBP-/);
    assert.equal(createdBooking.depositPaid, false);

    // Same braider + date + time must reject with 409 Conflict
    const conflictRes = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Second Client',
        styleName: 'Box Braids',
        stylistId: 'nicole',
        date: '2026-12-19',
        time: '14:30',
        total: 180
      })
    });
    assert.equal(conflictRes.status, 409);

    // Mark deposit paid & cancel test booking so slot frees up cleanly
    const depRes = await fetch(`${base}/api/bookings/${createdBooking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositPaid: true, status: 'Cancelled' })
    });
    assert.equal(depRes.status, 200);
    const updatedBooking = await depRes.json();
    assert.equal(updatedBooking.depositPaid, true);

    // 5. Two-way messaging with a smart salon reply
    const msgRes = await fetch(`${base}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: 'test-thread',
        sender: 'client',
        text: 'How much are your prices in pula?',
        autoReply: true
      })
    });
    assert.equal(msgRes.status, 201);
    const msgPayload = await msgRes.json();
    assert.ok(msgPayload.replyMessage);
    assert.equal(typeof msgPayload.replyMessage.text, 'string');

    // Clean up test items
    await fetch(`${base}/api/styles/${createdStyle.id}`, { method: 'DELETE' });
    await fetch(`${base}/api/promotions/${createdPromo.id}`, { method: 'DELETE' });
  } finally {
    server.close();
  }
});

test('Admin Phone + Password authentication, session token, style editing & credential rotation', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Public /api/state never exposes admin passwordHash
    const stateRes = await fetch(`${base}/api/state`);
    const pubState = await stateRes.json();
    assert.equal(pubState.admin, undefined);

    // 2. Wrong password must fail with 401
    const badRes = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '72517904', password: 'WrongPassword!' })
    });
    assert.equal(badRes.status, 401);

    // 3. Valid Botswana formatted phone + password succeeds and returns token
    const loginRes = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+267 72 517 904', password: 'Nicole2026' })
    });
    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.ok, true);
    assert.ok(loginBody.token);
    assert.equal(loginBody.admin.phone, '72517904');

    // 4. Verify /api/admin/session with Bearer token
    const sesRes = await fetch(`${base}/api/admin/session`, {
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });
    assert.equal(sesRes.status, 200);
    const sesBody = await sesRes.json();
    assert.equal(sesBody.authenticated, true);

    // 5. Edit a hairstyle via PATCH /api/styles/:id (create one first on the empty shell)
    const createRes = await fetch(`${base}/api/styles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({ name: 'Admin Edit Target', category: 'Knotless' })
    });
    assert.equal(createRes.status, 201);
    const editTarget = await createRes.json();

    const editRes = await fetch(`${base}/api/styles/${editTarget.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({ badge: 'VIP Favorite' })
    });
    assert.equal(editRes.status, 200);
    const edited = await editRes.json();
    assert.equal(edited.badge, 'VIP Favorite');

    // Clean up the edit target
    await fetch(`${base}/api/styles/${editTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` }
    });

    // 6. Rotate admin credentials and restore back to defaults
    const rotRes = await fetch(`${base}/api/admin/credentials`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        currentPassword: 'Nicole2026',
        newPhone: '71999888',
        newPassword: 'NewVaultPassword99'
      })
    });
    assert.equal(rotRes.status, 200);
    const rotBody = await rotRes.json();
    assert.equal(rotBody.admin.phone, '71999888');

    // Restore default phone & password
    const restoreRes = await fetch(`${base}/api/admin/credentials`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rotBody.token}`
      },
      body: JSON.stringify({
        currentPassword: 'NewVaultPassword99',
        newPhone: '72517904',
        newPassword: 'Nicole2026'
      })
    });
    assert.equal(restoreRes.status, 200);
  } finally {
    server.close();
  }
});
