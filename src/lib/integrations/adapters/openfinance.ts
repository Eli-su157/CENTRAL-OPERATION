// Shell do adaptador Open Finance — Fase C.
// Estrutura genérica para conectar bancos via Open Finance (Pluggy / Belvo / Klavi).
// NÃO implementado — apenas interface e tipos para orientar a implementação futura.
//
// Como funcionar na Fase C:
//   1. Implementar OpenFinanceAdapter para cada provedor (Pluggy, Belvo, Klavi)
//   2. Usar fetchTransactions() para buscar extrato bancário real
//   3. Conciliar transações bancárias com finance_entries por data + valor
//   4. Expor resultado em FinancePageClient (bloco de conciliação)

export type BankTransactionType = 'credit' | 'debit';

/** Transação bancária normalizada — saída de qualquer OpenFinanceAdapter */
export interface BankTransaction {
  id:          string;           // ID único na plataforma de Open Finance
  date:        string;           // YYYY-MM-DD
  amount:      number;           // valor absoluto em BRL
  type:        BankTransactionType;
  description: string;           // descrição do banco
  category?:   string;           // categoria inferida pelo provedor
  balance?:    number;           // saldo após a transação (quando disponível)
}

/** Resultado da conciliação: cada finance_entry casada (ou não) com uma transação */
export interface ReconciliationItem {
  finance_entry_id: string;
  bank_transaction_id: string | null;  // null = sem casamento
  matched: boolean;
  discrepancy: number;                  // diferença de valor (0 se casado perfeitamente)
}

/** Interface que cada adaptador de banco deve implementar */
export interface OpenFinanceAdapter {
  provider: 'pluggy' | 'belvo' | 'klavi' | string;

  /**
   * Busca transações bancárias de uma conta para o período informado.
   * credentials: { access_token, account_id, ... } — varia por provedor.
   */
  fetchTransactions(
    credentials: Record<string, string>,
    from: string,    // YYYY-MM-DD
    to:   string,    // YYYY-MM-DD
  ): Promise<BankTransaction[]>;

  /**
   * Valida se as credenciais são suficientes para uma chamada bem-sucedida.
   * Retorna true se válido, false caso contrário.
   */
  validateCredentials(credentials: Record<string, string>): Promise<boolean>;
}

// ─── Conciliação (helper) ────────────────────────────────────────────────────
// Fase C implementará: casar finance_entries com bank_transactions por data + valor
// Assinatura reservada:
//
// export function reconcile(
//   entries:      import('@/lib/finance/calc').FinanceEntry[],
//   transactions: BankTransaction[],
//   tolerance:    number = 1.00,     // tolerância em R$
// ): ReconciliationItem[]
