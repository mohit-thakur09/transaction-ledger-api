import type { DB } from '../db/connection';
import type { AccountRow } from './account.types';

export class AccountRepository {
  constructor(private readonly db: DB) {}

  create(account: AccountRow): void {
    this.db
      .prepare('INSERT INTO accounts (id, name, balance, created_at) VALUES (@id, @name, @balance, @created_at)')
      .run(account);
  }

  findById(id: string): AccountRow | undefined {
    return this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined;
  }

  updateBalance(id: string, balance: number): void {
    this.db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(balance, id);
  }
}
