import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestContext } from './helpers';

let ctx: TestContext;
let refCounter = 0;
const ref = () => `ref-${++refCounter}`;

async function createAccount(name = 'Alice') {
  const res = await ctx.request('POST', '/accounts', { name });
  return res.body.id as string;
}

function addTransaction(accountId: string, type: string, amount: number, referenceId = ref()) {
  return ctx.request('POST', `/accounts/${accountId}/transactions`, {
    type,
    amount,
    reference_id: referenceId,
    description: `${type} ${amount}`,
  });
}

async function getBalance(accountId: string) {
  return (await ctx.request('GET', `/accounts/${accountId}/balance`)).body.balance as number;
}

before(async () => {
  ctx = await startTestServer();
});

after(async () => {
  await ctx.close();
});

describe('accounts', () => {
  it('creates an account with zero balance and system generated fields', async () => {
    const res = await ctx.request('POST', '/accounts', { name: '  Alice  ' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Alice');
    assert.equal(res.body.balance, 0);
    assert.ok(res.body.id);
    assert.ok(!Number.isNaN(Date.parse(res.body.created_at)));
  });

  it('generates unique ids', async () => {
    const a = await createAccount();
    const b = await createAccount();
    assert.notEqual(a, b);
  });

  it('requires a name', async () => {
    for (const body of [{}, { name: '' }, { name: '   ' }, { name: 42 }]) {
      const res = await ctx.request('POST', '/accounts', body);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    }
  });

  it('does not let the client set the balance', async () => {
    const res = await ctx.request('POST', '/accounts', { name: 'Bob', balance: 500 });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('rejects malformed JSON', async () => {
    const res = await ctx.request('POST', '/accounts', '{"name":');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_REQUEST_BODY');
  });

  it('returns balance and 404 for unknown accounts', async () => {
    const id = await createAccount();
    const res = await ctx.request('GET', `/accounts/${id}/balance`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { account_id: id, balance: 0 });

    const missing = await ctx.request('GET', '/accounts/does-not-exist/balance');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
  });
});

describe('transactions', () => {
  it('applies credits and debits to the balance', async () => {
    const id = await createAccount();
    const credit = await addTransaction(id, 'credit', 100);
    assert.equal(credit.status, 201);
    assert.equal(credit.body.type, 'credit');
    assert.equal(credit.body.amount, 100);
    assert.equal(credit.body.account_id, id);

    await addTransaction(id, 'credit', 50);
    assert.equal(await getBalance(id), 150);

    await addTransaction(id, 'debit', 30);
    assert.equal(await getBalance(id), 120);
  });

  it('keeps the balance consistent with all valid transactions', async () => {
    const id = await createAccount();
    await addTransaction(id, 'credit', 100);
    await addTransaction(id, 'credit', 50);
    await addTransaction(id, 'debit', 30);
    await addTransaction(id, 'debit', 20);
    assert.equal(await getBalance(id), 100);
  });

  it('handles decimal amounts without floating point drift', async () => {
    const id = await createAccount();
    await addTransaction(id, 'credit', 0.1);
    await addTransaction(id, 'credit', 0.2);
    assert.equal(await getBalance(id), 0.3);
  });

  it('rejects a debit with insufficient balance and leaves the balance unchanged', async () => {
    const id = await createAccount();
    await addTransaction(id, 'credit', 100);

    const res = await addTransaction(id, 'debit', 150);
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'INSUFFICIENT_BALANCE');
    assert.equal(await getBalance(id), 100);

    const history = await ctx.request('GET', `/accounts/${id}/transactions`);
    assert.equal(history.body.pagination.total_records, 1);
  });

  it('does not create a duplicate transaction for the same reference_id', async () => {
    const id = await createAccount();
    const first = await addTransaction(id, 'credit', 100, 'dup-ref');
    assert.equal(first.status, 201);

    const second = await addTransaction(id, 'credit', 100, 'dup-ref');
    assert.equal(second.status, 409);
    assert.equal(second.body.error.code, 'DUPLICATE_TRANSACTION');
    assert.equal(second.body.error.details.transaction.id, first.body.id);
    assert.equal(await getBalance(id), 100);
  });

  it('allows the same reference_id on different accounts', async () => {
    const a = await createAccount();
    const b = await createAccount();
    assert.equal((await addTransaction(a, 'credit', 10, 'shared-ref')).status, 201);
    assert.equal((await addTransaction(b, 'credit', 10, 'shared-ref')).status, 201);
  });

  it('validates the request body', async () => {
    const id = await createAccount();
    const invalidBodies = [
      { type: 'refund', amount: 10, reference_id: 'x' },
      { type: 'credit', amount: 0, reference_id: 'x' },
      { type: 'credit', amount: -5, reference_id: 'x' },
      { type: 'credit', amount: '10', reference_id: 'x' },
      { type: 'credit', amount: 10.123, reference_id: 'x' },
      { type: 'credit', amount: 10 },
      { type: 'credit', amount: 10, reference_id: '  ' },
    ];
    for (const body of invalidBodies) {
      const res = await ctx.request('POST', `/accounts/${id}/transactions`, body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    }
    assert.equal(await getBalance(id), 0);
  });

  it('returns 404 when the account does not exist', async () => {
    const res = await addTransaction('missing-account', 'credit', 10);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('cannot be updated or deleted through the API', async () => {
    const id = await createAccount();
    const tx = (await addTransaction(id, 'credit', 10)).body;
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const res = await ctx.request(method, `/accounts/${id}/transactions/${tx.id}`, { amount: 99 });
      assert.equal(res.status, 404);
    }
  });

  it('is protected from updates and deletes at the database level', () => {
    assert.throws(() => ctx.db.prepare('UPDATE transactions SET amount = 1').run(), /immutable/);
    assert.throws(() => ctx.db.prepare('DELETE FROM transactions').run(), /immutable/);
  });
});

describe('transaction history', () => {
  let accountId: string;

  before(async () => {
    accountId = await createAccount();
    for (let i = 1; i <= 5; i++) {
      await addTransaction(accountId, 'credit', i * 10, `hist-credit-${i}`);
    }
    await addTransaction(accountId, 'debit', 5, 'hist-debit-1');
    await addTransaction(accountId, 'debit', 5, 'hist-debit-2');
  });

  it('returns all transactions latest first with pagination info', async () => {
    const res = await ctx.request('GET', `/accounts/${accountId}/transactions`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 7);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total_records: 7, total_pages: 1 });
    assert.equal(res.body.data[0].reference_id, 'hist-debit-2');
    assert.equal(res.body.data[6].reference_id, 'hist-credit-1');

    const timestamps = res.body.data.map((t: { created_at: string }) => t.created_at);
    assert.deepEqual(timestamps, [...timestamps].sort().reverse());
  });

  it('filters by type', async () => {
    const credits = await ctx.request('GET', `/accounts/${accountId}/transactions?type=credit`);
    assert.equal(credits.body.pagination.total_records, 5);
    assert.ok(credits.body.data.every((t: { type: string }) => t.type === 'credit'));

    const debits = await ctx.request('GET', `/accounts/${accountId}/transactions?type=debit`);
    assert.equal(debits.body.pagination.total_records, 2);
    assert.ok(debits.body.data.every((t: { type: string }) => t.type === 'debit'));
  });

  it('paginates results', async () => {
    const page1 = await ctx.request('GET', `/accounts/${accountId}/transactions?page=1&limit=3`);
    const page3 = await ctx.request('GET', `/accounts/${accountId}/transactions?page=3&limit=3`);
    assert.deepEqual(page1.body.pagination, { page: 1, limit: 3, total_records: 7, total_pages: 3 });
    assert.equal(page1.body.data.length, 3);
    assert.equal(page3.body.data.length, 1);
    assert.equal(page3.body.data[0].reference_id, 'hist-credit-1');

    const beyond = await ctx.request('GET', `/accounts/${accountId}/transactions?page=10&limit=3`);
    assert.equal(beyond.status, 200);
    assert.deepEqual(beyond.body.data, []);
  });

  it('rejects invalid pagination and filter parameters', async () => {
    for (const qs of ['page=0', 'page=-1', 'page=abc', 'limit=0', 'limit=101', 'limit=2.5', 'type=refund']) {
      const res = await ctx.request('GET', `/accounts/${accountId}/transactions?${qs}`);
      assert.equal(res.status, 400, qs);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    }
  });

  it('returns 404 for an unknown account', async () => {
    const res = await ctx.request('GET', '/accounts/missing/transactions');
    assert.equal(res.status, 404);
  });
});

describe('transfers', () => {
  async function setupAccounts() {
    const a = await createAccount('A');
    const b = await createAccount('B');
    await addTransaction(a, 'credit', 100);
    await addTransaction(b, 'credit', 50);
    return { a, b };
  }

  it('moves money between accounts', async () => {
    const { a, b } = await setupAccounts();
    const res = await ctx.request('POST', '/transfers', {
      from_account_id: a,
      to_account_id: b,
      amount: 30,
      reference_id: 'transfer-1',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.debit_transaction.account_id, a);
    assert.equal(res.body.credit_transaction.account_id, b);
    assert.equal(await getBalance(a), 70);
    assert.equal(await getBalance(b), 80);
  });

  it('rejects a transfer with insufficient balance', async () => {
    const { a, b } = await setupAccounts();
    const res = await ctx.request('POST', '/transfers', {
      from_account_id: a,
      to_account_id: b,
      amount: 500,
      reference_id: 'transfer-2',
    });
    assert.equal(res.status, 422);
    assert.equal(await getBalance(a), 100);
    assert.equal(await getBalance(b), 50);
  });

  it('requires both accounts to exist', async () => {
    const { a } = await setupAccounts();
    const res = await ctx.request('POST', '/transfers', {
      from_account_id: a,
      to_account_id: 'missing',
      amount: 10,
      reference_id: 'transfer-3',
    });
    assert.equal(res.status, 404);
    assert.equal(await getBalance(a), 100);
  });

  it('rolls back the debit when the credit leg fails', async () => {
    const { a, b } = await setupAccounts();
    await addTransaction(b, 'credit', 1, 'clashing-ref');

    const res = await ctx.request('POST', '/transfers', {
      from_account_id: a,
      to_account_id: b,
      amount: 10,
      reference_id: 'clashing-ref',
    });
    assert.equal(res.status, 409);
    assert.equal(await getBalance(a), 100);
    assert.equal(await getBalance(b), 51);

    const history = await ctx.request('GET', `/accounts/${a}/transactions`);
    assert.equal(history.body.pagination.total_records, 1);
  });

  it('validates the request', async () => {
    const { a } = await setupAccounts();
    const res = await ctx.request('POST', '/transfers', {
      from_account_id: a,
      to_account_id: a,
      amount: 10,
      reference_id: 'transfer-4',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});
