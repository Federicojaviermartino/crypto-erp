/**
 * Prisma Database Seed Script
 * 
 * Seeds the database with:
 * - Spanish Chart of Accounts (PGC - Plan General Contable)
 * - Common cryptocurrency assets
 * - Default invoice series
 * - AI knowledge base documents
 * 
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// SPANISH CHART OF ACCOUNTS (PGC)
// ============================================================================

const SPANISH_CHART_OF_ACCOUNTS = [
  // Group 1: Basic Financing
  { code: '1', name: 'Basic Financing', type: 'EQUITY', isSystem: true },
  { code: '10', name: 'Capital', type: 'EQUITY', isSystem: true },
  { code: '100', name: 'Share Capital', type: 'EQUITY' },
  { code: '11', name: 'Reserves', type: 'EQUITY', isSystem: true },
  { code: '112', name: 'Legal Reserve', type: 'EQUITY' },
  { code: '113', name: 'Voluntary Reserves', type: 'EQUITY' },
  { code: '12', name: 'Prior Year Results', type: 'EQUITY', isSystem: true },
  { code: '120', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '121', name: 'Accumulated Losses', type: 'EQUITY' },
  { code: '129', name: 'Current Year Profit/Loss', type: 'EQUITY' },
  { code: '17', name: 'Long-term Debts', type: 'LIABILITY', isSystem: true },
  { code: '170', name: 'Long-term Bank Loans', type: 'LIABILITY' },
  
  // Group 2: Non-current Assets
  { code: '2', name: 'Non-current Assets', type: 'ASSET', isSystem: true },
  { code: '20', name: 'Intangible Assets', type: 'ASSET', isSystem: true },
  { code: '206', name: 'Software', type: 'ASSET' },
  { code: '21', name: 'Tangible Fixed Assets', type: 'ASSET', isSystem: true },
  { code: '211', name: 'Buildings', type: 'ASSET' },
  { code: '213', name: 'Machinery', type: 'ASSET' },
  { code: '216', name: 'Furniture', type: 'ASSET' },
  { code: '217', name: 'IT Equipment', type: 'ASSET' },
  { code: '25', name: 'Long-term Financial Investments', type: 'ASSET', isSystem: true },
  { code: '250', name: 'Long-term Investment in Crypto Assets', type: 'ASSET', isCrypto: true },
  { code: '28', name: 'Accumulated Depreciation', type: 'ASSET', isSystem: true },
  { code: '281', name: 'Accumulated Depreciation - Tangible Assets', type: 'ASSET' },
  
  // Group 3: Inventory
  { code: '3', name: 'Inventory', type: 'ASSET', isSystem: true },
  { code: '30', name: 'Goods', type: 'ASSET', isSystem: true },
  { code: '300', name: 'Goods A', type: 'ASSET' },
  { code: '305', name: 'Crypto Assets Inventory', type: 'ASSET', isSystem: true, isCrypto: true },
  { code: '305001', name: 'Bitcoin (BTC)', type: 'ASSET', isCrypto: true },
  { code: '305002', name: 'Ethereum (ETH)', type: 'ASSET', isCrypto: true },
  { code: '305003', name: 'USDT (Tether)', type: 'ASSET', isCrypto: true },
  { code: '305004', name: 'USDC', type: 'ASSET', isCrypto: true },
  { code: '305005', name: 'Other Crypto Assets', type: 'ASSET', isCrypto: true },
  
  // Group 4: Creditors and Debtors
  { code: '4', name: 'Creditors and Debtors', type: 'ASSET', isSystem: true },
  { code: '40', name: 'Suppliers', type: 'LIABILITY', isSystem: true },
  { code: '400', name: 'Trade Payables', type: 'LIABILITY' },
  { code: '410', name: 'Advance Payments to Suppliers', type: 'ASSET' },
  { code: '43', name: 'Customers', type: 'ASSET', isSystem: true },
  { code: '430', name: 'Trade Receivables', type: 'ASSET' },
  { code: '438', name: 'Advance Payments from Customers', type: 'LIABILITY' },
  { code: '47', name: 'Public Administration', type: 'ASSET', isSystem: true },
  { code: '470', name: 'VAT Receivable', type: 'ASSET' },
  { code: '471', name: 'Social Security Payable', type: 'LIABILITY' },
  { code: '472', name: 'Input VAT', type: 'ASSET' },
  { code: '473', name: 'Withholding Tax Payable', type: 'LIABILITY' },
  { code: '475', name: 'Tax Payable', type: 'LIABILITY' },
  { code: '476', name: 'Social Security Agencies', type: 'LIABILITY' },
  { code: '477', name: 'Output VAT', type: 'LIABILITY' },
  
  // Group 5: Financial Accounts
  { code: '5', name: 'Financial Accounts', type: 'ASSET', isSystem: true },
  { code: '52', name: 'Short-term Debts', type: 'LIABILITY', isSystem: true },
  { code: '520', name: 'Short-term Bank Loans', type: 'LIABILITY' },
  { code: '523', name: 'Suppliers of Fixed Assets - Short Term', type: 'LIABILITY' },
  { code: '57', name: 'Cash and Banks', type: 'ASSET', isSystem: true },
  { code: '570', name: 'Cash', type: 'ASSET' },
  { code: '5700', name: 'Crypto Wallets', type: 'ASSET', isSystem: true, isCrypto: true },
  { code: '572', name: 'Banks', type: 'ASSET' },
  { code: '5720', name: 'Bank EUR - Main Account', type: 'ASSET' },
  
  // Group 6: Expenses
  { code: '6', name: 'Expenses', type: 'EXPENSE', isSystem: true },
  { code: '60', name: 'Purchases', type: 'EXPENSE', isSystem: true },
  { code: '600', name: 'Purchases of Goods', type: 'EXPENSE' },
  { code: '602', name: 'Purchases of Other Supplies', type: 'EXPENSE' },
  { code: '607', name: 'Crypto Asset Purchases', type: 'EXPENSE', isCrypto: true },
  { code: '62', name: 'External Services', type: 'EXPENSE', isSystem: true },
  { code: '621', name: 'Leases and Rentals', type: 'EXPENSE' },
  { code: '622', name: 'Repairs and Maintenance', type: 'EXPENSE' },
  { code: '623', name: 'Professional Services', type: 'EXPENSE' },
  { code: '624', name: 'Transportation', type: 'EXPENSE' },
  { code: '625', name: 'Insurance Premiums', type: 'EXPENSE' },
  { code: '626', name: 'Bank Services', type: 'EXPENSE' },
  { code: '627', name: 'Advertising and PR', type: 'EXPENSE' },
  { code: '628', name: 'Utilities', type: 'EXPENSE' },
  { code: '629', name: 'Other Services', type: 'EXPENSE' },
  { code: '63', name: 'Taxes', type: 'EXPENSE', isSystem: true },
  { code: '631', name: 'Other Taxes', type: 'EXPENSE' },
  { code: '64', name: 'Staff Costs', type: 'EXPENSE', isSystem: true },
  { code: '640', name: 'Wages and Salaries', type: 'EXPENSE' },
  { code: '642', name: 'Social Security - Employer', type: 'EXPENSE' },
  { code: '66', name: 'Financial Expenses', type: 'EXPENSE', isSystem: true },
  { code: '662', name: 'Interest on Debts', type: 'EXPENSE' },
  { code: '6627', name: 'Crypto Transaction Fees', type: 'EXPENSE', isCrypto: true },
  { code: '668', name: 'Exchange Rate Losses', type: 'EXPENSE' },
  { code: '6688', name: 'Crypto Exchange Losses', type: 'EXPENSE', isCrypto: true },
  { code: '68', name: 'Depreciation', type: 'EXPENSE', isSystem: true },
  { code: '681', name: 'Depreciation of Intangible Assets', type: 'EXPENSE' },
  { code: '682', name: 'Depreciation of Tangible Assets', type: 'EXPENSE' },
  { code: '69', name: 'Provisions', type: 'EXPENSE', isSystem: true },
  { code: '694', name: 'Provisions for Trade Operations', type: 'EXPENSE' },
  
  // Group 7: Income
  { code: '7', name: 'Income', type: 'INCOME', isSystem: true },
  { code: '70', name: 'Sales', type: 'INCOME', isSystem: true },
  { code: '700', name: 'Sales of Goods', type: 'INCOME' },
  { code: '705', name: 'Sales of Services', type: 'INCOME' },
  { code: '707', name: 'Crypto Asset Sales', type: 'INCOME', isCrypto: true },
  { code: '75', name: 'Other Operating Income', type: 'INCOME', isSystem: true },
  { code: '759', name: 'Other Operating Income', type: 'INCOME' },
  { code: '76', name: 'Financial Income', type: 'INCOME', isSystem: true },
  { code: '762', name: 'Interest Income', type: 'INCOME' },
  { code: '768', name: 'Exchange Rate Gains', type: 'INCOME' },
  { code: '7688', name: 'Crypto Exchange Gains', type: 'INCOME', isCrypto: true },
  { code: '769', name: 'Other Financial Income', type: 'INCOME' },
  { code: '7691', name: 'Staking Rewards', type: 'INCOME', isCrypto: true },
  { code: '7692', name: 'DeFi Yield', type: 'INCOME', isCrypto: true },
  { code: '7693', name: 'Airdrops', type: 'INCOME', isCrypto: true },
  { code: '77', name: 'Extraordinary Income', type: 'INCOME', isSystem: true },
  { code: '778', name: 'Extraordinary Income', type: 'INCOME' },
];

// ============================================================================
// COMMON CRYPTO ASSETS
// ============================================================================

const CRYPTO_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', decimals: 8, coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, coingeckoId: 'ethereum' },
  { symbol: 'USDT', name: 'Tether', decimals: 6, coingeckoId: 'tether' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, coingeckoId: 'usd-coin' },
  { symbol: 'BNB', name: 'BNB', decimals: 18, coingeckoId: 'binancecoin' },
  { symbol: 'SOL', name: 'Solana', decimals: 9, coingeckoId: 'solana' },
  { symbol: 'MATIC', name: 'Polygon', decimals: 18, coingeckoId: 'matic-network' },
  { symbol: 'AVAX', name: 'Avalanche', decimals: 18, coingeckoId: 'avalanche-2' },
  { symbol: 'DOT', name: 'Polkadot', decimals: 10, coingeckoId: 'polkadot' },
  { symbol: 'LINK', name: 'Chainlink', decimals: 18, coingeckoId: 'chainlink' },
  { symbol: 'DAI', name: 'Dai', decimals: 18, coingeckoId: 'dai' },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18, coingeckoId: 'uniswap' },
  { symbol: 'AAVE', name: 'Aave', decimals: 18, coingeckoId: 'aave' },
  { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, coingeckoId: 'weth' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
  { symbol: 'ARB', name: 'Arbitrum', decimals: 18, coingeckoId: 'arbitrum' },
  { symbol: 'OP', name: 'Optimism', decimals: 18, coingeckoId: 'optimism' },
];

// ============================================================================
// DEFAULT INVOICE SERIES
// ============================================================================

const INVOICE_SERIES = [
  { code: 'F', name: 'Standard Invoices', type: 'STANDARD', prefix: '', isDefault: true },
  { code: 'FS', name: 'Simplified Invoices', type: 'SIMPLIFIED', prefix: 'S' },
  { code: 'R', name: 'Credit Notes', type: 'CREDIT_NOTE', prefix: 'R' },
];

// ============================================================================
// AI KNOWLEDGE BASE DOCUMENTS (Sample)
// ============================================================================

const KNOWLEDGE_BASE_DOCS = [
  {
    title: 'FIFO Method for Crypto - Spain',
    type: 'REGULATION',
    content: `
In Spain, the FIFO (First In, First Out) method is mandatory for calculating the cost basis of cryptocurrency disposals.

Key Points:
1. When selling or exchanging crypto, the cost basis must be calculated using FIFO.
2. This means the oldest acquired units are considered sold first.
3. The cost basis includes the acquisition price plus any associated fees (exchange fees, network fees).
4. Gains/losses are calculated as: Sale Price - Cost Basis - Sale Fees.

Example:
- January: Buy 1 BTC at €30,000
- March: Buy 0.5 BTC at €35,000
- June: Sell 0.8 BTC at €40,000

Using FIFO:
- Cost basis for 0.8 BTC = €30,000 × 0.8 = €24,000 (all from January purchase)
- Sale proceeds = €40,000 × 0.8 = €32,000
- Capital gain = €32,000 - €24,000 = €8,000

Reference: BOICAC 120/2019, DGT V0999-19
    `,
  },
  {
    title: 'Modelo 721 - Crypto Assets Declaration',
    type: 'REGULATION',
    content: `
Model 721 is the informative declaration for cryptocurrency assets held in foreign exchanges.

Who must file:
- Spanish tax residents
- With crypto assets on exchanges outside Spain
- When the total value exceeds €50,000 at any point during the year

Key dates:
- Filing period: January 1 - March 31 (for the previous year)
- First year: Must declare if threshold exceeded on December 31 OR at any point

Information required:
1. Exchange name and country
2. Account/wallet identifier
3. Each cryptocurrency: symbol, balance on Jan 1, balance on Dec 31
4. Acquisition value and market value on December 31

Penalties for non-compliance:
- €5,000 per data item with minimum €10,000
- Late filing: €100 per item with minimum €1,500

Note: This obligation started in 2024 for the 2023 fiscal year.

Reference: Order HFP/886/2023
    `,
  },
  {
    title: 'Crypto Accounting Classification - PGC',
    type: 'REGULATION',
    content: `
According to Spanish accounting regulations (PGC), cryptocurrencies should be classified based on their intended use:

1. INVENTORY (Group 3 - Account 305xxx):
   - When the company's main activity involves trading crypto
   - When crypto is held for short-term trading
   - Valued at acquisition cost or net realizable value, whichever is lower

2. INTANGIBLE ASSETS (Group 2 - Account 250xxx):
   - When held as a long-term investment
   - When used as a store of value
   - Valued at acquisition cost, with impairment tests required

Valuation rules:
- Initial recognition: Acquisition cost (including fees)
- Subsequent: Cannot revalue above cost under Spanish GAAP
- Fees on purchase: Capitalize as part of cost
- Fees on sale: Expense in period of sale

Journal entry examples:

Purchase (as inventory):
(305001) Bitcoin     1,000.00
    (572) Banks           1,000.00

Sale with gain:
(572) Banks          1,500.00
    (305001) Bitcoin        800.00
    (7688) Crypto Gains     700.00

Reference: BOICAC 120/2019, ICAC Consultation
    `,
  },
  {
    title: 'Staking Rewards Tax Treatment - Spain',
    type: 'REGULATION',
    content: `
Staking rewards in Spain are taxable income at the moment of receipt.

Tax treatment:
1. Income recognition: When tokens are received in wallet
2. Tax base: Market value in EUR at the moment of receipt
3. Classification: Capital gains (savings base), NOT general income
4. Tax rates (2024): 19% (€0-6,000), 21% (€6,000-50,000), 23% (€50,000-200,000), 27% (€200,000-300,000), 28% (>€300,000)

Cost basis for future sales:
- The market value at receipt becomes the cost basis
- When sold, gain/loss = Sale price - Receipt value

Accounting:
(5700xx) Crypto Wallet     XXX
    (7691) Staking Rewards      XXX

Example:
- Receive 0.1 ETH staking reward
- ETH price at receipt: €2,000
- Taxable income: 0.1 × €2,000 = €200
- Cost basis for this 0.1 ETH: €200

Note: Unstaking (withdrawing staked tokens) is NOT a taxable event - only the rewards.

Reference: DGT V0593-21, V1766-22
    `,
  },
  {
    title: 'Verifactu Technical Requirements',
    type: 'REGULATION',
    content: `
Verifactu is Spain's verified billing system with the following technical requirements:

Hash Chain Requirements:
1. Algorithm: SHA-256
2. Fields included in hash:
   - Issuer NIF/CIF
   - Invoice series + number
   - Issue date (YYYY-MM-DD)
   - Total amount (2 decimal places)
   - Previous invoice hash (or "0" for first)
3. Hash format: 64-character hexadecimal string

QR Code Requirements:
- Minimum size: 30mm × 30mm when printed
- Error correction: Level M or H
- Content: AEAT verification URL with parameters
- Parameters: nif, numserie, fecha, importe, huella (first 16 chars of hash)

XML Submission:
- Endpoint: AEAT web service (SOAP)
- Authentication: Client digital certificate
- Format: XML per AEAT specification
- Response: Synchronous acceptance/rejection

Invoice Types (TipoFactura):
- F1: Standard invoice
- F2: Simplified invoice
- R1-R5: Credit notes (various reasons)

Key dates:
- Software compliance: July 29, 2025
- Corporations mandatory: January 1, 2026
- Self-employed mandatory: July 1, 2026

Reference: Real Decreto 1007/2023, Orden HFP/1177/2024
    `,
  },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

// ============================================================================
// DEMO USERS
// ============================================================================

const DEMO_USERS = [
  {
    email: 'admin@crypto-erp.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Demo',
    role: 'ADMIN' as const,
  },
  {
    email: 'client@crypto-erp.com',
    password: 'Client123!',
    firstName: 'Client',
    lastName: 'Demo',
    role: 'USER' as const,
  },
];

const DEMO_COMPANY = {
  name: 'Demo Company',
  legalName: 'Demo Company S.L.',
  taxId: 'B12345678',
  address: 'Calle Demo 123',
  city: 'Madrid',
  province: 'Madrid',
  postalCode: '28001',
  country: 'ES',
  email: 'demo@crypto-erp.com',
  phone: '+34 912 345 678',
  currency: 'EUR',
};

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Note: This seed creates template data that will be copied for each company
  // The actual seeding happens when a company is created

  // Create or get demo company
  console.log('🏢 Creating demo company...');
  let demoCompany = await prisma.company.findFirst({
    where: { taxId: DEMO_COMPANY.taxId },
  });

  if (!demoCompany) {
    demoCompany = await prisma.company.create({
      data: DEMO_COMPANY,
    });
    console.log(`  ✅ Created company: ${demoCompany.name}`);
  } else {
    console.log(`  ⏭️ Company already exists: ${demoCompany.name}`);
  }

  // Create demo users and associate with company
  console.log('👤 Creating demo users...');
  for (const demoUser of DEMO_USERS) {
    let user = await prisma.user.findUnique({
      where: { email: demoUser.email },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(demoUser.password, 12);
      user = await prisma.user.create({
        data: {
          email: demoUser.email,
          passwordHash,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          isActive: true,
        },
      });
      console.log(`  ✅ Created user: ${demoUser.email}`);
    } else {
      console.log(`  ⏭️ User already exists: ${demoUser.email}`);
    }

    // Associate user with demo company
    const existingCompanyUser = await prisma.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: demoCompany.id,
        },
      },
    });

    if (!existingCompanyUser) {
      await prisma.companyUser.create({
        data: {
          userId: user.id,
          companyId: demoCompany.id,
          role: demoUser.role,
          isDefault: true,
        },
      });
      console.log(`  ✅ Associated ${demoUser.email} with ${demoCompany.name} as ${demoUser.role}`);
    } else {
      console.log(`  ⏭️ User already associated with company: ${demoUser.email}`);
    }
  }
  
  console.log('📚 Seed data prepared:');
  console.log(`   - ${SPANISH_CHART_OF_ACCOUNTS.length} chart of accounts entries`);
  console.log(`   - ${CRYPTO_ASSETS.length} crypto assets`);
  console.log(`   - ${INVOICE_SERIES.length} invoice series templates`);
  console.log(`   - ${KNOWLEDGE_BASE_DOCS.length} knowledge base documents`);

  console.log('\n✅ Database seed completed!');
  console.log('\n📝 Note: Account and series data will be created for each company on registration.');
}

// Export seed data for use in application
export {
  SPANISH_CHART_OF_ACCOUNTS,
  CRYPTO_ASSETS,
  INVOICE_SERIES,
  KNOWLEDGE_BASE_DOCS,
};

// Run seed
seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
