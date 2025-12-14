# Cryptocurrency Taxation in Spain - Complete Guide

## Overview

Spain has established clear tax regulations for cryptocurrency transactions. This guide explains how crypto is taxed for both individuals and companies operating in Spain.

## Key Tax Authorities

- **AEAT** (Agencia Estatal de Administración Tributaria): Spanish Tax Agency
- **ICAC** (Instituto de Contabilidad y Auditoría de Cuentas): Accounting Institute
- **BOE** (Boletín Oficial del Estado): Official State Gazette

## Tax Treatment by Entity Type

### For Individuals (Personal Income Tax - IRPF)

**Tax Model**: Modelo 100 (Annual Personal Income Tax Return)

**Tax Rates** (Base del Ahorro / Savings Income):
- Up to €6,000: 19%
- €6,001 - €50,000: 21%
- €50,001 - €200,000: 23%
- €200,001 - €300,000: 27%
- Over €300,000: 28%

**Taxable Events**:
1. **Selling crypto for fiat** (EUR, USD, etc.)
2. **Trading one crypto for another** (BTC → ETH)
3. **Spending crypto** (paying for goods/services)
4. **Receiving crypto as payment** for work

**NOT Taxable**:
- Simply holding cryptocurrency (HODL)
- Transferring between your own wallets
- Receiving cryptocurrency as a gift (up to certain limits)

### For Companies (Corporate Income Tax - IS)

**Tax Model**: Modelo 200 (Annual Corporate Tax Return)

**Standard Rate**: 25%
**Reduced Rates**:
- 15% for newly created companies (first 2 profitable years)
- 23% for cooperatives
- 10% for foundations

## FIFO Method (Mandatory in Spain)

Spain requires **First-In, First-Out** (FIFO) accounting for cryptocurrency:

**Example**:
```
January: Buy 1 BTC at €30,000
June: Buy 1 BTC at €40,000
September: Sell 1.5 BTC at €50,000

Tax calculation:
- First 1 BTC sold: Cost €30,000, Sale €50,000 = €20,000 gain
- Next 0.5 BTC sold: Cost €20,000, Sale €25,000 = €5,000 gain
Total capital gain: €25,000
Tax (21% bracket): €5,250
```

## Major Tax Forms

### Modelo 721 - Crypto Holdings Abroad Declaration

**Who must file**: Individuals and companies with cryptocurrency holdings abroad exceeding €50,000

**Deadline**: Between January 1 and March 31 following the tax year

**What to report**:
- Virtual currencies held on foreign exchanges
- Balances as of December 31
- Cryptocurrency types and amounts

**Penalties for non-compliance**:
- Minimum €10,000 per unreported account
- Up to 150% of the value in severe cases

### Modelo 720 - Assets Abroad (General)

Cryptocurrency falls under **Group 8: Virtual Currencies**

**Threshold**: €50,000 aggregate value

**Important**: Even if you only hold €50,001 worth of crypto abroad, you MUST declare the ENTIRE amount, not just the excess.

### Modelo 100 - Personal Income Tax

**Annual declaration** of all income including crypto gains/losses

**Sections for crypto**:
- Capital gains/losses from sales
- Income from staking/mining/airdrops

### Modelo 200 - Corporate Income Tax

For companies with crypto activity:
- Trading gains as business income
- Mining revenue
- Staking rewards
- Accounting adjustments (BOICAC compliance)

## Specific Crypto Activities

### Mining

**Tax treatment**:

**For individuals**:
- Taxed as **self-employment income** (economic activity)
- Register with AEAT (Modelo 036/037)
- Pay quarterly estimated taxes (Modelo 130)

**For companies**:
- Revenue: Fair market value of mined crypto at generation
- Deductible expenses: Electricity, equipment depreciation, cooling
- Corporate tax on net profit

**Example**:
```
Mining results (Company):
Mined: 0.5 BTC at market value €22,500
Electricity: €5,000
Equipment depreciation: €3,000
Net profit: €14,500
Corporate tax (25%): €3,625
```

### Staking Rewards

**Consulta Vinculante V0999-20** (Binding ruling):

- Rewards are **taxable upon receipt**
- Valued at fair market price when received
- This becomes the cost basis for future sales

