import { randomUUID } from 'node:crypto';
import type { DB } from '../db/connection';
import type { AccountRepository } from '../accounts/account.repository';
import type { AccountService } from '../accounts/account.service';
import { AppError } from '../errors/AppError';
import { fromMinorUnits, toMinorUnits } from '../utils/money';
import type { TransactionRepository } from './transaction.repository';
import type { CreateTransactionInput } from './transaction.schemas';
import type {
  PaginatedTransactions,
  TransactionListQuery,
  TransactionResponse,
  TransactionRow,
} from './transaction.types';

export function toTransactionResponse(row: TransactionRow): TransactionResponse {
  return { ...row, amount: fromMinorUnits(row.amount) };
}

export class TransactionService {
  constructor(
    private readonly db: DB,
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly accountService: AccountService,
  ) {}

  // Inserting the transaction and updating the balance run in a single DB transaction.
  // When called from within another DB transaction (e.g. a transfer) it becomes a savepoint.
  addTransaction(accountId: string, input: CreateTransactionInput): TransactionResponse {
    return this.db.transaction(() => {
      const account = this.accountService.getAccountOrThrow(accountId);

      const existing = this.transactions.findByReference(accountId, input.reference_id);
      if (existing) {
        throw new AppError(
          409,
          'DUPLICATE_TRANSACTION',
          `Transaction with reference_id '${input.reference_id}' already exists for this account`,
          { transaction: toTransactionResponse(existing) },
        );
      }

      const amount = toMinorUnits(input.amount);
      const newBalance = input.type === 'credit' ? account.balance + amount : account.balance - amount;
      if (newBalance < 0) {
        throw new AppError(422, 'INSUFFICIENT_BALANCE', 'Insufficient balance for this debit', {
          balance: fromMinorUnits(account.balance),
          requested_amount: input.amount,
        });
      }

      const transaction: TransactionRow = {
        id: randomUUID(),
        account_id: accountId,
        type: input.type,
        amount,
        description: input.description ?? null,
        reference_id: input.reference_id,
        created_at: new Date().toISOString(),
      };

      this.transactions.create(transaction);
      this.accounts.updateBalance(accountId, newBalance);

      return toTransactionResponse(transaction);
    })();
  }

  listTransactions(accountId: string, query: TransactionListQuery): PaginatedTransactions {
    this.accountService.getAccountOrThrow(accountId);

    const { type, page, limit } = query;
    const totalRecords = this.transactions.countByAccount(accountId, type);
    const rows = this.transactions.listByAccount(accountId, {
      type,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: rows.map(toTransactionResponse),
      pagination: {
        page,
        limit,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit),
      },
    };
  }
}
