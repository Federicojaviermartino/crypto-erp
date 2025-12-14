# Verifactu Technical Specification

## Overview

Verifactu is Spain's verified billing system mandated by AEAT (Spanish Tax Agency). This document covers the technical implementation requirements.

---

## Key Dates

| Milestone | Date | Description |
|-----------|------|-------------|
| Software compliance | July 29, 2025 | All invoicing software must be Verifactu-ready |
| Corporations mandatory | January 1, 2026 | Companies subject to Corporate Tax |
| Self-employed mandatory | July 1, 2026 | Autónomos and others |

---

## System Requirements

### Core Features

1. **Hash-chained records**: Each invoice record linked to the previous via SHA-256
2. **QR Code generation**: Mandatory on all invoices
3. **"VERI*FACTU" label**: Visual indicator of compliance
4. **XML format**: Standardized format per AEAT specification
5. **Transmission capability**: Ability to send records to AEAT

### Two Operating Modes

| Mode | Description | Hash Chain |
|------|-------------|------------|
| **Verifactu** | Real-time or near-real-time transmission to AEAT | Linked between records |
| **Non-Verifactu** | Local storage, no transmission | Still requires hash chain |

---

## Hash Chain Implementation

### Fields Included in Hash

```typescript
interface VerifactuHashInput {
  // Issuer identification
  issuerTaxId: string;        // NIF/CIF of issuer
  
  // Invoice identification
  invoiceNumber: string;       // Full number including series
  issueDate: string;           // YYYY-MM-DD format
  
  // Amount
  totalAmount: string;         // Total with 2 decimal places
  
  // Chain link
  previousHash: string;        // Previous record hash or "0" for first
}
```

### Hash Generation Algorithm

```typescript
import { createHash } from 'crypto';

interface Invoice {
  issuerTaxId: string;
  series: string;
  number: number;
  issueDate: Date;
  total: number;
}

function generateVerifactuHash(
  invoice: Invoice, 
  previousHash: string | null
): string {
  // Format invoice number
  const fullNumber = `${invoice.series}${invoice.number.toString().padStart(8, '0')}`;
  
  // Format date
  const dateStr = invoice.issueDate.toISOString().split('T')[0];
  
  // Format amount (2 decimal places, no thousands separator)
  const amountStr = invoice.total.toFixed(2);
  
  // Concatenate fields with separator
  const dataToHash = [
    invoice.issuerTaxId,
    fullNumber,
    dateStr,
    amountStr,
    previousHash || '0'
  ].join('|');
  
  // Generate SHA-256 hash
  return createHash('sha256')
    .update(dataToHash, 'utf8')
    .digest('hex')
    .toUpperCase();
}

// Example usage
const hash = generateVerifactuHash(
  {
    issuerTaxId: 'B12345678',
    series: 'F',
    number: 1,
    issueDate: new Date('2025-01-15'),
    total: 1210.00
  },
  null // First invoice, no previous hash
);
// Result: "A1B2C3D4E5F6..." (64 character hex string)
```

### Chain Validation

```typescript
async function validateHashChain(companyId: string): Promise<ValidationResult> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: 'ISSUED' },
    orderBy: { number: 'asc' },
  });
  
  let previousHash: string | null = null;
  const errors: string[] = [];
  
  for (const invoice of invoices) {
    const expectedHash = generateVerifactuHash(invoice, previousHash);
    
    if (invoice.verifactuHash !== expectedHash) {
      errors.push(`Invoice ${invoice.fullNumber}: hash mismatch`);
    }
    
    if (invoice.verifactuPrevHash !== (previousHash || '0')) {
      errors.push(`Invoice ${invoice.fullNumber}: previous hash mismatch`);
    }
    
    previousHash = invoice.verifactuHash;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    totalChecked: invoices.length,
  };
}
```

---

## QR Code Specification

### QR Content Structure

```
https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?
nif=B12345678
&numserie=F00000001
&fecha=15-01-2025
&importe=1210.00
&huella=A1B2C3D4...
```

### QR Generation

```typescript
import QRCode from 'qrcode';

interface QROptions {
  width: number;      // Minimum 30mm when printed
  errorCorrectionLevel: 'M' | 'H';  // Medium or High recommended
}

async function generateVerifactuQR(invoice: Invoice): Promise<Buffer> {
  const params = new URLSearchParams({
    nif: invoice.issuerTaxId,
    numserie: invoice.fullNumber,
    fecha: formatDate(invoice.issueDate),  // DD-MM-YYYY
    importe: invoice.total.toFixed(2),
    huella: invoice.verifactuHash.substring(0, 16),  // First 16 chars
  });
  
  const url = `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${params}`;
  
  return QRCode.toBuffer(url, {
    width: 200,  // pixels, adjust based on DPI
    errorCorrectionLevel: 'M',
    margin: 2,
  });
}
```

