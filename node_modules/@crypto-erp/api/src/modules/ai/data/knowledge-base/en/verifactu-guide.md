# Verifactu - Spanish Electronic Invoicing System Guide

## What is Verifactu?

**Verifactu** is Spain's new mandatory electronic invoicing system implemented through **Real Decreto 1007/2023** (Royal Decree 1007/2023).

**Purpose**: Combat VAT fraud and ensure invoice integrity using blockchain-inspired technology.

**Mandatory from**: July 1, 2025 (initially voluntary period started 2024)

## Who Must Use Verifactu?

### Mandatory for:
- ✅ All businesses and self-employed (autónomos) in Spain
- ✅ Companies using invoicing software
- ✅ Point-of-sale (POS) systems
- ✅ Online stores and e-commerce

### Exemptions:
- Small businesses under simplified regime (temporarily)
- Specific sectors with alternative systems

## Core Concept: Hash Chain

Verifactu uses a **blockchain-like hash chain** to ensure invoice integrity:

```
Invoice 1: Hash = SHA-256(data1)
Invoice 2: Hash = SHA-256(data2 + Hash1)
Invoice 3: Hash = SHA-256(data3 + Hash2)
...
```

**Any modification** to a previous invoice breaks the chain, making fraud detectable.

## Technical Requirements

### Hash Algorithm: SHA-256

**Hash components**:
1. Issuing company VAT ID (NIF/CIF)
2. Invoice number
3. Issue date and time
4. Invoice type
5. Recipient VAT ID (if B2B)
6. Total amount (including VAT)
7. **Previous invoice hash** (chain link)
8. Software manufacturer details

### QR Code Generation

Each invoice must include a **QR code** containing:
- Invoice ID
- Issue timestamp
- Total amount
- Invoice hash
- AEAT verification URL

**Purpose**: Allow instant verification by scanning

## Invoice Types in Verifactu

### Type Codes:

- **F1**: Standard invoice
- **F2**: Simplified invoice (< €400, no recipient details required)
- **F3**: Invoice issued by recipient (reverse charge)
- **F4**: Accounting entry substitute
- **R1**: Corrective invoice (credit note)
- **R2**: Corrective invoice by recipient
- **R3**: Corrective simplified invoice
- **R4**: Corrective accounting entry
- **R5**: Summary invoices for internal records

## Implementation Steps

### 1. Choose Verifactu-Compliant Software

**Requirements**:
- Generate SHA-256 hashes
- Maintain hash chain integrity
- Create compliant QR codes
- Send to AEAT (optional but recommended)

**Certification**: Software must be certified by manufacturer

### 2. Register with AEAT

**Process**:
- File Modelo 036/037 updates
- Declare use of Verifactu system
- Provide software details

### 3. Generate First Invoice

**Special case**: First invoice has NO previous hash
- Use special identifier: "0000000000000000000000000000000000000000000000000000000000000000" (64 zeros)

### 4. Maintain Chain Continuity

**Critical**: Never skip invoice numbers or break the chain

**If system failure occurs**:
- Document the incident
- Resume with continuity indicators
- Notify AEAT if chain breaks

## Data Submission to AEAT

### Voluntary Submission (Recommended):

**Method**: SOAP web service

**Frequency**: Real-time or periodic batches

**Endpoint**: https://www7a.aeat.es/wlpl/TIKE-CONT/ValidacionContrasenaVf

**Benefits**:
- Proof of invoice existence
- Timestamp by AEAT
- Enhanced fraud protection

### Submission Format: XML

**Example structure**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope>
  <soapenv:Header/>
  <soapenv:Body>
    <RegistroFactura>
      <CabeceraFactura>
        <NIF>B12345678</NIF>
        <NumFactura>2025/001</NumFactura>
        <FechaExpedicion>01-02-2025</FechaExpedicion>
        <TipoFactura>F1</TipoFactura>
      </CabeceraFactura>
      <Huella>
        <AlgoritmoHuella>SHA-256</AlgoritmoHuella>
        <Huella>a3f8b2...</Huella>
      </Huella>
    </RegistroFactura>
  </soapenv:Body>
</soapenv:Envelope>
```

## QR Code Specifics

### Required Data in QR:

**Format**: URL with parameters

**Example**:
```
https://aeat.gob.es/verifactu?
  nif=B12345678&
  num=2025/001&
  fecha=01-02-2025&
  importe=12100&
  huella=a3f8b2c4...
```

### QR Size and Position:

- **Minimum size**: 20x20 mm
- **Position**: Visible on invoice (typically bottom-right)
- **Error correction**: Level M (15% recovery)

## Practical Example: Crypto Exchange

**Scenario**: Binance España issues invoice for trading fee

### Invoice Data:
```
Company: Binance España SL
VAT ID: B87654321
Invoice: 2025/00042
Date: February 15, 2025, 14:30:15
Type: F1 (Standard)
Customer VAT: B12345678
Amount: €1,000.00
VAT (21%): €210.00
Total: €1,210.00
Previous hash: d4e5f6g7h8i9... (from invoice 2025/00041)
```

### Hash Calculation:
```
Input string:
"B87654321|2025/00042|15-02-2025T14:30:15|F1|B12345678|1210.00|d4e5f6g7h8i9..."

