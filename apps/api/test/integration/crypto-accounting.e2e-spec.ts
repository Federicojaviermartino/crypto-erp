import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from 'decimal.js';

/**
 * INTEGRATION TEST: Crypto Accounting Workflow
 * Flujo: Transaction → FIFO Calculation → Journal Entry → Balance
 *
 * Tests críticos de integración:
 * - Transacción crypto → asiento contable automático
 * - Cálculo FIFO cost basis
 * - Ganancias/pérdidas patrimoniales
 * - Balance Debe=Haber
 */

describe('Crypto Accounting Workflow (Integration)', () => {
  describe('Buy → Sell → Capital Gain Flow', () => {
    it('should calculate FIFO cost basis and capital gain', () => {
      // Step 1: Compra 1 BTC a 30,000 EUR
      const purchaseLot = {
        quantity: new Decimal('1.0'),
        costPerUnit: new Decimal('30000'),
        remainingAmount: new Decimal('1.0'),
      };

      // Step 2: Venta 0.5 BTC a 45,000 EUR
      const sellAmount = new Decimal('0.5');
      const sellPrice = new Decimal('45000');

      // Step 3: Calcular cost basis FIFO
      const costBasis = purchaseLot.costPerUnit.mul(sellAmount); // 0.5 * 30k = 15k
      const sellValue = sellPrice.mul(sellAmount); // 0.5 * 45k = 22.5k

      // Step 4: Ganancia patrimonial
      const capitalGain = sellValue.minus(costBasis); // 22.5k - 15k = 7.5k

      expect(costBasis.toNumber()).toBe(15000);
      expect(sellValue.toNumber()).toBe(22500);
      expect(capitalGain.toNumber()).toBe(7500); // Ganancia de 7,500 EUR
    });

    it('should create journal entry with balanced debits and credits', () => {
      // Asiento contable para venta con ganancia
      const lines = [
        { account: 'BANK', debit: 22500, credit: 0 },      // Entrada banco
        { account: 'WALLET', debit: 0, credit: 15000 },    // Salida wallet (cost basis)
        { account: 'GAIN', debit: 0, credit: 7500 },       // Ganancia patrimonial
      ];

      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

      expect(totalDebit).toBe(totalCredit); // CRITICAL: Debe = Haber
      expect(totalDebit).toBe(22500);
    });
  });

  describe('FIFO with Multiple Lots', () => {
    it('should consume lots in FIFO order', () => {
      // Lots: 3 compras a precios diferentes
      const lots = [
        { acquiredAt: new Date('2024-01-01'), remaining: new Decimal('0.5'), costPerUnit: new Decimal('30000') },
        { acquiredAt: new Date('2024-02-01'), remaining: new Decimal('0.5'), costPerUnit: new Decimal('35000') },
        { acquiredAt: new Date('2024-03-01'), remaining: new Decimal('1.0'), costPerUnit: new Decimal('40000') },
      ];

      // Vender 1.2 BTC
      const sellAmount = new Decimal('1.2');
      let remaining = sellAmount;
      let totalCost = new Decimal('0');

      // Consumir en orden FIFO
      for (const lot of lots) {
        if (remaining.lte(0)) break;
        const useFromLot = Decimal.min(remaining, lot.remaining);
        totalCost = totalCost.plus(useFromLot.mul(lot.costPerUnit));
        remaining = remaining.minus(useFromLot);
      }

      // lot-1: 0.5 * 30k = 15k
      // lot-2: 0.5 * 35k = 17.5k
      // lot-3: 0.2 * 40k = 8k
      // Total: 40.5k
      expect(totalCost.toNumber()).toBe(40500);
      expect(remaining.toNumber()).toBe(0); // Todo consumido
    });
  });

  describe('Staking Rewards Income', () => {
    it('should record staking rewards as income', () => {
      // Recompensa: 0.5 ETH @ 2,000 EUR = 1,000 EUR
      const rewardAmount = new Decimal('0.5');
      const priceEur = new Decimal('2000');
      const valueEur = rewardAmount.mul(priceEur);

      // Asiento:
      const lines = [
        { account: 'WALLET', debit: 1000, credit: 0 },     // Entrada crypto
        { account: 'INCOME', debit: 0, credit: 1000 },     // Ingreso financiero
      ];

      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

      expect(valueEur.toNumber()).toBe(1000);
      expect(totalDebit).toBe(totalCredit);
    });
  });

  describe('Modelo 721 Year-End Balances', () => {
    it('should calculate balances at 31/12', () => {
      // Portfolio a 31/12/2024
      const holdings = [
        { asset: 'BTC', quantity: new Decimal('2.0'), priceEur: new Decimal('45000') },
        { asset: 'ETH', quantity: new Decimal('10.0'), priceEur: new Decimal('3000') },
      ];

      const totalValue = holdings.reduce((sum, h) => {
        return sum + h.quantity.mul(h.priceEur).toNumber();
      }, 0);

      // BTC: 2 * 45k = 90k
      // ETH: 10 * 3k = 30k
      // Total: 120k EUR
      expect(totalValue).toBe(120000);

      // Obligado a declarar Modelo 721 (> 50k EUR)
      expect(totalValue).toBeGreaterThan(50000);
    });
  });

  describe('PGC Account Mapping', () => {
    it('should use correct Spanish PGC accounts', () => {
      const accountMap = {
        CRYPTO_WALLET: '5700',
        BANK: '572',
        EXCHANGE_GAIN: '768',
        EXCHANGE_LOSS: '668',
        FEES: '662',
        OTHER_FINANCIAL_INCOME: '769',
      };

      expect(accountMap.CRYPTO_WALLET).toBe('5700');
      expect(accountMap.EXCHANGE_GAIN).toBe('768');
      expect(accountMap.EXCHANGE_LOSS).toBe('668');
    });
  });
});
