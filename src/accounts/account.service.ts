import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError';
import { fromMinorUnits } from '../utils/money';
import type { AccountRepository } from './account.repository';
import type { CreateAccountInput } from './account.schemas';
import type { AccountResponse, AccountRow } from './account.types';

export function toAccountResponse(row: AccountRow): AccountResponse {
  return { ...row, balance: fromMinorUnits(row.balance) };
}

export class AccountService {
  constructor(private readonly accounts: AccountRepository) {}

  createAccount(input: CreateAccountInput): AccountResponse {
    const account: AccountRow = {
      id: randomUUID(),
      name: input.name,
      balance: 0,
      created_at: new Date().toISOString(),
    };
    this.accounts.create(account);
    return toAccountResponse(account);
  }

  getAccountOrThrow(id: string): AccountRow {
    const account = this.accounts.findById(id);
    if (!account) {
      throw AppError.notFound(`Account ${id} not found`);
    }
    return account;
  }

  getBalance(id: string) {
    const account = this.getAccountOrThrow(id);
    return { account_id: account.id, balance: fromMinorUnits(account.balance) };
  }
}