### QR Placement Requirements

- Minimum size: 30mm x 30mm
- Must be clearly visible
- Preferably in header or footer area
- Black on white background

---

## XML Format

### Invoice Record Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<RegistroFacturacion xmlns="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SusFactuSistemaFacturacion.xsd">
  <Cabecera>
    <IDVersionSIF>1.0</IDVersionSIF>
    <ObligadoEmision>
      <NombreRazon>Mi Empresa S.L.</NombreRazon>
      <NIF>B12345678</NIF>
    </ObligadoEmision>
  </Cabecera>
  
  <RegistroAlta>
    <IDFactura>
      <IDEmisorFactura>B12345678</IDEmisorFactura>
      <NumSerieFactura>F00000001</NumSerieFactura>
      <FechaExpedicionFactura>15-01-2025</FechaExpedicionFactura>
    </IDFactura>
    
    <TipoFactura>F1</TipoFactura>  <!-- F1: Standard, F2: Simplified -->
    
    <Destinatarios>
      <IDDestinatario>
        <NombreRazon>Cliente S.A.</NombreRazon>
        <NIF>A87654321</NIF>
      </IDDestinatario>
    </Destinatarios>
    
    <Desglose>
      <DetalleDesglose>
        <ClaveRegimen>01</ClaveRegimen>  <!-- General regime -->
        <CalificacionOperacion>S1</CalificacionOperacion>
        <TipoImpositivo>21.00</TipoImpositivo>
        <BaseImponible>1000.00</BaseImponible>
        <CuotaRepercutida>210.00</CuotaRepercutida>
      </DetalleDesglose>
    </Desglose>
    
    <ImporteTotal>1210.00</ImporteTotal>
    
    <Huella>A1B2C3D4E5F6...</Huella>
    <HuellaAnterior>0</HuellaAnterior>
    
    <SistemaInformatico>
      <NombreRazon>CryptoERP S.L.</NombreRazon>
      <NIF>B99999999</NIF>
      <NombreSistemaInformatico>CryptoERP</NombreSistemaInformatico>
      <IdSistemaInformatico>CRYPTOERP-001</IdSistemaInformatico>
      <Version>1.0.0</Version>
      <NumeroInstalacion>001</NumeroInstalacion>
    </SistemaInformatico>
  </RegistroAlta>
</RegistroFacturacion>
```

### Invoice Types (TipoFactura)

| Code | Description |
|------|-------------|
| F1 | Standard invoice |
| F2 | Simplified invoice (ticket) |
| R1 | Credit note (error in tax base) |
| R2 | Credit note (error in VAT rate) |
| R3 | Credit note (Art. 80.3) |
| R4 | Credit note (other) |
| R5 | Credit note (simplified) |

### VAT Regimes (ClaveRegimen)

| Code | Description |
|------|-------------|
| 01 | General regime |
| 02 | Export |
| 03 | Used goods, art, antiques |
| 04 | Investment gold |
| 05 | Travel agencies |
| 06 | Groups of entities (level 1) |
| 07 | Cash basis |
| 08 | Canary Islands IGIC |
| 09 | Professional with VAT flat rate |
| 10 | Third country/territory |
| 11 | ISP - Recipient of operation |
| 14 | Invoice with pending VAT accrual |
| 15 | Invoice with VAT accrual pending (Art. 7.2.1) |

---

## Transmission to AEAT

### Web Service Endpoint

```typescript
const AEAT_ENDPOINTS = {
  production: 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/SuministroFaRe',
  test: 'https://prewww2.agenciatributaria.gob.es/wlpl/TIKE-CONT/SuministroFaRe',
};
```

### Authentication

- Client certificate (digital certificate)
- Valid for Spanish tax operations
- Must be registered with AEAT

```typescript
import { Agent } from 'https';
import fs from 'fs';

