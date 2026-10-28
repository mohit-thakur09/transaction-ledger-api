import type { Request, Response } from 'express';
import { parseOrThrow } from '../utils/validation';
import { createTransactionSchema, listTransactionsQuerySchema } from './transaction.schemas';
import type { TransactionService } from './transaction.service';

type AccountParams = { accountId: string };

export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  create = (req: Request<AccountParams>, res: Response) => {
    const input = parseOrThrow(createTransactionSchema, req.body);
    res.status(201).json(this.service.addTransaction(req.params.accountId, input));
  };

  list = (req: Request<AccountParams>, res: Response) => {
    const query = parseOrThrow(listTransactionsQuerySchema, req.query);
    res.json(this.service.listTransactions(req.params.accountId, query));
  };
}
