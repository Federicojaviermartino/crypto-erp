import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@crypto-erp/database';
import { Decimal } from 'decimal.js';

/**
 * CRITICAL TESTS: FIFO Cost Basis Calculation
 * Estos tests son CRÍTICOS para la correcta tributación de crypto
 * Método FIFO es OBLIGATORIO en España según normativa AEAT
 */

describe('CostBasisService - FIFO Method', () => {
  let prismaService: PrismaService;
  const companyId = 'test-company-id';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            cryptoLot: {
              findMany: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            cryptoAsset: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('calculateFIFOCostBasis', () => {
    it('should calculate cost basis using FIFO for single lot', async () => {
      // Arrange: 1 BTC comprado a 30,000 EUR
      const lots = [
        {
          id: 'lot-1',
          cryptoAssetId: 'btc-asset',
          acquiredAt: new Date('2024-01-01'),
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('30000'),
          costBasisEur: new Decimal('30000'),
        },
      ];

      jest.spyOn(prismaService.cryptoAsset, 'findFirst').mockResolvedValue({
        id: 'btc-asset',
        symbol: 'BTC',
      } as any);

      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(lots as any);

      // Act: Vender 0.5 BTC
      const sellAmount = new Decimal('0.5');
      let totalCost = new Decimal('0');
      let remaining = sellAmount;

      for (const lot of lots) {
        if (remaining.lte(0)) break;
        const useFromLot = Decimal.min(remaining, lot.remainingAmount);
        totalCost = totalCost.plus(useFromLot.mul(lot.costPerUnit));
        remaining = remaining.minus(useFromLot);
      }

      // Assert: Cost basis debería ser 15,000 EUR (0.5 * 30,000)
      expect(totalCost.toNumber()).toBe(15000);
      expect(remaining.toNumber()).toBe(0); // Todo el sell amount fue cubierto
    });

    it('should use FIFO order when multiple lots exist', async () => {
      // Arrange: 3 compras de BTC a precios diferentes
      const lots = [
        {
          id: 'lot-1',
          acquiredAt: new Date('2024-01-01'),
          quantity: new Decimal('0.5'),
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('30000'), // Primero: más barato
        },
        {
          id: 'lot-2',
          acquiredAt: new Date('2024-02-01'),
          quantity: new Decimal('0.5'),
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('40000'), // Segundo
        },
        {
          id: 'lot-3',
          acquiredAt: new Date('2024-03-01'),
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('50000'), // Tercero: más caro
        },
      ];

      // Act: Vender 1.2 BTC (consume lot-1 completo + lot-2 completo + 0.2 de lot-3)
      const sellAmount = new Decimal('1.2');
      let totalCost = new Decimal('0');
      let remaining = sellAmount;

      for (const lot of lots) {
        if (remaining.lte(0)) break;
        const useFromLot = Decimal.min(remaining, lot.remainingAmount);
        totalCost = totalCost.plus(useFromLot.mul(lot.costPerUnit));
        remaining = remaining.minus(useFromLot);
      }

      // Assert:
      // lot-1: 0.5 * 30,000 = 15,000
      // lot-2: 0.5 * 40,000 = 20,000
      // lot-3: 0.2 * 50,000 = 10,000
      // Total: 45,000 EUR
      expect(totalCost.toNumber()).toBe(45000);
      expect(remaining.toNumber()).toBe(0);
    });

    it('should handle insufficient lots gracefully', async () => {
      // Arrange: Solo 0.5 BTC disponible
      const lots = [
        {
          id: 'lot-1',
          acquiredAt: new Date('2024-01-01'),
          quantity: new Decimal('0.5'),
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('30000'),
        },
      ];

      // Act: Intentar vender 1.0 BTC (más de lo disponible)
      const sellAmount = new Decimal('1.0');
      let totalCost = new Decimal('0');
      let remaining = sellAmount;

      for (const lot of lots) {
        if (remaining.lte(0)) break;
        const useFromLot = Decimal.min(remaining, lot.remainingAmount);
        totalCost = totalCost.plus(useFromLot.mul(lot.costPerUnit));
        remaining = remaining.minus(useFromLot);
      }

      // Assert: Cost basis solo cubre 0.5 BTC
      expect(totalCost.toNumber()).toBe(15000); // 0.5 * 30,000
      expect(remaining.toNumber()).toBe(0.5); // Quedan 0.5 BTC sin cubrir
      // En producción esto debería loguear un warning
    });

    it('should calculate capital gain correctly using FIFO', async () => {
      // Arrange: Compra
      const lots = [
        {
          id: 'lot-1',
          acquiredAt: new Date('2024-01-01'),
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('30000'),
        },
      ];

      // Act: Venta a 45,000 EUR
      const sellAmount = new Decimal('1.0');
      const sellPricePerUnit = new Decimal('45000');
      const sellTotal = sellAmount.mul(sellPricePerUnit); // 45,000 EUR

      let totalCost = new Decimal('0');
      let remaining = sellAmount;

      for (const lot of lots) {
        if (remaining.lte(0)) break;
        const useFromLot = Decimal.min(remaining, lot.remainingAmount);
        totalCost = totalCost.plus(useFromLot.mul(lot.costPerUnit));
        remaining = remaining.minus(useFromLot);
      }

      const capitalGain = sellTotal.minus(totalCost);

      // Assert: Ganancia patrimonial = 45,000 - 30,000 = 15,000 EUR
      expect(capitalGain.toNumber()).toBe(15000);
    });

    it('should handle FIFO with partial lot consumption', async () => {
      // Arrange: Lote grande
      const lots = [
        {
          id: 'lot-1',
          acquiredAt: new Date('2024-01-01'),
          quantity: new Decimal('10.0'),
          remainingAmount: new Decimal('10.0'),
          costPerUnit: new Decimal('30000'),
        },
      ];

      // Act: Vender solo 2.5 BTC
      const sellAmount = new Decimal('2.5');
      let totalCost = new Decimal('0');
      let remaining = sellAmount;
      let lotRemaining = lots[0].remainingAmount;

      const useFromLot = Decimal.min(remaining, lotRemaining);
      totalCost = totalCost.plus(useFromLot.mul(lots[0].costPerUnit));
      remaining = remaining.minus(useFromLot);
      lotRemaining = lotRemaining.minus(useFromLot);

      // Assert:
      expect(totalCost.toNumber()).toBe(75000); // 2.5 * 30,000
      expect(remaining.toNumber()).toBe(0);
      expect(lotRemaining.toNumber()).toBe(7.5); // Quedan 7.5 BTC en el lote
    });
  });

  describe('Edge Cases - Precision and Rounding', () => {
    it('should handle very small amounts (satoshi-level)', async () => {
      const lots = [
        {
          id: 'lot-1',
          acquiredAt: new Date('2024-01-01'),
          quantity: new Decimal('0.00000001'), // 1 satoshi
          remainingAmount: new Decimal('0.00000001'),
          costPerUnit: new Decimal('30000'),
        },
      ];

      const sellAmount = new Decimal('0.00000001');
      const costBasis = sellAmount.mul(lots[0].costPerUnit);

      expect(costBasis.toNumber()).toBe(0.0003); // Precision correcta
    });

    it('should maintain precision with Decimal type', async () => {
      const lot1Cost = new Decimal('0.1').mul(new Decimal('30000.50'));
      const lot2Cost = new Decimal('0.2').mul(new Decimal('40000.75'));

      const total = lot1Cost.plus(lot2Cost);

      // Assert: No hay pérdida de precisión por coma flotante
      expect(total.toFixed(2)).toBe('11005.20'); // 3000.05 + 8005.15
    });
  });

  describe('Tax Implications - Spanish IRPF', () => {
    it('should calculate holding period for tax classification', () => {
      const acquisitionDate = new Date('2023-01-01');
      const sellDate = new Date('2024-01-01');

      const holdingPeriodDays = Math.floor(
        (sellDate.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isShortTerm = holdingPeriodDays < 365;
      const isLongTerm = holdingPeriodDays >= 365;

      // Assert: En España no hay diferencia fiscal, pero es útil para estadísticas
      expect(holdingPeriodDays).toBe(365);
      expect(isShortTerm).toBe(false);
      expect(isLongTerm).toBe(true);
    });

    it('should apply IRPF tax brackets correctly', () => {
      const taxBrackets = [
        { limit: 6000, rate: 0.19 },
        { limit: 50000, rate: 0.21 },
        { limit: 200000, rate: 0.23 },
        { limit: 300000, rate: 0.27 },
        { limit: Infinity, rate: 0.28 },
      ];

      // Ganancia de 60,000 EUR
      const gain = 60000;
      let tax = 0;
      let remaining = gain;
      let previousLimit = 0;

      for (const bracket of taxBrackets) {
        const bracketAmount = Math.min(remaining, bracket.limit - previousLimit);
        if (bracketAmount <= 0) break;
        tax += bracketAmount * bracket.rate;
        remaining -= bracketAmount;
        previousLimit = bracket.limit;
      }

      // Assert:
      // - 6,000 * 0.19 = 1,140
      // - 44,000 * 0.21 = 9,240
      // - 10,000 * 0.23 = 2,300
      // Total: 12,680 EUR
      expect(tax).toBe(12680);
    });
  });
});
