import { Test, TestingModule } from '@nestjs/testing';
import { VerifactuService } from '../../src/modules/invoicing/verifactu/verifactu.service';
import { AEATClientService } from '../../src/modules/invoicing/verifactu/aeat-client.service';
import { PrismaService } from '@crypto-erp/database';
import * as crypto from 'crypto';

// Mock types
type MockPrismaService = {
  invoice: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  company: {
    findUnique: jest.Mock;
  };
  $queryRaw: jest.Mock;
};

type MockAEATClientService = {
  submitInvoice: jest.Mock;
};

describe('VerifactuService', () => {
  let service: VerifactuService;
  let prismaService: MockPrismaService;
  let aeatClientService: MockAEATClientService;

  const mockCompanyId = 'company-uuid-1234';
  const mockInvoiceId = 'invoice-uuid-5678';

  const mockCompany = {
    id: mockCompanyId,
    name: 'Mi Empresa S.A.',
    taxId: 'A87654321',
  };

  const mockSeries = {
    id: 'series-uuid',
    prefix: 'F',
    code: 'F',
    name: 'Facturas',
  };

  const mockContact = {
    id: 'contact-uuid',
    name: 'Cliente Test S.L.',
    taxId: 'B12345678',
  };

  const mockInvoiceLines = [
    {
      id: 'line-1',
      description: 'Servicio de consultoría',
      quantity: { toNumber: () => 2 },
      unitPrice: { toNumber: () => 500 },
      taxRate: { toNumber: () => 21 },
      discount: { toNumber: () => 0 },
      subtotal: { toNumber: () => 1000 },
      taxAmount: { toNumber: () => 210 },
      total: { toNumber: () => 1210 },
    },
  ];

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
    counterpartyName: 'Cliente Test S.L.',
    counterpartyTaxId: 'B12345678',
    verifactuHash: null,
    verifactuQrData: null,
    createdAt: new Date('2024-01-15'),
    lines: mockInvoiceLines,
    contact: mockContact,
    series: mockSeries,
  };

  beforeEach(async () => {
    prismaService = {
      invoice: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    aeatClientService = {
      submitInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifactuService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AEATClientService, useValue: aeatClientService },
      ],
    }).compile();

    service = module.get<VerifactuService>(VerifactuService);
  });

  describe('generateVerifactuRecord', () => {
    it('should generate a verifactu record with correct huella', async () => {
      // First call for invoice, second call for previous record
      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValueOnce(null); // No previous record
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.invoice.update.mockResolvedValue({} as any);

      const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      expect(result).toBeDefined();
      expect(result.huella).toBeDefined();
      expect(result.huella).toHaveLength(64); // SHA-256 hex = 64 chars
      expect(result.huellaAnterior).toBeNull();
      expect(result.estado).toBe('PENDIENTE');
      expect(result.codigoQR).toContain('agenciatributaria.gob.es');
      expect(result.factura.nifEmisor).toBe('A87654321');
      expect(result.factura.numeroFactura).toBe('F-2024-000001');
      expect(result.factura.tipoFactura).toBe('F1'); // STANDARD -> F1
    });

    it('should chain huellas correctly with previous record', async () => {
      const previousHuella = 'ABCD1234567890ABCD1234567890ABCD1234567890ABCD1234567890ABCD1234';

      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValueOnce({ verifactuHash: previousHuella } as any);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.invoice.update.mockResolvedValue({} as any);

      const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      expect(result.huellaAnterior).toBe(previousHuella);
      // Huella should be different because it includes the previous huella
      expect(result.huella).not.toBe(previousHuella);
    });

    it('should throw error if invoice not found', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.generateVerifactuRecord(mockCompanyId, mockInvoiceId),
      ).rejects.toThrow(`Invoice ${mockInvoiceId} not found`);
    });

    it('should throw error if company not found', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice as any);
      prismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.generateVerifactuRecord(mockCompanyId, mockInvoiceId),
      ).rejects.toThrow(`Company ${mockCompanyId} not found`);
    });

    it('should map invoice types correctly', async () => {
      const testCases = [
        { type: 'STANDARD', expected: 'F1' },
        { type: 'SIMPLIFIED', expected: 'F2' },
        { type: 'CREDIT_NOTE', expected: 'R1' },
        { type: 'DEBIT_NOTE', expected: 'R2' },
        { type: 'UNKNOWN', expected: 'F1' }, // Default
      ];

      for (const testCase of testCases) {
        const invoice = { ...mockInvoice, type: testCase.type };
        prismaService.invoice.findFirst
          .mockResolvedValueOnce(invoice as any)
          .mockResolvedValueOnce(null);
        prismaService.company.findUnique.mockResolvedValue(mockCompany);
        prismaService.invoice.update.mockResolvedValue({} as any);

        const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);
        expect(result.factura.tipoFactura).toBe(testCase.expected);
      }
    });

    it('should use counterparty data when no contact is linked', async () => {
      const invoiceNoContact = {
        ...mockInvoice,
        contact: null,
        counterpartyName: 'Direct Client',
        counterpartyTaxId: 'X1234567A',
      };

      prismaService.invoice.findFirst
        .mockResolvedValueOnce(invoiceNoContact as any)
        .mockResolvedValueOnce(null);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.invoice.update.mockResolvedValue({} as any);

      const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      expect(result.factura.nombreReceptor).toBe('Direct Client');
      expect(result.factura.nifReceptor).toBe('X1234567A');
    });

    it('should save hash and QR data to invoice', async () => {
      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValueOnce(null);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.invoice.update.mockResolvedValue({} as any);

      const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      expect(prismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockInvoiceId },
          data: {
            verifactuHash: result.huella,
            verifactuQrData: result.codigoQR,
          },
        }),
      );
    });
  });

  describe('generateXML', () => {
    it('should generate valid XML structure', () => {
      const record = {
        huella: 'ABC123456789',
        huellaAnterior: null,
        factura: {
          numeroFactura: '2024-001',
          serieFactura: 'A',
          fechaExpedicion: new Date('2024-01-15'),
          nifEmisor: 'A12345678',
          nombreEmisor: 'Test Company',
          nifReceptor: 'B98765432',
          nombreReceptor: 'Client Company',
          baseImponible: 1000,
          tipoIva: 21,
          cuotaIva: 210,
          totalFactura: 1210,
          tipoFactura: 'F1' as const,
          descripcion: 'Servicio de prueba',
        },
        codigoQR: 'https://test.url',
        urlVerificacion: 'https://test.url',
        estado: 'PENDIENTE' as const,
        fechaRegistro: new Date(),
      };

      const xml = service.generateXML(record);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<soapenv:Envelope');
      expect(xml).toContain('<vf:NIF>A12345678</vf:NIF>');
      expect(xml).toContain('<vf:NumSerieFactura>A2024-001</vf:NumSerieFactura>');
      expect(xml).toContain('<vf:FechaExpedicion>2024-01-15</vf:FechaExpedicion>');
      expect(xml).toContain('<vf:TipoFactura>F1</vf:TipoFactura>');
      expect(xml).toContain('<vf:BaseImponible>1000.00</vf:BaseImponible>');
      expect(xml).toContain('<vf:CuotaRepercutida>210.00</vf:CuotaRepercutida>');
      expect(xml).toContain('<vf:ImporteTotal>1210.00</vf:ImporteTotal>');
      expect(xml).toContain('<vf:Huella>ABC123456789</vf:Huella>');
    });

    it('should escape XML special characters', () => {
      const record = {
        huella: 'ABC123',
        huellaAnterior: null,
        factura: {
          numeroFactura: '2024-001',
          serieFactura: 'A',
          fechaExpedicion: new Date('2024-01-15'),
          nifEmisor: 'A12345678',
          nombreEmisor: 'Test & Company <S.L.>',
          nifReceptor: 'B98765432',
          nombreReceptor: "Client's Company",
          baseImponible: 1000,
          tipoIva: 21,
          cuotaIva: 210,
          totalFactura: 1210,
          tipoFactura: 'F1' as const,
          descripcion: 'Servicio "especial" & más',
        },
        codigoQR: 'https://test.url',
        urlVerificacion: 'https://test.url',
        estado: 'PENDIENTE' as const,
        fechaRegistro: new Date(),
      };

      const xml = service.generateXML(record);

      expect(xml).toContain('Test &amp; Company &lt;S.L.&gt;');
      expect(xml).toContain('Client&apos;s Company');
      expect(xml).toContain('Servicio &quot;especial&quot; &amp; más');
    });

    it('should include huellaAnterior when present', () => {
      const record = {
        huella: 'NEWHASH123',
        huellaAnterior: 'OLDHASH456',
        factura: {
          numeroFactura: '2024-002',
          serieFactura: 'A',
          fechaExpedicion: new Date('2024-01-16'),
          nifEmisor: 'A12345678',
          nombreEmisor: 'Test',
          nombreReceptor: 'Client',
          baseImponible: 500,
          tipoIva: 21,
          cuotaIva: 105,
          totalFactura: 605,
          tipoFactura: 'F1' as const,
          descripcion: 'Test',
        },
        codigoQR: 'https://test.url',
        urlVerificacion: 'https://test.url',
        estado: 'PENDIENTE' as const,
        fechaRegistro: new Date(),
      };

      const xml = service.generateXML(record);

      expect(xml).toContain('<vf:Huella>NEWHASH123</vf:Huella>');
      expect(xml).toContain('<vf:HuellaAnterior>OLDHASH456</vf:HuellaAnterior>');
    });
  });

  describe('sendToAEAT', () => {
    const mockInvoiceWithHash = {
      ...mockInvoice,
      verifactuHash: 'ABC123456789012345678901234567890123456789012345678901234567890123',
      verifactuQrData: 'https://agenciatributaria.gob.es/verify?...',
    };

    it('should return success for already registered invoice (implementation assumes ACEPTADO)', async () => {
      // Current implementation: if invoice has verifactuHash, it's considered already accepted
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoiceWithHash as any);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.sendToAEAT(mockCompanyId, mockInvoiceId);

      // Already accepted invoices return success without calling AEAT
      expect(result.success).toBe(true);
      expect(aeatClientService.submitInvoice).not.toHaveBeenCalled();
    });

    it('should throw error if no verifactu record exists', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice as any); // No verifactuHash

      await expect(service.sendToAEAT(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        'Verifactu record not found',
      );
    });

    it('should throw error if invoice not found', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.sendToAEAT(mockCompanyId, mockInvoiceId)).rejects.toThrow(
        'Verifactu record not found',
      );
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verified status for invoice with verifactu hash', async () => {
      const invoiceWithHash = {
        ...mockInvoice,
        verifactuHash: 'ABC123',
        verifactuQrData: 'https://aeat.es/verify',
      };

      prismaService.invoice.findFirst.mockResolvedValue(invoiceWithHash as any);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getVerificationStatus(mockCompanyId, mockInvoiceId);

      expect(result.verified).toBe(true);
      expect(result.estado).toBe('ACEPTADO');
      expect(result.urlVerificacion).toBe('https://aeat.es/verify');
    });

    it('should return not registered for invoices without verifactu', async () => {
      prismaService.invoice.findFirst.mockResolvedValue(mockInvoice as any); // verifactuHash is null

      const result = await service.getVerificationStatus(mockCompanyId, mockInvoiceId);

      expect(result.verified).toBe(false);
      expect(result.estado).toBe('NO_REGISTRADO');
    });
  });

  describe('validateChainIntegrity', () => {
    it('should validate chain with no errors', async () => {
      prismaService.invoice.findMany.mockResolvedValue([
        { id: '1', fullNumber: '001', verifactuHash: 'HASH1' },
        { id: '2', fullNumber: '002', verifactuHash: 'HASH2' },
        { id: '3', fullNumber: '003', verifactuHash: 'HASH3' },
      ]);

      const result = await service.validateChainIntegrity(mockCompanyId);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRecords).toBe(3);
    });

    it('should detect invoices without hash', async () => {
      prismaService.invoice.findMany.mockResolvedValue([
        { id: '1', fullNumber: '001', verifactuHash: 'HASH1' },
        { id: '2', fullNumber: '002', verifactuHash: null },
        { id: '3', fullNumber: '003', verifactuHash: 'HASH3' },
      ]);

      const result = await service.validateChainIntegrity(mockCompanyId);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Factura 002');
    });

    it('should return valid for empty chain', async () => {
      prismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.validateChainIntegrity(mockCompanyId);

      expect(result.valid).toBe(true);
      expect(result.totalRecords).toBe(0);
    });
  });

  describe('huella generation consistency', () => {
    it('should generate consistent huella for same input', async () => {
      // Generate expected hash manually to verify algorithm
      const invoiceData = {
        nifEmisor: 'A87654321',
        numeroFactura: 'F-2024-000001',
        serieFactura: 'F',
        fechaExpedicion: new Date('2024-01-15'),
        tipoFactura: 'F1',
        baseImponible: 1000,
        cuotaIva: 210,
        totalFactura: 1210,
      };

      const contenido = [
        invoiceData.nifEmisor,
        invoiceData.numeroFactura,
        invoiceData.serieFactura,
        '2024-01-15',
        invoiceData.tipoFactura,
        '1000.00',
        '210.00',
        '1210.00',
        '', // No previous huella
      ].join('|');

      const expectedHash = crypto
        .createHash('sha256')
        .update(contenido, 'utf8')
        .digest('hex')
        .toUpperCase();

      // Setup mocks
      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValueOnce(null);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.invoice.update.mockResolvedValue({} as any);

      const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      expect(result.huella).toBe(expectedHash);
      expect(result.huella).toHaveLength(64);
    });

    it('should include previous huella in chain calculation', async () => {
      const previousHuella = 'PREV'.padEnd(64, '0');

      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValueOnce({ verifactuHash: previousHuella } as any);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.invoice.update.mockResolvedValue({} as any);

      const result = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      // Hash should be different from when there's no previous huella
      prismaService.invoice.findFirst
        .mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValueOnce(null);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);

      const resultWithoutPrevious = await service.generateVerifactuRecord(mockCompanyId, mockInvoiceId);

      expect(result.huella).not.toBe(resultWithoutPrevious.huella);
      expect(result.huellaAnterior).toBe(previousHuella);
      expect(resultWithoutPrevious.huellaAnterior).toBeNull();
    });
  });
});
