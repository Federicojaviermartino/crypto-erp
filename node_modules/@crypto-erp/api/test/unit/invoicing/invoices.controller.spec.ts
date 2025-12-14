import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from '../../../src/modules/invoicing/controllers/invoices.controller.js';
import { InvoicesService } from '../../../src/modules/invoicing/services/invoices.service.js';
import { InvoicePdfService } from '../../../src/modules/invoicing/services/invoice-pdf.service.js';
import { CreateInvoiceDto, QueryInvoicesDto } from '../../../src/modules/invoicing/dto/index.js';
import { Response } from 'express';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Invoices Controller
 * Tests para el controlador de facturas
 *
 * Tests críticos:
 * - Listado de facturas con paginación
 * - Creación de facturas (ventas/compras)
 * - Actualización de borradores
 * - Emisión de facturas con Verifactu
 * - Marcado como pagado/cancelado
 * - Generación de PDF
 * - Eliminación de borradores
 */

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let invoicesService: jest.Mocked<InvoicesService>;
  let pdfService: jest.Mocked<InvoicePdfService>;

  const mockCompanyId = 'company-1';
  const mockUserId = 'user-1';
  const mockUser = { sub: mockUserId, email: 'test@example.com' };
  const mockInvoiceId = 'invoice-1';

  const mockInvoice = {
    id: mockInvoiceId,
    companyId: mockCompanyId,
    type: 'ISSUED' as const,
    seriesId: 'series-1',
    number: 1,
    fullNumber: 'AA-001',
    contactId: 'contact-1',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    subtotal: new Decimal('1000.00'),
    taxAmount: new Decimal('210.00'),
    total: new Decimal('1210.00'),
    status: 'ISSUED' as const,
    lines: [
      {
        id: 'line-1',
        description: 'Product A',
        quantity: new Decimal('10'),
        unitPrice: new Decimal('100'),
        vatRate: new Decimal('21'),
        lineTotal: new Decimal('1210.00'),
      },
    ],
  };

  const mockPaginatedResponse = {
    data: [mockInvoice],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        {
          provide: InvoicesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            getVerifactuQR: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            issue: jest.fn(),
            markAsPaid: jest.fn(),
            cancel: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: InvoicePdfService,
          useValue: {
            generatePdf: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
    invoicesService = module.get(InvoicesService) as jest.Mocked<InvoicesService>;
    pdfService = module.get(InvoicePdfService) as jest.Mocked<InvoicePdfService>;
  });

  describe('findAll', () => {
    it('should return paginated list of invoices', async () => {
      const query: QueryInvoicesDto = { page: 1, pageSize: 10 };
      invoicesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(mockCompanyId, query);

      expect(invoicesService.findAll).toHaveBeenCalledWith(mockCompanyId, query);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should pass filters to service', async () => {
      const query: QueryInvoicesDto = {
        page: 1,
        pageSize: 20,
        status: 'ISSUED',
        contactId: 'contact-1',
      };
      invoicesService.findAll.mockResolvedValue({ ...mockPaginatedResponse, pageSize: 20 });

      await controller.findAll(mockCompanyId, query);

      expect(invoicesService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          status: 'ISSUED',
          contactId: 'contact-1',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return invoice with lines', async () => {
      invoicesService.findById.mockResolvedValue(mockInvoice);

      const result = await controller.findById(mockCompanyId, mockInvoiceId);

      expect(invoicesService.findById).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
      expect(result).toEqual(mockInvoice);
      expect(result.lines).toHaveLength(1);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      invoicesService.findById.mockRejectedValue(new Error('Invoice not found'));

      await expect(controller.findById(mockCompanyId, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('getVerifactuQR', () => {
    it('should return QR code data for invoice', async () => {
      const mockQRData = 'https://prewww.aeat.es/wlpl/TIKE-CONT/ValidarQR?numserie=AA-001&...';
      invoicesService.getVerifactuQR.mockResolvedValue(mockQRData);

      const result = await controller.getVerifactuQR(mockCompanyId, mockInvoiceId);

      expect(invoicesService.getVerifactuQR).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
      expect(result.qrData).toBe(mockQRData);
    });
  });

  describe('createSales', () => {
    it('should create a sales invoice with status ISSUED', async () => {
      const createDto: CreateInvoiceDto = {
        seriesId: 'series-1',
        contactId: 'contact-1',
        issueDate: new Date('2024-01-15'),
        lines: [
          {
            description: 'Product A',
            quantity: 10,
            unitPrice: 100,
            vatRate: 21,
          },
        ],
      };

      invoicesService.create.mockResolvedValue(mockInvoice);

      const result = await controller.createSales(mockCompanyId, mockUser, createDto);

      expect(invoicesService.create).toHaveBeenCalledWith(
        mockCompanyId,
        mockUserId,
        createDto,
        'ISSUED',
      );
      expect(result).toEqual(mockInvoice);
    });
  });

  describe('createPurchase', () => {
    it('should create a purchase invoice with status RECEIVED', async () => {
      const createDto: CreateInvoiceDto = {
        seriesId: 'series-1',
        contactId: 'contact-1',
        issueDate: new Date('2024-01-15'),
        lines: [
          {
            description: 'Service B',
            quantity: 1,
            unitPrice: 500,
            vatRate: 21,
          },
        ],
      };

      const purchaseInvoice = { ...mockInvoice, type: 'RECEIVED' as const };
      invoicesService.create.mockResolvedValue(purchaseInvoice);

      const result = await controller.createPurchase(mockCompanyId, mockUser, createDto);

      expect(invoicesService.create).toHaveBeenCalledWith(
        mockCompanyId,
        mockUserId,
        createDto,
        'RECEIVED',
      );
      expect(result.type).toBe('RECEIVED');
    });
  });

  describe('update', () => {
    it('should update a draft invoice', async () => {
      const updateDto: Partial<CreateInvoiceDto> = {
        lines: [
          {
            description: 'Updated Product',
            quantity: 5,
            unitPrice: 200,
            vatRate: 21,
          },
        ],
      };

      const updatedInvoice = { ...mockInvoice, status: 'DRAFT' as const };
      invoicesService.update.mockResolvedValue(updatedInvoice);

      const result = await controller.update(mockCompanyId, mockInvoiceId, updateDto);

      expect(invoicesService.update).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId, updateDto);
      expect(result).toEqual(updatedInvoice);
    });
  });

  describe('issue', () => {
    it('should issue a draft invoice and register with Verifactu', async () => {
      const issuedInvoice = { ...mockInvoice, status: 'ISSUED' as const };
      invoicesService.issue.mockResolvedValue(issuedInvoice);

      const result = await controller.issue(mockCompanyId, mockInvoiceId);

      expect(invoicesService.issue).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
      expect(result.status).toBe('ISSUED');
    });

    it('should throw error if invoice cannot be issued', async () => {
      invoicesService.issue.mockRejectedValue(new Error('Only draft invoices can be issued'));

      await expect(controller.issue(mockCompanyId, mockInvoiceId)).rejects.toThrow();
    });
  });

  describe('markAsPaid', () => {
    it('should mark an issued invoice as paid', async () => {
      const paidInvoice = { ...mockInvoice, status: 'PAID' as const, paidAt: new Date('2024-01-20') };
      invoicesService.markAsPaid.mockResolvedValue(paidInvoice);

      const result = await controller.markAsPaid(mockCompanyId, mockInvoiceId, {
        paidAt: '2024-01-20',
      });

      expect(invoicesService.markAsPaid).toHaveBeenCalledWith(
        mockCompanyId,
        mockInvoiceId,
        new Date('2024-01-20'),
      );
      expect(result.status).toBe('PAID');
    });

    it('should use current date if paidAt not provided', async () => {
      const paidInvoice = { ...mockInvoice, status: 'PAID' as const };
      invoicesService.markAsPaid.mockResolvedValue(paidInvoice);

      await controller.markAsPaid(mockCompanyId, mockInvoiceId, {});

      expect(invoicesService.markAsPaid).toHaveBeenCalledWith(
        mockCompanyId,
        mockInvoiceId,
        undefined,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel an invoice', async () => {
      const cancelledInvoice = { ...mockInvoice, status: 'CANCELLED' as const };
      invoicesService.cancel.mockResolvedValue(cancelledInvoice);

      const result = await controller.cancel(mockCompanyId, mockInvoiceId);

      expect(invoicesService.cancel).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if Verifactu-registered invoice cannot be cancelled', async () => {
      invoicesService.cancel.mockRejectedValue(
        new Error('Cannot cancel Verifactu-registered invoice'),
      );

      await expect(controller.cancel(mockCompanyId, mockInvoiceId)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a draft invoice', async () => {
      invoicesService.delete.mockResolvedValue(undefined);

      await controller.delete(mockCompanyId, mockInvoiceId);

      expect(invoicesService.delete).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
    });

    it('should throw error if non-draft invoice cannot be deleted', async () => {
      invoicesService.delete.mockRejectedValue(new Error('Only draft invoices can be deleted'));

      await expect(controller.delete(mockCompanyId, mockInvoiceId)).rejects.toThrow();
    });
  });

  describe('downloadPdf', () => {
    it('should generate and download PDF with correct headers', async () => {
      const pdfBuffer = Buffer.from('PDF content');
      pdfService.generatePdf.mockResolvedValue(pdfBuffer);
      invoicesService.findById.mockResolvedValue(mockInvoice);

      const mockResponse = {
        set: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.downloadPdf(mockCompanyId, mockInvoiceId, 'es', mockResponse);

      expect(invoicesService.findById).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
      expect(pdfService.generatePdf).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId, {
        language: 'es',
        includeQR: true,
      });
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="factura-AA-001.pdf"',
        'Content-Length': pdfBuffer.length,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(pdfBuffer);
    });

    it('should support English language', async () => {
      const pdfBuffer = Buffer.from('PDF content');
      pdfService.generatePdf.mockResolvedValue(pdfBuffer);
      invoicesService.findById.mockResolvedValue(mockInvoice);

      const mockResponse = {
        set: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.downloadPdf(mockCompanyId, mockInvoiceId, 'en', mockResponse);

      expect(pdfService.generatePdf).toHaveBeenCalledWith(
        mockCompanyId,
        mockInvoiceId,
        expect.objectContaining({ language: 'en' }),
      );
    });
  });

  describe('previewPdf', () => {
    it('should generate PDF for inline preview', async () => {
      const pdfBuffer = Buffer.from('PDF content');
      pdfService.generatePdf.mockResolvedValue(pdfBuffer);
      invoicesService.findById.mockResolvedValue(mockInvoice);

      const mockResponse = {
        set: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.previewPdf(mockCompanyId, mockInvoiceId, 'es', mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': 'inline; filename="factura-AA-001.pdf"',
        }),
      );
      expect(mockResponse.end).toHaveBeenCalledWith(pdfBuffer);
    });
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have InvoicesService injected', () => {
      expect(invoicesService).toBeDefined();
    });

    it('should have InvoicePdfService injected', () => {
      expect(pdfService).toBeDefined();
    });
  });
});
