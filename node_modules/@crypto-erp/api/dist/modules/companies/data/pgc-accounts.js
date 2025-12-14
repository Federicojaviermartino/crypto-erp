"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get DEFAULT_CRYPTO_ASSETS () {
        return DEFAULT_CRYPTO_ASSETS;
    },
    get DEFAULT_INVOICE_SERIES () {
        return DEFAULT_INVOICE_SERIES;
    },
    get SPANISH_PGC_ACCOUNTS () {
        return SPANISH_PGC_ACCOUNTS;
    }
});
const SPANISH_PGC_ACCOUNTS = [
    // GROUP 1 - FINANCING (EQUITY & LIABILITIES)
    {
        code: '10',
        name: 'Capital',
        type: 'EQUITY'
    },
    {
        code: '100',
        name: 'Share Capital',
        type: 'EQUITY',
        parentCode: '10'
    },
    {
        code: '11',
        name: 'Reserves',
        type: 'EQUITY'
    },
    {
        code: '112',
        name: 'Legal Reserve',
        type: 'EQUITY',
        parentCode: '11'
    },
    {
        code: '113',
        name: 'Voluntary Reserves',
        type: 'EQUITY',
        parentCode: '11'
    },
    {
        code: '12',
        name: 'Profit and Loss',
        type: 'EQUITY'
    },
    {
        code: '120',
        name: 'Retained Earnings',
        type: 'EQUITY',
        parentCode: '12'
    },
    {
        code: '129',
        name: 'Profit or Loss for the Year',
        type: 'EQUITY',
        parentCode: '12'
    },
    {
        code: '17',
        name: 'Long-term Debts',
        type: 'LIABILITY'
    },
    {
        code: '170',
        name: 'Long-term Bank Loans',
        type: 'LIABILITY',
        parentCode: '17'
    },
    {
        code: '171',
        name: 'Long-term Payables',
        type: 'LIABILITY',
        parentCode: '17'
    },
    // GROUP 2 - NON-CURRENT ASSETS
    {
        code: '20',
        name: 'Intangible Assets',
        type: 'ASSET'
    },
    {
        code: '206',
        name: 'Software Applications',
        type: 'ASSET',
        parentCode: '20'
    },
    {
        code: '21',
        name: 'Property, Plant and Equipment',
        type: 'ASSET'
    },
    {
        code: '210',
        name: 'Land',
        type: 'ASSET',
        parentCode: '21'
    },
    {
        code: '211',
        name: 'Buildings',
        type: 'ASSET',
        parentCode: '21'
    },
    {
        code: '216',
        name: 'Furniture and Fixtures',
        type: 'ASSET',
        parentCode: '21'
    },
    {
        code: '217',
        name: 'IT Equipment',
        type: 'ASSET',
        parentCode: '21'
    },
    {
        code: '218',
        name: 'Vehicles',
        type: 'ASSET',
        parentCode: '21'
    },
    {
        code: '28',
        name: 'Accumulated Depreciation',
        type: 'ASSET'
    },
    {
        code: '281',
        name: 'Accumulated Depreciation - PPE',
        type: 'ASSET',
        parentCode: '28'
    },
    // GROUP 3 - INVENTORIES (INCLUDING CRYPTO)
    {
        code: '30',
        name: 'Merchandise',
        type: 'ASSET'
    },
    {
        code: '300',
        name: 'Merchandise A',
        type: 'ASSET',
        parentCode: '30'
    },
    {
        code: '305',
        name: 'Crypto Assets',
        type: 'ASSET',
        parentCode: '30'
    },
    {
        code: '305001',
        name: 'Bitcoin (BTC)',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305002',
        name: 'Ethereum (ETH)',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305003',
        name: 'USDT',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305004',
        name: 'USDC',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305005',
        name: 'BNB',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305006',
        name: 'Solana (SOL)',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305007',
        name: 'Polygon (MATIC)',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305008',
        name: 'DAI',
        type: 'ASSET',
        parentCode: '305'
    },
    {
        code: '305099',
        name: 'Other Crypto',
        type: 'ASSET',
        parentCode: '305'
    },
    // GROUP 4 - CREDITORS & DEBTORS
    {
        code: '40',
        name: 'Suppliers',
        type: 'LIABILITY'
    },
    {
        code: '400',
        name: 'Trade Payables',
        type: 'LIABILITY',
        parentCode: '40'
    },
    {
        code: '410',
        name: 'Advance Payments to Suppliers',
        type: 'ASSET',
        parentCode: '40'
    },
    {
        code: '43',
        name: 'Customers',
        type: 'ASSET'
    },
    {
        code: '430',
        name: 'Trade Receivables',
        type: 'ASSET',
        parentCode: '43'
    },
    {
        code: '438',
        name: 'Advance Payments from Customers',
        type: 'LIABILITY',
        parentCode: '43'
    },
    {
        code: '47',
        name: 'Public Administrations',
        type: 'LIABILITY'
    },
    {
        code: '470',
        name: 'Tax Receivable',
        type: 'ASSET',
        parentCode: '47'
    },
    {
        code: '472',
        name: 'Input VAT',
        type: 'ASSET',
        parentCode: '47'
    },
    {
        code: '473',
        name: 'Withholding Tax Paid',
        type: 'ASSET',
        parentCode: '47'
    },
    {
        code: '475',
        name: 'Tax Payable',
        type: 'LIABILITY',
        parentCode: '47'
    },
    {
        code: '477',
        name: 'Output VAT',
        type: 'LIABILITY',
        parentCode: '47'
    },
    {
        code: '4750',
        name: 'Corporate Tax Payable',
        type: 'LIABILITY',
        parentCode: '475'
    },
    {
        code: '4751',
        name: 'IRPF Withholding Payable',
        type: 'LIABILITY',
        parentCode: '475'
    },
    // GROUP 5 - FINANCIAL ACCOUNTS
    {
        code: '52',
        name: 'Short-term Debts',
        type: 'LIABILITY'
    },
    {
        code: '520',
        name: 'Short-term Bank Loans',
        type: 'LIABILITY',
        parentCode: '52'
    },
    {
        code: '57',
        name: 'Cash and Banks',
        type: 'ASSET'
    },
    {
        code: '570',
        name: 'Cash',
        type: 'ASSET',
        parentCode: '57'
    },
    {
        code: '572',
        name: 'Banks',
        type: 'ASSET',
        parentCode: '57'
    },
    {
        code: '5720',
        name: 'Bank Account EUR',
        type: 'ASSET',
        parentCode: '572'
    },
    {
        code: '5721',
        name: 'Bank Account USD',
        type: 'ASSET',
        parentCode: '572'
    },
    {
        code: '5728',
        name: 'Crypto Exchange Account',
        type: 'ASSET',
        parentCode: '572'
    },
    // GROUP 6 - EXPENSES
    {
        code: '60',
        name: 'Purchases',
        type: 'EXPENSE'
    },
    {
        code: '600',
        name: 'Merchandise Purchases',
        type: 'EXPENSE',
        parentCode: '60'
    },
    {
        code: '606',
        name: 'Crypto Purchases',
        type: 'EXPENSE',
        parentCode: '60'
    },
    {
        code: '62',
        name: 'External Services',
        type: 'EXPENSE'
    },
    {
        code: '621',
        name: 'Leases and Rentals',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '622',
        name: 'Repairs',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '623',
        name: 'Professional Services',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '624',
        name: 'Transport',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '625',
        name: 'Insurance',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '626',
        name: 'Banking and Similar Services',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '627',
        name: 'Advertising and Publicity',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '628',
        name: 'Utilities',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '629',
        name: 'Other External Services',
        type: 'EXPENSE',
        parentCode: '62'
    },
    {
        code: '63',
        name: 'Taxes',
        type: 'EXPENSE'
    },
    {
        code: '631',
        name: 'Other Taxes',
        type: 'EXPENSE',
        parentCode: '63'
    },
    {
        code: '64',
        name: 'Personnel Expenses',
        type: 'EXPENSE'
    },
    {
        code: '640',
        name: 'Wages and Salaries',
        type: 'EXPENSE',
        parentCode: '64'
    },
    {
        code: '642',
        name: 'Social Security Expenses',
        type: 'EXPENSE',
        parentCode: '64'
    },
    {
        code: '66',
        name: 'Financial Expenses',
        type: 'EXPENSE'
    },
    {
        code: '662',
        name: 'Interest on Debts',
        type: 'EXPENSE',
        parentCode: '66'
    },
    {
        code: '663',
        name: 'Bank Charges',
        type: 'EXPENSE',
        parentCode: '66'
    },
    {
        code: '668',
        name: 'Negative Exchange Differences',
        type: 'EXPENSE',
        parentCode: '66'
    },
    {
        code: '6680',
        name: 'Crypto Losses',
        type: 'EXPENSE',
        parentCode: '668'
    },
    {
        code: '68',
        name: 'Depreciation',
        type: 'EXPENSE'
    },
    {
        code: '681',
        name: 'Depreciation - Intangible',
        type: 'EXPENSE',
        parentCode: '68'
    },
    {
        code: '682',
        name: 'Depreciation - PPE',
        type: 'EXPENSE',
        parentCode: '68'
    },
    // GROUP 7 - INCOME
    {
        code: '70',
        name: 'Sales',
        type: 'INCOME'
    },
    {
        code: '700',
        name: 'Sales of Merchandise',
        type: 'INCOME',
        parentCode: '70'
    },
    {
        code: '705',
        name: 'Sales of Services',
        type: 'INCOME',
        parentCode: '70'
    },
    {
        code: '706',
        name: 'Crypto Sales',
        type: 'INCOME',
        parentCode: '70'
    },
    {
        code: '75',
        name: 'Other Operating Income',
        type: 'INCOME'
    },
    {
        code: '759',
        name: 'Other Operating Income',
        type: 'INCOME',
        parentCode: '75'
    },
    {
        code: '76',
        name: 'Financial Income',
        type: 'INCOME'
    },
    {
        code: '768',
        name: 'Positive Exchange Differences',
        type: 'INCOME',
        parentCode: '76'
    },
    {
        code: '7680',
        name: 'Crypto Gains',
        type: 'INCOME',
        parentCode: '768'
    },
    {
        code: '769',
        name: 'Other Financial Income',
        type: 'INCOME',
        parentCode: '76'
    },
    {
        code: '7690',
        name: 'Staking Rewards',
        type: 'INCOME',
        parentCode: '769'
    },
    {
        code: '77',
        name: 'Extraordinary Income',
        type: 'INCOME'
    },
    {
        code: '778',
        name: 'Extraordinary Income',
        type: 'INCOME',
        parentCode: '77'
    },
    {
        code: '7780',
        name: 'Airdrop Income',
        type: 'INCOME',
        parentCode: '778'
    }
];
const DEFAULT_INVOICE_SERIES = [
    {
        code: 'F',
        name: 'Standard Invoices',
        type: 'STANDARD',
        isDefault: true
    },
    {
        code: 'FS',
        name: 'Simplified Invoices',
        type: 'SIMPLIFIED',
        isDefault: false
    },
    {
        code: 'R',
        name: 'Credit Notes',
        type: 'CREDIT_NOTE',
        isDefault: false
    }
];
const DEFAULT_CRYPTO_ASSETS = [
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        coingeckoId: 'bitcoin'
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        coingeckoId: 'ethereum'
    },
    {
        symbol: 'USDT',
        name: 'Tether',
        decimals: 6,
        coingeckoId: 'tether'
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coingeckoId: 'usd-coin'
    },
    {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        coingeckoId: 'binancecoin'
    },
    {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        coingeckoId: 'solana'
    },
    {
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        coingeckoId: 'matic-network'
    },
    {
        symbol: 'DAI',
        name: 'Dai',
        decimals: 18,
        coingeckoId: 'dai'
    }
];

//# sourceMappingURL=pgc-accounts.js.map