# Spanish VAT (IVA) Guide for Crypto Businesses

## What is IVA?

**IVA** (Impuesto sobre el Valor Añadido) is Spain's Value Added Tax, equivalent to VAT in other EU countries.

**Standard Rate**: 21%
**Reduced Rate**: 10% (certain goods and services)
**Super-reduced Rate**: 4% (basic necessities)

## VAT and Cryptocurrencies

### Key Principle: Crypto Sales are VAT-EXEMPT

**Legal basis**:
- **EU Directive 2018/822**
- **CJEU Case Hedqvist (C-264/14)**
- **Spanish Consulta Vinculante V0999-18**

Cryptocurrencies are treated as **means of payment**, not goods or services.

### What is EXEMPT from VAT (0%):

✅ **Buying cryptocurrency** (BTC, ETH, etc. for EUR)
✅ **Selling cryptocurrency** (converting to fiat)
✅ **Trading cryptocurrencies** (BTC → ETH swaps)
✅ **Transferring crypto** between wallets
✅ **Receiving crypto** as payment

### What is SUBJECT to 21% VAT:

❌ **Exchange commissions** (trading fees)
❌ **Custody services** (wallet storage fees)
❌ **Consulting services** (tax advice, blockchain consulting)
❌ **Mining hosting** (colocation, cloud mining services)
❌ **Development services** (smart contract programming)
❌ **Educational services** (crypto courses, seminars)
❌ **Software licensing** (crypto-related SaaS)

## Modelo 303 - Quarterly VAT Return

**Who must file**: All VAT-registered businesses

**Deadlines**:
- Q1 (Jan-Mar): April 1-20
- Q2 (Apr-Jun): July 1-20
- Q3 (Jul-Sep): October 1-20
- Q4 (Oct-Dec): January 1-30 (following year)

### Key Sections:

**VAT Charged (Output VAT)**:
- Box 01: Tax base at 21%
- Box 02: VAT amount at 21%
- Box 07: Total VAT charged

**VAT Paid (Input VAT)**:
- Box 28: VAT on business expenses
- Box 30: Total deductible VAT

**Result**:
- Box 46: Difference (Box 07 - Box 30)
  - Positive = VAT to pay
  - Negative = VAT refund/carry forward

## Practical Example: Crypto Exchange

**Exchange ABC - Q1 2025 Operations**:

### Revenue:
```
Trading commissions: €100,000 (net)
VAT charged (21%): €21,000
Total invoiced to customers: €121,000
```

### Expenses:
```
Cloud servers: €10,000 + €2,100 VAT = €12,100
Software licenses: €5,000 + €1,050 VAT = €6,050
Legal services: €8,000 + €1,680 VAT = €9,680
Office rent: €3,000 + €630 VAT = €3,630

Total VAT paid: €5,460
```

### Modelo 303 Filing:
```
Box 01 (Tax base 21%): €100,000
Box 02 (VAT output 21%): €21,000
Box 07 (Total VAT charged): €21,000

Box 28 (VAT on expenses): €5,460
Box 30 (Total deductible VAT): €5,460

Box 46 (VAT to pay): €21,000 - €5,460 = €15,540
```

## Common Scenarios

### Scenario 1: Crypto Miner (Self-Employed)

**Activity**: Mining Bitcoin

**Income**: Sale of mined BTC = **VAT-EXEMPT**
**Services**: If offering mining hosting = **21% VAT**

**Example**:
```
Mined and sold 1 BTC for €45,000: NO VAT
Hosting service for client miners: €1,000 + €210 VAT
```

### Scenario 2: Blockchain Consultant

**Services**: Smart contract audits, blockchain consulting

**All services subject to 21% VAT**

**Invoice example**:
```
Consulting services: €5,000
VAT (21%): €1,050
----------------------
TOTAL: €6,050
```

**Quarterly VAT**:
- Charged VAT: €1,050
- Deductible VAT (laptop, office, etc.): €300
- Net VAT to pay: €750

### Scenario 3: NFT Marketplace

**Platform fees**: 2.5% commission on NFT sales

**Example transaction**:
```
NFT sold: €10,000 (VAT-exempt, it's crypto)
Platform commission: €250
VAT on commission (21%): €52.50
Total charged to seller: €302.50

Quarterly summary:
Commissions: €50,000
VAT charged: €10,500
VAT on expenses: €3,000
Net VAT: €7,500
```

### Scenario 4: Crypto OTC Desk

**Activity**: Buying and selling large amounts for clients

**Trading transactions**: **VAT-EXEMPT**
**Service fee**: **21% VAT**

**Example**:
```
Client buys €1,000,000 in BTC: NO VAT on BTC
OTC service fee: €5,000
VAT on fee (21%): €1,050
Total to pay: €1,006,050 (€1M BTC + €6,050 fee incl VAT)
```

## VAT Registration

### When to register:

**Mandatory if**:
- Annual turnover > €0 (effectively, any taxable activity)
- Providing services subject to VAT

**How to register**:
- File Modelo 036 or 037
- Choose quarterly or monthly VAT regime
- Receive NIF/CIF VAT number

### For crypto businesses:

**If ONLY trading crypto** (buying/selling):
- May not need VAT registration (exempt activity)

**If providing services** (custody, consulting, etc.):
- MUST register for VAT

## Intra-Community Transactions

### Buying services from EU companies:

