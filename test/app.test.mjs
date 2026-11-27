import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_PRICE_MATRIX,
  SPECIALTY_FLAT_PRICE,
  INITIAL_HAIRSTYLES,
  calculateStylePrice
} from '../public/js/data.js';
import { createApp } from '../server.js';

test('Official @NICOLE_BEAUTY_PARLOUR BWP pricing matrix matches poster', () => {
  assert.deepEqual(OFFICIAL_PRICE_MATRIX.jumbo, { midback: 130, butt: 160, knee: 200 });
  assert.deepEqual(OFFICIAL_PRICE_MATRIX.large, { midback: 160, butt: 200, knee: 250 });
  assert.deepEqual(OFFICIAL_PRICE_MATRIX.medium, { midback: 180, butt: 250, knee: 300 });
  assert.deepEqual(OFFICIAL_PRICE_MATRIX.s_medium, { midback: 200, butt: 300, knee: 400 });
  assert.deepEqual(OFFICIAL_PRICE_MATRIX.small, { midback: 250, butt: 350, knee: 500 });
  assert.equal(SPECIALTY_FLAT_PRICE, 250);
  assert.equal(INITIAL_HAIRSTYLES.length, 16);

  const knotless = INITIAL_HAIRSTYLES.find((s) => s.id === 'style-01');
  assert.equal(calculateStylePrice(knotless, 'jumbo', 'midback'), 130);
  assert.equal(calculateStylePrice(knotless, 'small', 'knee'), 500);

  const softdread = INITIAL_HAIRSTYLES.find((s) => s.id === 'style-13');
  assert.equal(calculateStylePrice(softdread, 'medium', 'midback'), 250);
});

test('REST API endpoints support styles, bookings, promotions & two-way messaging', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check
    const healthRes = await fetch(`${base}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.salon, 'Nicole Beauty Parlour');

    // 2. Add new hairstyle
    const styleRes = await fetch(`${base}/api/styles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Waist Boho Twists',
        category: 'Twists',
        defaultSize: 'medium',
        defaultLength: 'butt'
      })
    });
    assert.equal(styleRes.status, 201);
    const createdStyle = await styleRes.json();
    assert.equal(createdStyle.name, 'Test Waist Boho Twists');
    assert.equal(createdStyle.computedStartingPrice, 250);

    // 3. Launch new advertisement
    const promoRes = await fetch(`${base}/api/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Festive Braids Flash Deal',
        discountPercent: 20,
        code: 'festive20'
      })
    });
    assert.equal(promoRes.status, 201);
    const createdPromo = await promoRes.json();
    assert.equal(createdPromo.code, 'FESTIVE20');

    // 4. Create booking
    const bkRes = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Mpho K.',
        clientPhone: '+267 72 000 111',
        styleName: 'Honey Blonde Curly-Ends Knotless',
        date: '2026-12-05',
        time: '10:30',
        total: 240
      })
    });
    assert.equal(bkRes.status, 201);
    const createdBooking = await bkRes.json();
    assert.match(createdBooking.id, /^NBP-/);

    // 5. Two-way messaging with smart salon reply
    const msgRes = await fetch(`${base}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: 'thread-nicole',
        sender: 'client',
        text: 'How much are your prices in pula?',
        autoReply: true
      })
    });
    assert.equal(msgRes.status, 201);
    const msgPayload = await msgRes.json();
    assert.ok(msgPayload.replyMessage);
    assert.match(msgPayload.replyMessage.text, /P130/);

    // Clean up test items
    await fetch(`${base}/api/styles/${createdStyle.id}`, { method: 'DELETE' });
    await fetch(`${base}/api/promotions/${createdPromo.id}`, { method: 'DELETE' });
  } finally {
    server.close();
  }
});