function createAeatAgent(certPath: string, certPassword: string): Agent {
  return new Agent({
    pfx: fs.readFileSync(certPath),
    passphrase: certPassword,
  });
}
```

### SOAP Request Structure

```typescript
async function sendToAeat(xml: string, certificate: CertificateConfig): Promise<AeatResponse> {
  const soapEnvelope = `
    <?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope 
      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sfr="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroFaRe.wsdl">
      <soapenv:Header/>
      <soapenv:Body>
        <sfr:RegFactuSistemaFacturacion>
          ${xml}
        </sfr:RegFactuSistemaFacturacion>
      </soapenv:Body>
    </soapenv:Envelope>
  `;
  
  const response = await fetch(AEAT_ENDPOINTS.production, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'RegFactuSistemaFacturacion',
    },
    body: soapEnvelope,
    agent: createAeatAgent(certificate.path, certificate.password),
  });
  
  return parseAeatResponse(await response.text());
}
```

---

## Error Handling

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 1000 | XML validation error | Check XML structure |
| 2000 | Authentication error | Check certificate |
| 3000 | Duplicate invoice | Invoice already submitted |
| 4000 | Hash chain error | Verify hash calculation |
| 5000 | Invalid NIF | Check tax ID format |

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,  // ms
  maxDelay: 30000,  // ms
  backoffMultiplier: 2,
};

async function sendWithRetry(invoice: Invoice): Promise<AeatResponse> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await sendToAeat(invoice);
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error)) {
        throw error;
      }
      
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

---

## Invoice PDF Generation

### Required Elements

1. **Header**
   - "VERI*FACTU" label (if transmitted)
   - Company logo and details
   - QR code (30mm minimum)

2. **Invoice Details**
   - Full invoice number with series
   - Issue date
   - Customer details

3. **Line Items**
   - Description, quantity, price
   - Discounts if applicable
   - VAT breakdown per rate

4. **Footer**
   - Total amounts
   - Payment terms
   - Legal text

### PDF Template Example

```typescript
import PDFDocument from 'pdfkit';

async function generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  
  doc.on('data', chunk => chunks.push(chunk));
  
  // Header with VERI*FACTU label
  if (invoice.verifactuSentAt) {
    doc.fontSize(8)
       .text('VERI*FACTU', { align: 'right' })
       .moveDown(0.5);
  }
  
  // QR Code (top right)
  const qrBuffer = await generateVerifactuQR(invoice);
  doc.image(qrBuffer, doc.page.width - 150, 50, { width: 100 });
  
  // Company details
  doc.fontSize(12)
     .text(invoice.company.name, 50, 50)
     .fontSize(10)
     .text(`NIF: ${invoice.company.taxId}`)
     .text(invoice.company.address);
  
  // Invoice title
  doc.fontSize(16)
     .text(`FACTURA ${invoice.fullNumber}`, 50, 150)
     .fontSize(10)
     .text(`Fecha: ${formatDate(invoice.issueDate)}`);
  
  // Customer details
  doc.text(`Cliente: ${invoice.counterpartyName}`, 50, 200)
     .text(`NIF: ${invoice.counterpartyTaxId}`);
  
  // Line items table
  // ... table generation code
  
  // Totals
  doc.text(`Base Imponible: ${formatCurrency(invoice.subtotal)}`, { align: 'right' })
     .text(`IVA (21%): ${formatCurrency(invoice.totalTax)}`, { align: 'right' })
     .fontSize(12)
     .text(`TOTAL: ${formatCurrency(invoice.total)}`, { align: 'right' });
  
  // Hash footer (for verification)
  doc.fontSize(6)
     .text(`Hash: ${invoice.verifactuHash}`, 50, doc.page.height - 50);
  
  doc.end();
  
  return Buffer.concat(chunks);
}
```

---

## Testing

### AEAT Test Environment

- URL: `https://prewww2.agenciatributaria.gob.es`
- Use test certificates provided by AEAT
- Test data does not affect real tax records

### Test Cases

1. **First invoice** (no previous hash)
2. **Sequential invoices** (valid chain)
3. **Simplified invoice** (F2 type)
4. **Credit note** (R1-R5 types)
5. **Multi-VAT rates** (21%, 10%, 4%)
6. **Zero VAT** (exports, exempt)
7. **Foreign customer** (intra-EU, extra-EU)

### Hash Chain Test

```typescript
describe('Verifactu Hash Chain', () => {
  it('should generate correct hash for first invoice', () => {
    const invoice = createTestInvoice({ number: 1 });
    const hash = generateVerifactuHash(invoice, null);
    
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[A-F0-9]+$/);
  });
  
  it('should chain hashes correctly', () => {
    const invoice1 = createTestInvoice({ number: 1 });
    const hash1 = generateVerifactuHash(invoice1, null);
    
    const invoice2 = createTestInvoice({ number: 2 });
    const hash2 = generateVerifactuHash(invoice2, hash1);
    
    expect(hash2).not.toBe(hash1);
    
    // Verify chain
    const expectedHash2 = generateVerifactuHash(invoice2, hash1);
    expect(hash2).toBe(expectedHash2);
  });
});
```
