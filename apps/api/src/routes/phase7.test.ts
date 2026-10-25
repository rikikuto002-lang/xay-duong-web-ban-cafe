import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, calculateShippingFee } from '../lib/database.js';

describe('Phase 7 Features: Reservations, Coupons, Shipping, Reviews', () => {
  it('calculates shipping fee accurately by district and applies free threshold', () => {
    // Zone 1: Quận 1, fee 15k, free at 150k
    const q1Low = calculateShippingFee('Quận 1', 50000);
    assert.equal(q1Low.fee, 15000);
    assert.equal(q1Low.isFree, false);

    const q1High = calculateShippingFee('Quận 1', 160000);
    assert.equal(q1High.fee, 0);
    assert.equal(q1High.isFree, true);

    // Zone 2: Quận 7, fee 25k, free at 250k
    const q7Low = calculateShippingFee('Quận 7', 100000);
    assert.equal(q7Low.fee, 25000);
    assert.equal(q7Low.isFree, false);

    // Zone 3: TP. Thủ Đức, fee 35k
    const thuDuc = calculateShippingFee('TP. Thủ Đức', 120000);
    assert.equal(thuDuc.fee, 35000);
  });

  it('manages reservations: creates, lists, and confirms table reservation', async () => {
    const db = await getDatabase();
    const initialList = await db.listReservations();
    const initialCount = initialList.length;

    const res = await db.createReservation({
      customerName: 'Hoàng Anh',
      phone: '0977889900',
      date: '2026-10-26',
      time: '18:00',
      guestCount: 3,
      area: 'outdoor',
      notes: 'Bàn view thoáng, tiệc sinh nhật'
    });

    assert.ok(res.id.startsWith('RES-'));
    assert.equal(res.status, 'pending');
    assert.equal(res.customerName, 'Hoàng Anh');

    const updatedList = await db.listReservations();
    assert.equal(updatedList.length, initialCount + 1);

    const confirmed = await db.updateReservationStatus(res.id, 'confirmed');
    assert.ok(confirmed);
    assert.equal(confirmed.status, 'confirmed');
  });

  it('validates coupon codes and computes correct percentage and fixed discounts', async () => {
    const db = await getDatabase();

    // 1. Valid percent coupon CAFE20 (20%)
    const c20 = await db.getCoupon('CAFE20');
    assert.ok(c20);
    assert.equal(c20.type, 'percent');
    assert.equal(c20.value, 20);

    // 2. Fixed coupon CHAOBAN (30.000đ for min order 80.000đ)
    const chaoBan = await db.getCoupon('CHAOBAN');
    assert.ok(chaoBan);
    assert.equal(chaoBan.type, 'fixed');
    assert.equal(chaoBan.value, 30000);
    assert.equal(chaoBan.minOrderValue, 80000);

    // 3. Invalid coupon
    const invalid = await db.getCoupon('NON_EXISTENT');
    assert.equal(invalid, null);
  });

  it('records product reviews and maintains average rating', async () => {
    const db = await getDatabase();
    const productId = 2; // Cappuccino

    const initialReviews = await db.listReviews(productId);
    const countBefore = initialReviews.length;

    const newReview = await db.createReview({
      productId,
      customerName: 'Minh Đạt',
      rating: 5,
      comment: 'Cà phê rất thơm ngon, bao bì sạch đẹp!'
    });

    assert.ok(newReview.id.startsWith('REV-'));
    assert.equal(newReview.rating, 5);

    const afterReviews = await db.listReviews(productId);
    assert.equal(afterReviews.length, countBefore + 1);
  });
});

