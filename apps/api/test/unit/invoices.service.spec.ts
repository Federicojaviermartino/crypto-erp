import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from '../../src/modules/invoicing/services/invoices.service';
import { VerifactuService } from '../../src/modules/invoicing/verifactu/verifactu.service';
import { PrismaService } from '@crypto-erp/database';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

// Mock types
type MockPrismaService = {
  invoice: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  invoiceLine: {
    deleteMany: jest.Mock;
  };
  invoiceSeries: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  contact: {
    findFirst: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockVerifactuService = {
  generateVerifactuRecord: jest.Mock;
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prismaService: MockPrismaService;
  let verifactuService: MockVerifactuService;

  const mockCompanyId = 'company-uuid-1234';
  const mockUserId = 'user-uuid-5678';
  const mockInvoiceId = 'invoice-uuid-9999';

  const mockSeries = {
    id: 'series-uuid',
    companyId: mockCompanyId,
    code: 'F',
    prefix: 'F',
    name: 'Facturas',
    nextNumber: 1,
    digitCount: 6,
    isDefault: true,
  };

  const mockContact = {
    id: 'contact-uuid',
    companyId: mockCompanyId,
    name: 'Cliente Test S.L.',
    taxId: 'B12345678',
    email: 'cliente@test.com',
    address: 'Calle Test 123',
    city: 'Madrid',
    country: 'ES',
  };

  const mockInvoice = {
    id: mockInvoiceId,
    companyId: mockCompanyId,
    number: 1,
    fullNumber: 'F-2024-000001',
    type: 'STANDARD',
    direction: 'ISSUED',
    status: 'DRAFT',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    subtotal: { toNumber: () => 1000 },
    totalTax: { toNumber: () => 210 },
    total: { toNumber: () => 1210 },
    taxableBase: { toNumber: () => 1000 },
    counterpartyName: 'Cliente Test S.L.',
    counterpartyTaxId: 'B12345678',
    verifactuHash: null,
    verifactuQrData: null,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        description: 'Servicio de consultoría',
        quantity: { toNumber: () => 2 },
        unitPrice: { toNumber: () => 500 },
        taxRate: { toNumber: () => 21 },
        discount: { toNumber: () => 0 },
        subtotal: { toNumber: () => 1000 },
        taxAmount: { toNumber: () => 210 },
        total: { toNumber: () => 1210 },
      },
    ],
    contact: mockContact,
    series: mockSeries,
  };

  beforeEach(async () => {
    prismaService = {
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
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      contact: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    verifactuService = {
      generateVerifactuRecord: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prismaService },
        { provide: VerifactuService, useValue: verifactuService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      const invoices = [mockInvoice];
      prismaService.invoice.findMany.mockResolvedValue(invoices);
      prismaService.invoice.count.mockResolvedValue(1);

      const result = await service.findAll(mockCompanyId, { take: 50, skip: 0 });

      expect(result.invoices).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId },
          include: expect.objectContaining({
            lines: true,
            contact: expect.any(Object),
            series: expect.any(Object),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      prismaService.invoice.findMany.mockResolvedValue([]);
      prismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { status: 'DRAFT' as any });

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should filter by direction', async () => {
      prismaService.invoice.findMany.mockResolvedValue([]);
      prismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { direction: 'ISSUED' as any });

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            direction: 'ISSUED',
          }),
        }),
      );
    });

    it('should filter by verifactu registration status', async () => {
      prismaService.invoice.findMany.mockResolvedValue([]);
      prismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { verifactuRegistered: true });

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verifactuHash: { not: null },
          }),
        }),
      );
    });

    it('should search by fullNumber or counterpartyName', async () => {
      prismaService.invoice.findMany.mockResolvedValue([]);
      prismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { search: 'test' });

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullNumber: expect.any(Object) }),
              expect.objectContaining({ counterpartyName: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return invoice by id', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.findById(mockCompanyId, mockInvoiceId);

      expect(result.id).toBe(mockInvoiceId);
      expect(prismaService.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockInvoiceId, companyId: mockCompanyId },
        }),
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      contactId: 'contact-uuid',
      date: '2024-01-15',
      dueDate: '2024-02-15',
      notes: 'Test invoice',
      lines: [
        {
          description: 'Servicio de consultoría',
          quantity: 2,
          unitPrice: 500,
          vatRate: 21,
          discountPercent: 0,
        },
      ],
    };

    beforeEach(() => {
      prismaService.contact.findFirst.mockResolvedValue(mockContact);
      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoiceSeries.findUnique.mockResolvedValue(mockSeries);
      prismaService.invoiceSeries.update.mockResolvedValue({ ...mockSeries, nextNumber: 2 });
      prismaService.invoice.create.mockResolvedValue(mockInvoice);
    });

    it('should create a new invoice with lines', async () => {
      const result = await service.create(mockCompanyId, mockUserId, createDto, 'ISSUED');

      expect(result).toBeDefined();
      expect(prismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            direction: 'ISSUED',
            status: 'DRAFT',
            lines: expect.objectContaining({
              create: expect.any(Array),
            }),
          }),
        }),
      );
    });

    it('should generate invoice number from series', async () => {
      await service.create(mockCompanyId, mockUserId, createDto, 'ISSUED');

      expect(prismaService.invoiceSeries.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSeries.id },
          data: { nextNumber: 2 },
        }),
      );
    });

    it('should throw BadRequestException if no series found', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockCompanyId, mockUserId, createDto, 'ISSUED'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if contact not found', async () => {
      prismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockCompanyId, mockUserId, createDto, 'ISSUED'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate totals correctly', async () => {
      await service.create(mockCompanyId, mockUserId, createDto, 'ISSUED');

      expect(prismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 1000, // 2 * 500
            totalTax: 210, // 1000 * 0.21
            total: 1210, // 1000 + 210
          }),
        }),
      );
    });

    it('should handle discount in line totals', async () => {
      const dtoWithDiscount = {
        ...createDto,
        lines: [
          {
            description: 'Servicio con descuento',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 21,
            discountPercent: 10,
          },
        ],
      };

      await service.create(mockCompanyId, mockUserId, dtoWithDiscount, 'ISSUED');

      expect(prismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 900, // 1000 - 10%
            totalTax: 189, // 900 * 0.21
            total: 1089, // 900 + 189
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a draft invoice', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      prismaService.invoice.update.mockResolvedValue(mockInvoice);

      await service.update(mockCompanyId, mockInvoiceId, { notes: 'Updated notes' });

      expect(prismaService.invoice.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if invoice is not draft', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      await expect(
        service.update(mockCompanyId, mockInvoiceId, { notes: 'test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update lines if provided', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      prismaService.invoiceLine.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.invoice.update.mockResolvedValue(mockInvoice);

      const newLines = [
        {
          description: 'New line',
          quantity: 1,
          unitPrice: 100,
          vatRate: 21,
        },
      ];

      await service.update(mockCompanyId, mockInvoiceId, { lines: newLines });

      expect(prismaService.invoiceLine.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { invoiceId: mockInvoiceId },
        }),
      );
    });
  });

  describe('issue', () => {
    it('should issue a draft invoice', async () => {
      // First call returns DRAFT, second call returns ISSUED (after update)
      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice)
        .mockResolvedValueOnce({ ...mockInvoice, status: 'ISSUED' });
      prismaService.invoice.update.mockResolvedValue({ ...mockInvoice, status: 'ISSUED' });
      verifactuService.generateVerifactuRecord.mockResolvedValue({
        huella: 'HASH123',
        codigoQR: 'https://qr.url',
      });

      const result = await service.issue(mockCompanyId, mockInvoiceId);

      expect(result.status).toBe('ISSUED');
      expect(prismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ISSUED' },
        }),
      );
    });

    it('should throw ConflictException if invoice is not draft', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      await expect(service.issue(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should register with Verifactu for ISSUED direction', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      prismaService.invoice.update.mockResolvedValue({ ...mockInvoice, status: 'ISSUED' });
      verifactuService.generateVerifactuRecord.mockResolvedValue({
        huella: 'HASH123',
      });

      await service.issue(mockCompanyId, mockInvoiceId);

      expect(verifactuService.generateVerifactuRecord).toHaveBeenCalledWith(
        mockCompanyId,
        mockInvoiceId,
      );
    });

    it('should skip Verifactu for RECEIVED direction', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        direction: 'RECEIVED',
      });
      prismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        direction: 'RECEIVED',
        status: 'ISSUED',
      });

      await service.issue(mockCompanyId, mockInvoiceId);

      expect(verifactuService.generateVerifactuRecord).not.toHaveBeenCalled();
    });
  });

  describe('markAsPaid', () => {
    it('should mark an issued invoice as paid', async () => {
      // First call returns ISSUED, second call returns PAID (after update)
      prismaService.invoice.findFirst
        .mockResolvedValueOnce({ ...mockInvoice, status: 'ISSUED' })
        .mockResolvedValueOnce({ ...mockInvoice, status: 'PAID' });
      prismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      const result = await service.markAsPaid(mockCompanyId, mockInvoiceId);

      expect(result.status).toBe('PAID');
      expect(prismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw ConflictException if invoice is draft', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice);

      await expect(service.markAsPaid(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should accept custom paidAt date', async () => {
      const customDate = new Date('2024-02-01');
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });
      prismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        paidAt: customDate,
      });

      await service.markAsPaid(mockCompanyId, mockInvoiceId, customDate);

      expect(prismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidAt: customDate,
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a draft invoice', async () => {
      // First call returns DRAFT, second call returns CANCELLED (after update)
      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice)
        .mockResolvedValueOnce({ ...mockInvoice, status: 'CANCELLED' });
      prismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const result = await service.cancel(mockCompanyId, mockInvoiceId);

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ConflictException if already cancelled', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      await expect(service.cancel(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if Verifactu registered', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
        verifactuHash: 'HASH123',
      });

      await expect(service.cancel(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a draft invoice', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      prismaService.$transaction.mockResolvedValue([]);

      await service.delete(mockCompanyId, mockInvoiceId);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException if invoice is not draft', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      await expect(service.delete(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getVerifactuQR', () => {
    it('should return QR data for registered invoice', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        verifactuQrData: 'https://qr.aeat.es/verify?id=123',
      });

      const result = await service.getVerifactuQR(mockCompanyId, mockInvoiceId);

      expect(result).toBe('https://qr.aeat.es/verify?id=123');
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getVerifactuQR(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if no Verifactu data', async () => {
      prismaService.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        verifactuQrData: null,
      });

      await expect(service.getVerifactuQR(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
