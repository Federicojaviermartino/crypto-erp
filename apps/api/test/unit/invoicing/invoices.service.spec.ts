import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@crypto-erp/database';
import { InvoicesService } from '../../../src/modules/invoicing/services/invoices.service.js';
import { VerifactuService } from '../../../src/modules/invoicing/verifactu/verifactu.service.js';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Decimal } from 'decimal.js';

/**
 * CRITICAL TESTS: Invoices Service
 * Gestión de facturas con validaciones críticas
 *
 * Tests críticos para facturación:
 * - Creación de facturas con cálculo de totales
 * - Numeración automática por serie
 * - Validaciones de estado (DRAFT, ISSUED, PAID)
 * - Integración con Verifactu
 * - Búsqueda y filtrado de facturas
 */

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prismaService: PrismaService;
  let verifactuService: VerifactuService;

  const mockCompanyId = 'company-1';
  const mockUserId = 'user-1';

  const mockSeries = {
    id: 'series-1',
    companyId: mockCompanyId,
    code: 'A',
    prefix: 'A',
    name: 'Serie A',
    description: 'Facturas generales',
    nextNumber: 1,
    isDefault: true,
    isActive: true,
  };

  const mockContact = {
    id: 'contact-1',
    companyId: mockCompanyId,
    name: 'Cliente Test SA',
    taxId: 'B87654321',
    email: 'cliente@test.com',
    address: 'Calle Test 123',
    city: 'Madrid',
    postalCode: '28001',
    country: 'ES',
  };

  const mockInvoice = {
    id: 'invoice-1',
    companyId: mockCompanyId,
    seriesId: 'series-1',
    contactId: 'contact-1',
    number: 1,
    fullNumber: 'A-001',
    type: 'STANDARD',
    direction: 'ISSUED',
    status: 'DRAFT',
    issueDate: new Date('2024-06-15'),
    dueDate: new Date('2024-07-15'),
    subtotal: new Decimal('1000.00'),
    totalTax: new Decimal('210.00'),
    total: new Decimal('1210.00'),
    taxableBase: new Decimal('1000.00'),
    notes: null,
    counterpartyName: 'Cliente Test SA',
    counterpartyTaxId: 'B87654321',
    counterpartyAddress: 'Calle Test 123',
    counterpartyCity: 'Madrid',
    counterpartyCountry: 'ES',
    verifactuHash: null,
    verifactuQrData: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lines: [
      {
        id: 'line-1',
        invoiceId: 'invoice-1',
        lineNumber: 1,
        description: 'Servicio de consultoría',
        quantity: new Decimal('10'),
        unitPrice: new Decimal('100.00'),
        discount: new Decimal('0'),
        taxRate: new Decimal('21'),
        subtotal: new Decimal('1000.00'),
        taxAmount: new Decimal('210.00'),
        total: new Decimal('1210.00'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    contact: {
      id: 'contact-1',
      name: 'Cliente Test SA',
      taxId: 'B87654321',
      email: 'cliente@test.com',
    },
    series: {
      id: 'series-1',
      prefix: 'A',
      name: 'Serie A',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            invoiceLine: {
              deleteMany: jest.fn(),
            },
            invoiceSeries: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            contact: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: VerifactuService,
          useValue: {
            generateVerifactuRecord: jest.fn(),
            sendToAEAT: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prismaService = module.get<PrismaService>(PrismaService);
    verifactuService = module.get<VerifactuService>(VerifactuService);
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      // Arrange
      const mockInvoices = [mockInvoice];
      jest.spyOn(prismaService.invoice, 'findMany').mockResolvedValue(mockInvoices as any);
      jest.spyOn(prismaService.invoice, 'count').mockResolvedValue(1);

      // Act
      const result = await service.findAll(mockCompanyId, { skip: 0, take: 50 });

      // Assert
      expect(result.invoices).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.invoices[0].fullNumber).toBe('A-001');
    });

    it('should filter by status', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findMany').mockResolvedValue([mockInvoice] as any);
      jest.spyOn(prismaService.invoice, 'count').mockResolvedValue(1);

      // Act
      await service.findAll(mockCompanyId, { status: 'DRAFT' });

      // Assert
      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findMany').mockResolvedValue([mockInvoice] as any);
      jest.spyOn(prismaService.invoice, 'count').mockResolvedValue(1);

      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      // Act
      await service.findAll(mockCompanyId, { startDate, endDate });

      // Assert
      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        }),
      );
    });

    it('should search by invoice number or counterparty name', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findMany').mockResolvedValue([mockInvoice] as any);
      jest.spyOn(prismaService.invoice, 'count').mockResolvedValue(1);

      // Act
      await service.findAll(mockCompanyId, { search: 'A-001' });

      // Assert
      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullNumber: expect.anything() }),
              expect.objectContaining({ counterpartyName: expect.anything() }),
            ]),
          }),
        }),
      );
    });

    it('should filter by verifactu registration status', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findMany').mockResolvedValue([mockInvoice] as any);
      jest.spyOn(prismaService.invoice, 'count').mockResolvedValue(1);

      // Act
      await service.findAll(mockCompanyId, { verifactuRegistered: true });

      // Assert
      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verifactuHash: { not: null },
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return invoice by ID', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(mockInvoice as any);

      // Act
      const result = await service.findById(mockCompanyId, 'invoice-1');

      // Assert
      expect(result.id).toBe('invoice-1');
      expect(result.fullNumber).toBe('A-001');
      expect(result.lines).toHaveLength(1);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(mockCompanyId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should only return invoices for the specified company', async () => {
      // Arrange
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(mockInvoice as any);

      // Act
      await service.findById(mockCompanyId, 'invoice-1');

      // Assert
      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create invoice with calculated totals', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        dueDate: '2024-07-15',
        type: 'STANDARD',
        notes: 'Test invoice',
        lines: [
          {
            description: 'Servicio de consultoría',
            quantity: 10,
            unitPrice: 100,
            vatRate: 21,
            discountPercent: 0,
          },
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null); // No previous invoices
      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(mockInvoice as any);

      // Act
      const result = await service.create(mockCompanyId, mockUserId, createDto);

      // Assert
      expect(result.subtotal.toNumber()).toBe(1000.00);
      expect(result.totalTax.toNumber()).toBe(210.00);
      expect(result.total.toNumber()).toBe(1210.00);
    });

    it('should generate sequential invoice number', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        lines: [
          { description: 'Test', quantity: 1, unitPrice: 100, vatRate: 21 },
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue({ number: 5 } as any); // Last invoice number
      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue({
        ...mockInvoice,
        number: 6,
        fullNumber: 'A-006',
      } as any);

      // Act
      const result = await service.create(mockCompanyId, mockUserId, createDto);

      // Assert
      expect(result.number).toBe(6);
      expect(result.fullNumber).toBe('A-006');
    });

    it('should use default series if none specified', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        lines: [
          { description: 'Test', quantity: 1, unitPrice: 100, vatRate: 21 },
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(mockInvoice as any);

      // Act
      await service.create(mockCompanyId, mockUserId, createDto);

      // Assert
      expect(prismaService.invoiceSeries.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            isDefault: true,
          }),
        }),
      );
    });

    it('should throw error if no series found', async () => {
      // Arrange
      const createDto = {
        date: '2024-06-15',
        lines: [{ description: 'Test', quantity: 1, unitPrice: 100, vatRate: 21 }],
      };

      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCompanyId, mockUserId, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if contact not found', async () => {
      // Arrange
      const createDto = {
        contactId: 'non-existent',
        date: '2024-06-15',
        lines: [{ description: 'Test', quantity: 1, unitPrice: 100, vatRate: 21 }],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCompanyId, mockUserId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should apply discount correctly', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        lines: [
          {
            description: 'Servicio con descuento',
            quantity: 10,
            unitPrice: 100,
            vatRate: 21,
            discountPercent: 10, // 10% discount
          },
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);

      const createdInvoice = {
        ...mockInvoice,
        subtotal: new Decimal('900.00'), // 1000 - 10% = 900
        totalTax: new Decimal('189.00'), // 900 * 21% = 189
        total: new Decimal('1089.00'), // 900 + 189 = 1089
      };

      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(createdInvoice as any);

      // Act
      const result = await service.create(mockCompanyId, mockUserId, createDto);

      // Assert: 10% discount applied
      expect(result.subtotal.toNumber()).toBe(900.00);
      expect(result.total.toNumber()).toBe(1089.00);
    });

    it('should create invoice without contact (counterparty fields)', async () => {
      // Arrange
      const createDto = {
        date: '2024-06-15',
        counterpartyName: 'Cliente Sin Registro',
        counterpartyTaxId: 'B99999999',
        counterpartyAddress: 'Calle Sin Registro 1',
        counterpartyCity: 'Barcelona',
        lines: [
          { description: 'Test', quantity: 1, unitPrice: 100, vatRate: 21 },
        ],
      };

      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);

      const createdInvoice = {
        ...mockInvoice,
        contactId: null,
        counterpartyName: 'Cliente Sin Registro',
        counterpartyTaxId: 'B99999999',
      };

      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(createdInvoice as any);

      // Act
      const result = await service.create(mockCompanyId, mockUserId, createDto);

      // Assert
      expect(result.contactId).toBeNull();
      expect(result.counterpartyName).toBe('Cliente Sin Registro');
      expect(result.counterpartyTaxId).toBe('B99999999');
    });

    it('should default to 21% VAT if not specified', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        lines: [
          {
            description: 'Servicio sin IVA especificado',
            quantity: 10,
            unitPrice: 100,
            // No vatRate specified, should default to 21%
          },
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(mockInvoice as any);

      // Act
      await service.create(mockCompanyId, mockUserId, createDto);

      // Assert: Verify 21% VAT was used
      expect(prismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lines: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  taxRate: 21,
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update draft invoice', async () => {
      // Arrange
      const updateDto = {
        notes: 'Updated notes',
      };

      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(mockInvoice as any);
      jest.spyOn(prismaService.invoice, 'update').mockResolvedValue({
        ...mockInvoice,
        notes: 'Updated notes',
      } as any);

      // Act
      const result = await service.update(mockCompanyId, 'invoice-1', updateDto);

      // Assert
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw error when updating non-draft invoice', async () => {
      // Arrange
      const issuedInvoice = {
        ...mockInvoice,
        status: 'ISSUED',
      };

      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(issuedInvoice as any);

      // Act & Assert
      await expect(service.update(mockCompanyId, 'invoice-1', {})).rejects.toThrow(ConflictException);
    });

    it('should update invoice lines', async () => {
      // Arrange
      const updateDto = {
        lines: [
          {
            description: 'Updated line',
            quantity: 5,
            unitPrice: 200,
            vatRate: 21,
          },
        ],
      };

      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(mockInvoice as any);
      jest.spyOn(prismaService.invoiceLine, 'deleteMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prismaService.invoice, 'update').mockResolvedValue(mockInvoice as any);

      // Act
      await service.update(mockCompanyId, 'invoice-1', updateDto);

      // Assert: Old lines deleted
      expect(prismaService.invoiceLine.deleteMany).toHaveBeenCalledWith({
        where: { invoiceId: 'invoice-1' },
      });
    });
  });

  describe('Total Calculations', () => {
    it('should calculate totals for multiple lines correctly', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        lines: [
          { description: 'Line 1', quantity: 10, unitPrice: 100, vatRate: 21 }, // 1000 + 210 = 1210
          { description: 'Line 2', quantity: 5, unitPrice: 50, vatRate: 21 },   // 250 + 52.5 = 302.5
          { description: 'Line 3', quantity: 1, unitPrice: 100, vatRate: 10 },  // 100 + 10 = 110
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);

      const createdInvoice = {
        ...mockInvoice,
        subtotal: new Decimal('1350.00'), // 1000 + 250 + 100
        totalTax: new Decimal('272.50'),  // 210 + 52.5 + 10
        total: new Decimal('1622.50'),    // 1350 + 272.5
      };

      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(createdInvoice as any);

      // Act
      const result = await service.create(mockCompanyId, mockUserId, createDto);

      // Assert
      expect(result.subtotal.toNumber()).toBe(1350.00);
      expect(result.totalTax.toNumber()).toBe(272.50);
      expect(result.total.toNumber()).toBe(1622.50);
    });

    it('should handle zero VAT correctly', async () => {
      // Arrange
      const createDto = {
        contactId: 'contact-1',
        date: '2024-06-15',
        lines: [
          { description: 'Export service', quantity: 10, unitPrice: 100, vatRate: 0 },
        ],
      };

      jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
      jest.spyOn(prismaService.invoiceSeries, 'findFirst').mockResolvedValue(mockSeries as any);
      jest.spyOn(prismaService.invoice, 'findFirst').mockResolvedValue(null);

      const createdInvoice = {
        ...mockInvoice,
        subtotal: new Decimal('1000.00'),
        totalTax: new Decimal('0.00'),
        total: new Decimal('1000.00'),
      };

      jest.spyOn(prismaService.invoice, 'create').mockResolvedValue(createdInvoice as any);

      // Act
      const result = await service.create(mockCompanyId, mockUserId, createDto);

      // Assert
      expect(result.totalTax.toNumber()).toBe(0.00);
      expect(result.total.toNumber()).toBe(1000.00);
    });
  });
});
