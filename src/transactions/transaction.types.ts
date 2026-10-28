export type TransactionType = 'credit' | 'debit';

export interface TransactionRow {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference_id: string;
  created_at: string;
}

export type TransactionResponse = TransactionRow;

export interface TransactionListQuery {
  type?: TransactionType;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  data: TransactionResponse[];
  pagination: {
    page: number;
    limit: number;
    total_records: number;
    total_pages: number;
  };
}
