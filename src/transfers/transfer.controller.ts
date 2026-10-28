import type { Request, Response } from 'express';
import { parseOrThrow } from '../utils/validation';
import { createTransferSchema } from './transfer.schemas';
import type { TransferService } from './transfer.service';

export class TransferController {
  constructor(private readonly service: TransferService) {}

  create = (req: Request, res: Response) => {
    const input = parseOrThrow(createTransferSchema, req.body);
    res.status(201).json(this.service.transfer(input));
  };
}
