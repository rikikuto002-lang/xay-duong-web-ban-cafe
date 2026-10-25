import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Web Client Auth & Cart Management', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { window: unknown }).window = {
      ...globalThis,
      dispatchEvent: () => true
    };
    globalThis.localStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: 0
    } as Storage;
  });

  it('generates a persistent guest ID for unauthenticated visitors', async () => {
    const { getGuestId } = await import('./auth.js');
    const guestId1 = getGuestId();
    const guestId2 = getGuestId();

    assert.ok(guestId1.startsWith('guest-'));
    assert.equal(guestId1, guestId2);
  });

  it('determines cart storage key separately for guests and authenticated users', async () => {
    const { getCartStorageKey, setSession, clearSession } = await import('./auth.js');

    const guestKey = getCartStorageKey();
    assert.ok(guestKey.startsWith('cafeCart:guest-'));

    setSession({
      token: 'jwt-dummy-token',
      user: {
        id: 'usr-123',
        name: 'Nguyễn Văn A',
        email: 'customer@cafeshop.vn',
        role: 'customer'
      }
    });

    const userKey = getCartStorageKey();
    assert.equal(userKey, 'cafeCart:customer@cafeshop.vn');

    clearSession();
  });

  it('merges guest cart into user cart upon login without losing items', async () => {
    const { getGuestId, getCartStorageKey, setSession, getCartCount } = await import('./auth.js');

    const guestId = getGuestId();
    const guestCartKey = `cafeCart:${guestId}`;
    store.set(guestCartKey, JSON.stringify([
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 }
    ]));

    // Pre-existing user cart has 1x product 1
    const userCartKey = 'cafeCart:test@cafe.com';
    store.set(userCartKey, JSON.stringify([
      { productId: 1, quantity: 1 }
    ]));

    setSession({
      token: 'jwt-token-2',
      user: {
        id: 'usr-456',
        name: 'Trần Văn B',
        email: 'test@cafe.com',
        role: 'customer'
      }
    });

    // Check merged cart
    const mergedCart = JSON.parse(store.get(userCartKey) ?? '[]');
    const p1 = mergedCart.find((i: { productId: number }) => i.productId === 1);
    const p2 = mergedCart.find((i: { productId: number }) => i.productId === 2);

    assert.equal(p1.quantity, 3); // 1 + 2 = 3
    assert.equal(p2.quantity, 1);
    assert.equal(store.has(guestCartKey), false);
    assert.equal(getCartCount(), 4);
  });
});
