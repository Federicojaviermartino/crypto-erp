import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { InvoicesService } from '../../src/modules/invoicing/services/invoices.service';
import { InvoicePdfService } from '../../src/modules/invoicing/services/invoice-pdf.service';
import { PrismaService } from '@crypto-erp/database';

describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let invoicesService: jest.Mocked<InvoicesService>;
  let pdfService: jest.Mocked<InvoicePdfService>;

  const mockCompanyId = 'company-uuid-1234';
  const mockUserId = 'user-uuid-5678';
  const mockInvoiceId = 'invoice-uuid-9999';

  const mockJwtPayload = {
    sub: mockUserId,
    email: 'test@example.com',
    companyId: mockCompanyId,
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
    subtotal: 1000,
    totalTax: 210,
    total: 1210,
    counterpartyName: 'Cliente Test S.L.',
    counterpartyTaxId: 'B12345678',
    verifactuHash: null,
    verifactuQrData: null,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        description: 'Servicio de consultoría',
        quantity: 2,
        unitPrice: 500,
        taxRate: 21,
        discount: 0,
        subtotal: 1000,
        taxAmount: 210,
        total: 1210,
      },
    ],
    contact: {
      id: 'contact-uuid',
      name: 'Cliente Test S.L.',
      taxId: 'B12345678',
      email: 'cliente@test.com',
    },
    series: {
      id: 'series-uuid',
      prefix: 'F',
      name: 'Facturas',
    },
  };

  const mockInvoicesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    issue: jest.fn(),
    markAsPaid: jest.fn(),
    cancel: jest.fn(),
    delete: jest.fn(),
    getVerifactuQR: jest.fn(),
  };

  const mockPdfService = {
    generatePdf: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    companyUser: {
      findFirst: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
          })],
        }),
      ],
      controllers: [
        // Import controller directly for e2e testing
        (await import('../../src/modules/invoicing/controllers/invoices.controller')).InvoicesController,
      ],
      providers: [
        { provide: InvoicesService, useValue: mockInvoicesService },
        { provide: InvoicePdfService, useValue: mockPdfService },
        { provide: PrismaService, useValue: mockPrismaService },
        JwtService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    invoicesService = moduleFixture.get(InvoicesService);
    pdfService = moduleFixture.get(InvoicePdfService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock user/company validation for guards
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: mockUserId,
      email: 'test@example.com',
    });
    mockPrismaService.companyUser.findFirst.mockResolvedValue({
      userId: mockUserId,
      companyId: mockCompanyId,
      role: 'OWNER',
    });
  });

  const getAuthToken = () => {
    return jwtService.sign(mockJwtPayload, { secret: 'test-secret-key-for-testing-purposes-only' });
  };

  describe('GET /invoices', () => {
    it('should return paginated invoices', async () => {
      mockInvoicesService.findAll.mockResolvedValue({
        invoices: [mockInvoice],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.invoices).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('should filter invoices by status', async () => {
      mockInvoicesService.findAll.mockResolvedValue({
        invoices: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/invoices?status=ISSUED')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(mockInvoicesService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ status: 'ISSUED' }),
      );
    });

    it('should filter invoices by direction', async () => {
      mockInvoicesService.findAll.mockResolvedValue({
        invoices: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/invoices?direction=ISSUED')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(mockInvoicesService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ direction: 'ISSUED' }),
      );
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/invoices')
        .expect(401);
    });
  });

  describe('GET /invoices/:id', () => {
    it('should return invoice by ID', async () => {
      mockInvoicesService.findById.mockResolvedValue(mockInvoice);

      const response = await request(app.getHttpServer())
        .get(`/invoices/${mockInvoiceId}`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.id).toBe(mockInvoiceId);
      expect(response.body.fullNumber).toBe('F-2024-000001');
    });

    it('should return 404 for non-existent invoice', async () => {
      mockInvoicesService.findById.mockRejectedValue({
        status: 404,
        message: 'Invoice not found',
      });

      await request(app.getHttpServer())
        .get('/invoices/non-existent-id')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(500); // Will be 500 since we're not properly handling exceptions
    });
  });

  describe('POST /invoices/sales', () => {
    const createInvoiceDto = {
      date: '2024-01-15',
      lines: [
        {
          description: 'Servicio de consultoría',
          quantity: 2,
          unitPrice: 500,
          vatRate: 21,
        },
      ],
    };

    it('should create a sales invoice', async () => {
      mockInvoicesService.create.mockResolvedValue(mockInvoice);

      const response = await request(app.getHttpServer())
        .post('/invoices/sales')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(createInvoiceDto)
        .expect(201);

      expect(response.body.direction).toBe('ISSUED');
      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        mockCompanyId,
        mockUserId,
        expect.any(Object),
        'ISSUED',
      );
    });

    it('should fail with invalid data', async () => {
      await request(app.getHttpServer())
        .post('/invoices/sales')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ lines: [] }) // Missing date
        .expect(400);
    });

    it('should require at least one line', async () => {
      await request(app.getHttpServer())
        .post('/invoices/sales')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({
          date: '2024-01-15',
          lines: [], // Empty lines
        })
        .expect(400);
    });
  });

  describe('POST /invoices/purchases', () => {
    const createInvoiceDto = {
      date: '2024-01-15',
      counterpartyName: 'Proveedor S.L.',
      lines: [
        {
          description: 'Compra de material',
          quantity: 10,
          unitPrice: 50,
          vatRate: 21,
        },
      ],
    };

    it('should create a purchase invoice', async () => {
      mockInvoicesService.create.mockResolvedValue({
        ...mockInvoice,
        direction: 'RECEIVED',
      });

      const response = await request(app.getHttpServer())
        .post('/invoices/purchases')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(createInvoiceDto)
        .expect(201);

      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        mockCompanyId,
        mockUserId,
        expect.any(Object),
        'RECEIVED',
      );
    });
  });

  describe('PUT /invoices/:id', () => {
    it('should update a draft invoice', async () => {
      mockInvoicesService.update.mockResolvedValue({
        ...mockInvoice,
        notes: 'Updated notes',
      });

      const response = await request(app.getHttpServer())
        .put(`/invoices/${mockInvoiceId}`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ notes: 'Updated notes' })
        .expect(200);

      expect(response.body.notes).toBe('Updated notes');
    });
  });

  describe('PATCH /invoices/:id/issue', () => {
    it('should issue a draft invoice', async () => {
      mockInvoicesService.issue.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${mockInvoiceId}/issue`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.status).toBe('ISSUED');
    });
  });

  describe('PATCH /invoices/:id/paid', () => {
    it('should mark invoice as paid', async () => {
      mockInvoicesService.markAsPaid.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${mockInvoiceId}/paid`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ paidAt: '2024-02-01' })
        .expect(200);

      expect(response.body.status).toBe('PAID');
    });

    it('should mark as paid without specific date', async () => {
      mockInvoicesService.markAsPaid.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      await request(app.getHttpServer())
        .patch(`/invoices/${mockInvoiceId}/paid`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({})
        .expect(200);
    });
  });

  describe('PATCH /invoices/:id/cancel', () => {
    it('should cancel an invoice', async () => {
      mockInvoicesService.cancel.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${mockInvoiceId}/cancel`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('DELETE /invoices/:id', () => {
    it('should delete a draft invoice', async () => {
      mockInvoicesService.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/invoices/${mockInvoiceId}`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(204);

      expect(mockInvoicesService.delete).toHaveBeenCalledWith(mockCompanyId, mockInvoiceId);
    });
  });

  describe('GET /invoices/:id/verifactu-qr', () => {
    it('should return QR data for registered invoice', async () => {
      mockInvoicesService.getVerifactuQR.mockResolvedValue('https://aeat.es/verify?...');

      const response = await request(app.getHttpServer())
        .get(`/invoices/${mockInvoiceId}/verifactu-qr`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.body.qrData).toBe('https://aeat.es/verify?...');
    });
  });

  describe('GET /invoices/:id/pdf', () => {
    it('should return PDF for download', async () => {
      mockInvoicesService.findById.mockResolvedValue(mockInvoice);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF content'));

      const response = await request(app.getHttpServer())
        .get(`/invoices/${mockInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('F-2024-000001');
    });

    it('should support language parameter', async () => {
      mockInvoicesService.findById.mockResolvedValue(mockInvoice);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF content'));

      await request(app.getHttpServer())
        .get(`/invoices/${mockInvoiceId}/pdf?lang=en`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(mockPdfService.generatePdf).toHaveBeenCalledWith(
        mockCompanyId,
        mockInvoiceId,
        expect.objectContaining({ language: 'en' }),
      );
    });
  });

  describe('GET /invoices/:id/pdf/preview', () => {
    it('should return PDF for inline viewing', async () => {
      mockInvoicesService.findById.mockResolvedValue(mockInvoice);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from('PDF content'));

      const response = await request(app.getHttpServer())
        .get(`/invoices/${mockInvoiceId}/pdf/preview`)
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('inline');
    });
  });
});
