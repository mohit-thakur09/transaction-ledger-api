import type { DB } from '../db/connection';
import type { TransactionRow, TransactionType } from './transaction.types';

interface ListOptions {
  type?: TransactionType;
  limit: number;
  offset: number;
}

export class TransactionRepository {
  constructor(private readonly db: DB) {}

  create(transaction: TransactionRow): void {
    this.db
      .prepare(
        `INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
         VALUES (@id, @account_id, @type, @amount, @description, @reference_id, @created_at)`,
      )
      .run(transaction);
  }

  findByReference(accountId: string, referenceId: string): TransactionRow | undefined {
    return this.db
      .prepare('SELECT * FROM transactions WHERE account_id = ? AND reference_id = ?')
      .get(accountId, referenceId) as TransactionRow | undefined;
  }

  listByAccount(accountId: string, { type, limit, offset }: ListOptions): TransactionRow[] {
    return this.db
      .prepare(
        `SELECT * FROM transactions
         WHERE account_id = @accountId AND (@type IS NULL OR type = @type)
         ORDER BY created_at DESC, rowid DESC
         LIMIT @limit OFFSET @offset`,
      )
      .all({ accountId, type: type ?? null, limit, offset }) as TransactionRow[];
  }

  countByAccount(accountId: string, type?: TransactionType): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS total FROM transactions
         WHERE account_id = @accountId AND (@type IS NULL OR type = @type)`,
      )
      .get({ accountId, type: type ?? null }) as { total: number };
    return row.total;
  }
}