**Example**:
```
Stake 100 ETH, receive 3 ETH reward
ETH price at receipt: €2,000
Income: 3 × €2,000 = €6,000 (taxable)
Cost basis of 3 ETH: €6,000 (for FIFO when sold)
```

### DeFi (Lending, Liquidity Pools)

**Lending interest**: Taxed as capital income when received

**Liquidity pool rewards**:
- LP tokens represent ownership share
- Rewards taxed upon claim
- Impermanent loss NOT deductible until position closed

### Airdrops

**Free tokens received**:
- Taxed as **miscellaneous income** at fair market value
- If sold later, capital gains from cost basis = airdrop value

**Example**:
```
Receive 1,000 tokens worth €5,000 in airdrop
→ Income tax on €5,000 in year received

Sell later for €8,000
→ Capital gains tax on €3,000 (€8,000 - €5,000)
```

### NFTs

**Tax treatment**:
- Buy/sell taxed like any crypto transaction
- Capital gains on appreciation
- If created (artist), income from sale

## VAT (IVA) Treatment

**EU Directive 2018/822** and CJEU Case Hedqvist (C-264/14):

✅ **EXEMPT from VAT**:
- Buying/selling cryptocurrency
- Exchanging crypto for fiat
- Trading one crypto for another

❌ **Subject to 21% VAT**:
- Exchange trading fees/commissions
- Custody services
- Consulting/advisory services
- Mining hosting services
- Educational courses about crypto

**Example - Exchange in Spain**:
```
Trading fees collected: €10,000
VAT charged (21%): €2,100
Total invoiced: €12,100

Quarterly VAT return (Modelo 303):
VAT collected: €2,100
VAT paid on expenses: €735
Net VAT to pay: €1,365
```

## Accounting Rules (BOICAC 1/2022)

Spanish companies must follow **BOICAC** (Official accounting guidance):

### Classification based on purpose:

**1. Investment (Speculation)**
- Account: 540 - Short-term financial investments
- Valuation: Cost or market value (whichever is lower)
- Impairment: Recognized if market < cost (reversible)

**2. Operational use**
- Account: 206 - Software applications
- Generally NOT depreciated (maintains value)

**3. Trading inventory (Exchanges)**
- Account: 310 - Inventories
- Valuation: Acquisition cost
- For companies whose main activity is crypto trading

### Example Journal Entries:

**Purchase for investment**:
```
Dr. 540 Financial investments - BTC  €45,050
   Cr. 572 Bank (Binance)                    €45,050
```

**Sale with gain**:
```
Dr. 572 Bank                         €50,000
   Cr. 540 Financial investments            €40,000
   Cr. 768 Gains on financial assets        €10,000
```

**Year-end impairment** (BTC drops to €35k):
```
Dr. 698 Impairment losses            €5,000
   Cr. 594 Impairment allowance             €5,000
```

## Tax Optimization Strategies (Legal)

### 1. Tax Loss Harvesting

Sell losing positions to offset gains:
```
Crypto A: +€10,000 gain
Crypto B: -€3,000 loss
Net gain: €7,000
Tax: €7,000 × 21% = €1,470 (instead of €2,100)
```

**Warning**: Watch for "wash sale" interpretations - wait 2+ months before repurchasing.

### 2. Long-term Holding

While Spain doesn't differentiate tax rates by holding period (unlike US), holding longer:
- Defers tax liability
- Allows better timing of realization
- Potentially qualifies for future favorable legislation

### 3. Company Structure

For serious traders:
- €0-15,000 profit: Individual (19-21% IRPF)
- €15,000+ profit: Consider company (25% but more deductions)

### 4. Cost Basis Documentation

Maintain detailed records:
- Transaction hashes
- Timestamps
- Exchange statements
- Price at transaction time (CoinMarketCap, CoinGecko)

## Common Mistakes to Avoid

❌ **Not declaring crypto-to-crypto trades**
- ALL swaps are taxable events in Spain

❌ **Using average cost instead of FIFO**
- Only FIFO is accepted by AEAT

❌ **Forgetting foreign exchange reporting (Modelo 721)**
- Severe penalties for non-compliance

❌ **Not keeping transaction records**
- Burden of proof is on taxpayer