**Reverse charge mechanism** applies:
- You pay VAT to Spanish authorities (not supplier)
- Deduct it immediately if entitled

**Example**:
```
Buy SaaS from German company: €1,000 (no VAT charged)
You declare in Modelo 303:
- VAT charged (reverse charge): €210
- VAT deductible: €210
- Net effect: €0
```

### Selling services to EU businesses:

**B2B (Business to Business)**:
- NO Spanish VAT charged
- Client applies reverse charge in their country
- Must verify client's VAT number (VIES)

**B2C (Business to Consumer)**:
- Charge Spanish VAT if customer in Spain
- Different rules if customer in another EU country

## Modelo 349 - Intra-Community Transactions

**When required**: Trading goods/services with EU businesses

**Frequency**: Monthly or quarterly (depending on volume)

**Reports**:
- Services provided to EU businesses
- Goods purchased from EU suppliers

**Not applicable** to cryptocurrency itself (exempt), but applicable to:
- Consulting services to EU clients
- Software licenses to EU businesses

## Record Keeping

### Invoice requirements (Royal Decree 1619/2012):

**Must include**:
1. Sequential invoice number
2. Issue date
3. NIF/CIF of both parties
4. Description of service
5. Tax base (amount before VAT)
6. VAT rate applied (21%)
7. Total amount

**Special note**: If crypto-related, specify if transaction is:
- VAT-exempt (crypto sale/purchase)
- VAT-applicable (services, custody, etc.)

### Example invoices:

**VAT-exempt transaction**:
```
INVOICE #2025-001
Date: January 15, 2025

Sale of 1 Bitcoin
Amount: €45,000
VAT: EXEMPT (Art. 20.Uno.18º Ley IVA)
----------------------
TOTAL: €45,000
```

**VAT-applicable service**:
```
INVOICE #2025-002
Date: January 15, 2025

Blockchain consulting services
Amount: €5,000
VAT (21%): €1,050
----------------------
TOTAL: €6,050
```

## Special Regimes

### Simplified VAT Regime (Régimen Simplificado)

**For small businesses**:
- Based on modules/objectives (not actual turnover)
- Generally NOT recommended for crypto businesses (too unpredictable)

### Cash Accounting (Criterio de Caja)

**Allows VAT payment when actually collected**:
- Available if turnover < €2 million
- Helps cash flow
- Applies to both input and output VAT

**Example**:
```
Issue invoice in March: €12,100 (incl. €2,100 VAT)
Client pays in June
→ Declare and pay VAT in Q2 (when received), not Q1
```

## Common Mistakes

❌ **Charging VAT on crypto sales**
- Crypto transactions are EXEMPT

❌ **Not charging VAT on services**
- Consulting, custody, etc. MUST have 21% VAT

❌ **Forgetting reverse charge on EU services**
- Must be declared in Modelo 303

❌ **Poor invoice documentation**
- Must clearly state if exempt or taxable

❌ **Mixing crypto trading with services**
- Keep separate accounting

## Penalties

### Late filing:
- Fixed penalty: €100-€6,000
- Proportional: 5-20% of VAT due

### Incorrect VAT charged:
- Client charged too little VAT: You pay the difference
- Client charged too much VAT: Must refund and correct

### False information:
- 50-150% of evaded amount
- Criminal prosecution if > €120,000

## Annual Summary: Modelo 390

**Filed once per year** (January 1-30):
- Summary of all four quarterly Modelo 303 filings
- Reconciliation of total VAT charged vs. paid
- Breakdown by tax rate (21%, 10%, 4%)

**Must match** the sum of quarterly filings

## Digital Services and OSS

### One-Stop Shop (OSS) - EU wide:

**For digital services** to EU consumers:
- Register in one EU country (e.g., Spain)
- Charge VAT at customer's country rate
- File single quarterly return

**Example**:
```
Crypto course sold to:
- Spanish customer: 21% VAT
- German customer: 19% VAT
- French customer: 20% VAT

All declared in Spanish OSS return
```

## Practical Tips

### 1. Separate bank accounts
- Business account for VAT-inclusive transactions
- Crypto account for exempt transactions

### 2. Accounting software
- Use tools that handle VAT automatically
- Export reports for Modelo 303

### 3. Professional advice
- Consult gestor/accountant for complex situations
- Annual review of VAT compliance

### 4. Documentation
- Keep all invoices for 4+ years
- Digital backups recommended

## Checklist for Crypto Businesses

✅ Determine if you need VAT registration
✅ Register with AEAT (Modelo 036/037)
✅ Issue compliant invoices
✅ Distinguish exempt (crypto) from taxable (services) revenue
✅ File quarterly Modelo 303
✅ File annual Modelo 390
✅ Keep detailed records
✅ Apply reverse charge for EU services
✅ Verify EU client VAT numbers

## Resources

- **AEAT VAT Portal**: https://sede.agenciatributaria.gob.es
- **Ley 37/1992**: Spanish VAT Law
- **RD 1619/2012**: Invoice requirements
- **EU Directive 2006/112/EC**: EU VAT Directive
- **VIES Database**: Check EU VAT numbers

## Conclusion

Spanish VAT for crypto businesses is straightforward once you understand the key principle:

**Cryptocurrency transactions = VAT-EXEMPT**
**Services related to crypto = 21% VAT**

File quarterly (Modelo 303), keep good records, and when in doubt, consult a professional tax advisor (gestor).