SHA-256 hash:
"a3f8b2c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2"
```

### QR Code Content:
```
https://aeat.gob.es/verifactu?nif=B87654321&num=2025/00042&
fecha=15-02-2025T14:30:15&importe=1210.00&
huella=a3f8b2c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2
```

### XML Submission:
```xml
<RegistroFactura>
  <CabeceraFactura>
    <NIF>B87654321</NIF>
    <NumFactura>2025/00042</NumFactura>
    <FechaExpedicion>15-02-2025T14:30:15</FechaExpedicion>
    <TipoFactura>F1</TipoFactura>
    <DestinatarioNIF>B12345678</DestinoMatarIF>
    <ImporteTotal>1210.00</ImporteTotal>
  </CabeceraFactura>
  <Huella>
    <AlgoritmoHuella>SHA-256</AlgoritmoHuella>
    <Huella>a3f8b2c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2</Huella>
    <HuellaAnterior>d4e5f6g7h8i9...</HuellaAnterior>
  </Huella>
  <SoftwareFacturacion>
    <NombreSistema>CryptoERP</NombreSistema>
    <Version>1.0</Version>
    <Fabricante>B99887766</Fabricante>
  </SoftwareFacturacion>
</RegistroFactura>
```

## Error Handling

### Chain Break Scenarios:

**Cause 1: System crash/data loss**
- Document incident
- Resume with new series indicator
- Notify AEAT within 7 days

**Cause 2: Invoice correction**
- NEVER modify existing invoice
- Issue corrective invoice (type R1-R5)
- Maintain original in chain

**Cause 3: Duplicate numbers**
- Implement sequence controls
- Use unique identifiers (timestamp + sequence)

## Integration with Accounting Systems

### Workflow:

```
1. Create invoice in accounting system
2. Generate hash (SHA-256)
3. Store hash with invoice data
4. Generate QR code
5. Print/send invoice to customer
6. (Optional) Submit to AEAT via SOAP
7. Record AEAT response/timestamp
```

### Database Schema Example:

```sql
CREATE TABLE invoices (
  id VARCHAR(50) PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL,
  issue_date TIMESTAMP NOT NULL,
  invoice_type VARCHAR(2) NOT NULL,
  customer_vat VARCHAR(20),
  amount_total DECIMAL(12,2) NOT NULL,
  hash_previous VARCHAR(64),
  hash_current VARCHAR(64) NOT NULL,
  qr_code_data TEXT NOT NULL,
  aeat_sent BOOLEAN DEFAULT FALSE,
  aeat_timestamp TIMESTAMP,
  aeat_csv VARCHAR(100)
);
```

## Compliance Checklist

✅ **Software certified** for Verifactu
✅ **Hash chain implemented** (SHA-256)
✅ **QR codes generated** on all invoices
✅ **Previous hash linked** for each invoice
✅ **First invoice** uses 64-zero hash
✅ **Invoice types** correctly coded (F1, F2, R1, etc.)
✅ **AEAT registration** completed
✅ **(Optional) SOAP submission** configured
✅ **Backup system** for hash chain data
✅ **Audit trail** maintained

## Common Pitfalls

❌ **Skipping invoice numbers**
- Breaks traceability, can trigger audit

❌ **Modifying issued invoices**
- Use corrective invoices instead

❌ **Incorrect hash calculation**
- Verify input string format exactly

❌ **Missing previous hash**
- Every invoice (except first) must link to previous

❌ **QR code missing**
- Required on ALL invoices

❌ **Not documenting system failures**
- Must have evidence of incidents

## Penalties for Non-Compliance

### Serious infractions:
- Not using Verifactu system: €1,000 - €10,000
- Incorrect hashes: €1,000 - €10,000
- Missing QR codes: €500 - €5,000

### Very serious infractions:
- Intentional chain manipulation: €10,000 - €50,000
- Fraud facilitation: Up to €600,000

## Crypto Business Specifics

### High-volume exchanges:

**Challenge**: Thousands of micro-invoices daily

**Solution**:
- Batch processing
- Automated hash generation
- Real-time AEAT submission
- Robust backup systems

### Example: 10,000 invoices/day
```
Processing requirements:
- Hash generation: < 1ms per invoice
- QR creation: < 2ms per invoice
- Database write: < 5ms per invoice
- AEAT submission: Batch every hour

Total system capacity: > 500 invoices/minute
```

### NFT marketplaces:

**Each sale** = separate invoice
- Automate entirely
- Use webhooks for real-time generation
- Store on IPFS for permanence (optional)

### Staking/yield platforms:

**Monthly distributions**:
- Consolidated invoice per user
- Hash chain per customer series
- Detailed breakdown in invoice body

## Future Developments

### Planned enhancements (2026+):

- **Real-time mandatory submission** (currently optional)
- **Blockchain integration** (public distributed ledger)
- **AI-powered fraud detection** by AEAT
- **EU-wide interoperability** (compatible with ViDA Directive)

## Resources

### Official documents:
- **Real Decreto 1007/2023**: Legal framework
- **AEAT Technical Specifications**: Hash and QR requirements
- **SOAP API Documentation**: Integration guide

### Tools and libraries:
- OpenSSL (SHA-256 hashing)
- QR code generators (compliant with specifications)
- SOAP client libraries (Node.js, Python, Java)

## Conclusion

Verifactu represents a significant change in Spanish invoicing:

**Key takeaways**:
1. **Mandatory from July 2025** for most businesses
2. **Blockchain-inspired** hash chain technology
3. **QR codes required** on all invoices
4. **Optional but recommended** real-time AEAT submission
5. **Severe penalties** for non-compliance

**Recommendation**: Implement early, test thoroughly, and ensure your accounting system is Verifactu-compliant well before the deadline.

For crypto businesses with high transaction volumes, automation is essential—manual compliance is not feasible.
