import type { Request, Response } from 'express';
import { parseOrThrow } from '../utils/validation';
import { createAccountSchema } from './account.schemas';
import type { AccountService } from './account.service';

export class AccountController {
  constructor(private readonly service: AccountService) {}

  create = (req: Request, res: Response) => {
    const input = parseOrThrow(createAccountSchema, req.body);
    res.status(201).json(this.service.createAccount(input));
  };

  getBalance = (req: Request<{ accountId: string }>, res: Response) => {
    res.json(this.service.getBalance(req.params.accountId));
  };
}
