import type { DB } from '../db/connection';
import type { AccountService } from '../accounts/account.service';
import type { TransactionService } from '../transactions/transaction.service';
import type { TransactionResponse } from '../transactions/transaction.types';
import type { CreateTransferInput } from './transfer.schemas';

export interface TransferResponse {
  debit_transaction: TransactionResponse;
  credit_transaction: TransactionResponse;
}

export class TransferService {
  constructor(
    private readonly db: DB,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
  ) {}

  // Both legs run inside one DB transaction; any error rolls back the whole transfer.
  transfer(input: CreateTransferInput): TransferResponse {
    return this.db.transaction(() => {
      this.accountService.getAccountOrThrow(input.from_account_id);
      this.accountService.getAccountOrThrow(input.to_account_id);

      const debit = this.transactionService.addTransaction(input.from_account_id, {
        type: 'debit',
        amount: input.amount,
        reference_id: input.reference_id,
        description: input.description ?? `Transfer to ${input.to_account_id}`,
      });

      const credit = this.transactionService.addTransaction(input.to_account_id, {
        type: 'credit',
        amount: input.amount,
        reference_id: input.reference_id,
        description: input.description ?? `Transfer from ${input.from_account_id}`,
      });

      return { debit_transaction: debit, credit_transaction: credit };
    })();
  }
}