❌ **Assuming same rules as country of residence**
- Spanish tax residents must follow Spanish law regardless of nationality

❌ **Not declaring staking/airdrop income**
- All crypto income must be reported when received

## Penalties and Enforcement

### Late filing penalties:
- 5% surcharge if filed within 3 months
- 10% surcharge between 3-6 months
- 15% surcharge between 6-12 months
- 20% surcharge over 12 months
- Plus late-payment interest

### False information/fraud:
- 50-150% of tax evaded
- Potential criminal charges if amount > €120,000

### Modelo 721 non-compliance:
- Minimum €10,000 per unreported account
- Can exceed the actual crypto value!

## Recent Legal Developments

### 2025 Updates:
- **Verifactu** mandatory for invoicing (blockchain hash chain)
- Increased AEAT monitoring of exchange transactions
- EU-wide DAC8 reporting (exchanges must report to tax authorities)

### Consultas Vinculantes (Binding Rulings):
- **V0999-18**: Bitcoin VAT exemption confirmed
- **V0999-20**: Staking taxation clarified
- **V0999-21**: DeFi yield taxable upon receipt

## Documentation Requirements

### What to keep (minimum 4 years):

1. **Exchange statements** (monthly)
2. **Wallet transaction history** (with blockchain hashes)
3. **Price evidence** (screenshots from CoinMarketCap at transaction time)
4. **Modelo 721 filings** (copies with proof of submission)
5. **Cost basis calculations** (spreadsheet showing FIFO)
6. **Transfer records** between your own wallets (to prove non-taxable transfers)

### Recommended tools:
- **CoinTracking**: FIFO calculation, Spanish tax reports
- **Koinly**: Automatic exchange import, AEAT-compliant
- **Accointing**: Portfolio tracking with Spanish tax support

## Tax Planning Checklist

✅ Register with AEAT if engaging in regular crypto activity
✅ Keep detailed records of ALL transactions
✅ Calculate gains using FIFO method
✅ File Modelo 721 if holding > €50k abroad (by March 31)
✅ Declare capital gains in annual tax return (Modelo 100/200)
✅ Pay quarterly estimated taxes if self-employed miner/trader
✅ Charge VAT on services (custody, consulting) but NOT on crypto sales
✅ Consider professional tax advisor for complex situations

## Professional Resources

### Official sources:
- AEAT: https://sede.agenciatributaria.gob.es
- ICAC (Accounting): https://www.icac.gob.es
- BOE (Laws): https://www.boe.es

### Useful documents:
- BOICAC 1/2022: Crypto accounting rules
- Real Decreto 1007/2023: Verifactu regulation
- Ley 27/2014: Corporate Income Tax Law
- EU Directive 2018/822 (DAC6): Intermediary reporting

## Example: Complete Year Tax Flow

**Individual with crypto trading**:

```
JANUARY-DECEMBER Activities:
- Buy 2 BTC at €40,000 = €80,000
- Stake 50 ETH, earn 2 ETH (valued at €4,000)
- Sell 1 BTC at €55,000
- Receive €1,000 airdrop

FIFO Calculation (December):
Sale of 1 BTC:
- Cost: €40,000 (FIFO - first purchased)
- Proceeds: €55,000
- Gain: €15,000

Staking income: €4,000
Airdrop income: €1,000

Total taxable: €20,000
Tax (21% bracket): €4,200

MARCH (following year):
File Modelo 721 if crypto abroad > €50k

JUNE (following year):
File Modelo 100 (Personal Income Tax)
- Declare €15,000 capital gain
- Declare €5,000 misc income (staking + airdrop)
Pay €4,200 tax
```

## Conclusion

Spain has comprehensive crypto tax regulations. Key takeaways:

1. **All crypto gains are taxable** (sales, trades, spending)
2. **FIFO method is mandatory** (not average cost)
3. **Foreign holdings > €50k** require Modelo 721
4. **Keep detailed records** for all transactions
5. **Staking/mining/airdrops** are taxable upon receipt
6. **Crypto sales are VAT-exempt**, but services are not
7. **Penalties are severe** for non-compliance

When in doubt, consult a Spanish tax professional with cryptocurrency expertise.
