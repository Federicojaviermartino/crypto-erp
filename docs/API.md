# Crypto ERP API Documentation

## Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://crypto-erp-api.onrender.com/api/v1`

## Authentication

All API endpoints require authentication via JWT Bearer token unless specified otherwise.

### Headers

```http
Authorization: Bearer <access_token>
X-Company-Id: <company_uuid>
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST /auth/2fa/verify
Verify 2FA code.

**Request Body:**
```json
{
  "tempToken": "temp-jwt-token",
  "code": "123456"
}
```

---

### Analytics

#### GET /analytics/dashboard
Get dashboard metrics for the current company.

**Response:**
```json
{
  "totalCostBasis": 50000,
  "monthlyActivity": 25,
  "pendingInvoices": 5,
  "yearlyCapitalGain": 12000,
  "portfolioDistribution": [...],
  "monthlyTransactions": {...},
  "recentTransactions": [...]
}
```

#### GET /analytics/summary
Get complete dashboard summary with all metrics.

**Response:**
```json
{
  "overview": {
    "totalRevenue": 150000,
    "revenueChange": 15.5,
    "activeCustomers": 45,
    "pendingInvoices": 8,
    "portfolioValue": 85000
  },
  "revenue": {...},
  "users": {...},
  "invoices": {...},
  "crypto": {...},
  "recentActivity": [...]
}
```

#### GET /analytics/revenue
Get revenue metrics (MRR, ARR, growth).

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "mrr": 12500,
  "arr": 150000,
  "totalRevenue": 45000,
  "averageRevenuePerUser": 1250,
  "revenueGrowth": 8.5,
  "currency": "EUR"
}
```

#### GET /analytics/invoices
Get invoice analytics.

**Response:**
```json
{
  "totalInvoices": 120,
  "paidInvoices": 95,
  "pendingInvoices": 20,
  "overdueInvoices": 5,
  "totalAmount": 150000,
  "paidAmount": 125000,
  "collectionRate": 79.2,
  "averageDaysToPayment": 18,
  "invoicesByStatus": [...],
  "invoicesByMonth": [...]
}
```

#### GET /analytics/crypto
Get crypto portfolio analytics.

**Response:**
```json
{
  "totalValueEur": 85000,
  "totalCostBasis": 60000,
  "unrealizedGainLoss": 25000,
  "realizedGainLoss": 5000,
  "performancePercentage": 41.67,
  "holdingsByAsset": [...],
  "transactionVolume": {...},
  "monthlyPerformance": [...]
}
```

---

### Custom Reports

#### POST /analytics/reports
Create a custom report.

**Request Body:**
```json
{
  "name": "Monthly Revenue Report",
  "description": "Revenue metrics for the current month",
  "metrics": ["revenue", "invoices"],
  "timeRange": "month",
  "schedule": "monthly",
  "recipients": ["admin@example.com"]
}
```

#### GET /analytics/reports
List all reports for the company.

#### GET /analytics/reports/:id
Get a specific report.

#### GET /analytics/reports/:id/generate
Generate report data.

#### GET /analytics/reports/:id/export/pdf
Export report as PDF.

#### GET /analytics/reports/:id/export/excel
Export report as Excel (.xlsx).

#### DELETE /analytics/reports/:id
Delete a report.

---

### Invoices

#### GET /invoices
List invoices with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `status` (optional): DRAFT, SENT, PAID, CANCELLED
- `startDate`, `endDate` (optional)

#### POST /invoices
Create a new invoice.

**Request Body:**
```json
{
  "contactId": "uuid",
  "seriesId": "uuid",
  "issueDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "lines": [
    {
      "description": "Consulting services",
      "quantity": 10,
      "unitPrice": 150,
      "vatRate": 21
    }
  ]
}
```

#### GET /invoices/:id
Get invoice details.

#### PUT /invoices/:id
Update a draft invoice.

#### POST /invoices/:id/send
Send invoice via email.

#### POST /invoices/:id/mark-paid
Mark invoice as paid.

---

### Crypto Wallets

#### GET /wallets
List all wallets.

#### POST /wallets
Connect a new wallet.

**Request Body:**
```json
{
  "address": "0x...",
  "chain": "ethereum",
  "name": "Main Wallet"
}
```

#### POST /wallets/:id/sync
Trigger wallet synchronization.

#### GET /wallets/:id/transactions
Get wallet transactions.

---

### Contacts

#### GET /contacts
List contacts (customers/suppliers).

#### POST /contacts
Create a new contact.

**Request Body:**
```json
{
  "type": "CUSTOMER",
  "name": "Acme Corp",
  "taxId": "B12345678",
  "email": "contact@acme.com"
}
```

---

### OAuth / Integrations

#### GET /oauth/apps
List registered OAuth applications.

#### POST /oauth/apps
Register a new OAuth application.

#### POST /oauth/token
Exchange authorization code for tokens.

#### GET /integrations
List connected integrations (QuickBooks, Xero).

#### POST /integrations/quickbooks/connect
Initiate QuickBooks OAuth flow.

#### POST /integrations/xero/connect
Initiate Xero OAuth flow.

---

### Partners (White-Label)

#### GET /partners
List partner accounts.

#### POST /partners
Register as a partner.

#### GET /partners/customers
List partner's customers.

#### GET /partners/commissions
Get commission history.

---

### Health & Monitoring

#### GET /health
Basic health check.

#### GET /health/liveness
Kubernetes liveness probe.

#### GET /health/readiness
Kubernetes readiness probe.

#### GET /health/regional
Regional health with replica status.

---

## WebSocket API

Connect to `/analytics` namespace for real-time updates.

### Events

#### subscribe
Subscribe to real-time metrics.

```javascript
socket.emit('subscribe', {
  companyId: 'uuid',
  metrics: ['dashboard', 'revenue', 'invoices'],
  interval: 30000 // 30 seconds
});
```

#### metricsUpdate
Receive metrics updates.

```javascript
socket.on('metricsUpdate', (data) => {
  console.log(data.metrics);
  console.log(data.timestamp);
});
```

#### newInvoice
New invoice created notification.

#### newTransaction
New crypto transaction notification.

#### portfolioChange
Portfolio value change notification.

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

---

## Rate Limiting

- Default: 1000 requests/hour per API key
- Authenticated users: 10000 requests/hour
- OAuth apps: Configurable per app

---

## Pagination

All list endpoints support pagination:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

## Swagger UI

Interactive API documentation available at:
- Development: `http://localhost:3000/api-docs`
- Production: `https://crypto-erp-api.onrender.com/api-docs`
