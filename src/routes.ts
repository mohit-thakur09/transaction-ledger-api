import { Router } from 'express';
import type { DB } from './db/connection';
import { AccountController } from './accounts/account.controller';
import { AccountRepository } from './accounts/account.repository';
import { AccountService } from './accounts/account.service';
import { TransactionController } from './transactions/transaction.controller';
import { TransactionRepository } from './transactions/transaction.repository';
import { TransactionService } from './transactions/transaction.service';
import { TransferController } from './transfers/transfer.controller';
import { TransferService } from './transfers/transfer.service';

export function createRouter(db: DB): Router {
  const accountRepository = new AccountRepository(db);
  const transactionRepository = new TransactionRepository(db);

  const accountService = new AccountService(accountRepository);
  const transactionService = new TransactionService(db, accountRepository, transactionRepository, accountService);
  const transferService = new TransferService(db, accountService, transactionService);

  const accounts = new AccountController(accountService);
  const transactions = new TransactionController(transactionService);
  const transfers = new TransferController(transferService);

  const router = Router();

  router.post('/accounts', accounts.create);
  router.get('/accounts/:accountId/balance', accounts.getBalance);
  router.post('/accounts/:accountId/transactions', transactions.create);
  router.get('/accounts/:accountId/transactions', transactions.list);
  router.post('/transfers', transfers.create);

  return router;
}
