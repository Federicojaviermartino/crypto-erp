# Plan General Contable (PGC) - Cuentas Detalladas para Crypto

## Grupos del PGC

El Plan General Contable se estructura en **9 grupos**:

- **Grupo 1**: Financiación básica
- **Grupo 2**: Activo no corriente (inmovilizado)
- **Grupo 3**: Existencias
- **Grupo 4**: Acreedores y deudores por operaciones comerciales
- **Grupo 5**: Cuentas financieras
- **Grupo 6**: Compras y gastos
- **Grupo 7**: Ventas e ingresos
- **Grupo 8**: Gastos imputados al patrimonio neto
- **Grupo 9**: Ingresos imputados al patrimonio neto

## Cuentas Específicas para Criptomonedas

### GRUPO 2 - Activo No Corriente

#### 206 - Aplicaciones informáticas

**Uso**: Criptomonedas destinadas a uso operativo (no especulación)

**Subcuentas recomendadas**:
- **2060 - Stablecoins operativas**: USDT, USDC para pagos
- **2061 - Tokens de utilidad**: Tokens usados en plataformas propias
- **2062 - Criptomonedas funcionales**: BTC/ETH para servicios blockchain

**Amortización**: Generalmente NO amortizable si mantienen valor

**Ejemplo**:
```
Cuenta 2060 - USDT para pagos recurrentes
Saldo: 50,000 USDT = 50,000 €
No se deprecia (stablecoin 1:1)
```

#### 250 - Inversiones financieras a largo plazo

**Uso**: Criptos mantenidas >12 meses como inversión

**Subcuentas**:
- **2500 - Bitcoin largo plazo**
- **2501 - Ethereum largo plazo**
- **2502 - Otros activos crypto LP**

### GRUPO 3 - Existencias

#### 310 - Existencias de criptomonedas

**Uso**: Exchanges y comercio de criptos como actividad principal

**Subcuentas por tipo**:
- **3100 - Bitcoin (existencias)**
- **3101 - Ethereum (existencias)**
- **3102 - Altcoins (existencias)**
- **3103 - Stablecoins (existencias)**
- **3104 - NFTs para venta**

**Valoración**: Precio de adquisición o coste producción

**Ejemplo Exchange**:
```
Cuenta 3100 - Existencias BTC
Compra 1: 10 BTC a 40,000 € = 400,000 €
Compra 2: 5 BTC a 42,000 € = 210,000 €
Total: 15 BTC = 610,000 € (coste medio: 40,667 €/BTC)

Valoración al cierre (si BTC = 38,000 €):
Coste: 610,000 €
Mercado: 15 × 38,000 = 570,000 €
Deterioro: 40,000 €
```

### GRUPO 4 - Acreedores y Deudores

#### 430 - Clientes (ventas crypto)

**Subcuentas**:
- **4300 - Clientes venta criptomonedas**
- **4301 - Clientes servicios blockchain**
- **4302 - Clientes minería (hosting)**

#### 400 - Proveedores (compras crypto)

**Subcuentas**:
- **4000 - Exchanges (proveedores)**
- **4001 - Proveedores hardware mining**
- **4002 - Servicios blockchain externos**

### GRUPO 5 - Cuentas Financieras

#### 540 - Inversiones financieras a corto plazo

**Uso principal**: Criptos como inversión especulativa (<12 meses)

**Subcuentas detalladas**:
- **5400 - Bitcoin especulativo CP**
- **5401 - Ethereum especulativo CP**
- **5402 - Polkadot CP**
- **5403 - Solana CP**
- **5404 - Stablecoins inversión CP**
- **5405 - DeFi tokens CP**
- **5406 - NFTs inversión CP**
- **5407 - Governance tokens CP**

**Ejemplo**:
```
Cuenta 5400 - Bitcoin especulativo
Compra: 5 BTC a 45,000 € = 225,000 €
Comisión: 500 €
Total: 225,500 €

Valoración cierre (BTC = 50,000 €):
Mercado: 5 × 50,000 = 250,000 €
Mantiene coste: 225,500 € (principio prudencia)
No se reconoce ganancia hasta venta
```

#### 543 - Créditos a corto plazo

**Uso**: Lending/staking en protocolos DeFi

**Subcuentas**:
- **5430 - Préstamos DeFi (Aave, Compound)**
- **5431 - Staking (Lido, Rocket Pool)**
- **5432 - Liquidity mining**

**Ejemplo**:
```
Cuenta 5430 - Préstamo Aave
Prestado: 100 ETH valorados en 200,000 €

Asiento:
-------------------------------
(5430) Préstamos DeFi            200,000
  a (540) Bitcoin especulativo           200,000
-------------------------------

Intereses devengados:
-------------------------------
(546) Intereses CP                   500
  a (762) Ingresos créditos             500
-------------------------------
```

#### 546 - Intereses a corto plazo

**Uso**: Intereses devengados no cobrados de staking/lending

#### 572 - Bancos

**Subcuentas específicas**:
- **5720 - Exchanges (Binance, Kraken)**
- **5721 - Wallets custodias (Coinbase Custody)**
- **5722 - Cold wallets (hardware)**
- **5723 - Hot wallets operativas**

**Ejemplo**:
```
Cuenta 5720 - Binance
Saldo: 10 BTC + 50 ETH + 100,000 USDT
Valoración: A precio mercado del día
```

#### 594 - Deterioro de inversiones financieras CP

**Uso**: Contrapartida deterioros reversibles crypto

**Subcuentas**:
- **5940 - Deterioro Bitcoin**
- **5941 - Deterioro Ethereum**
- **5942 - Deterioro Altcoins**

### GRUPO 6 - Gastos

#### 600 - Compras de criptomonedas

**Uso**: Solo para empresas con existencias crypto (exchanges)

**Subcuentas**:
- **6000 - Compras Bitcoin**
- **6001 - Compras Ethereum**
- **6002 - Compras Altcoins**

#### 610 - Variación de existencias

**Regularización** de existencias al cierre

#### 628 - Suministros (electricidad mining)

**Uso**: Coste eléctrico de minería

**Detalle mensual necesario** para imputación correcta

**Ejemplo**:
```
Cuenta 628 - Electricidad mining
Enero: 5,000 kWh × 0.12 €/kWh = 600 €
Febrero: 4,800 kWh × 0.13 €/kWh = 624 €
Total anual: 7,500 €
```

#### 668 - Gastos financieros (comisiones)

**Subcuentas**:
- **6680 - Comisiones exchange**
- **6681 - Comisiones blockchain (gas fees)**
- **6682 - Comisiones custodia**

**Ejemplo**:
```
Venta 1 BTC en Binance:
Importe: 45,000 €
Comisión: 45 € (0.1%)

Asiento:
-------------------------------
(572) Bancos                      44,955
(668) Gastos financieros              45
  a (540) Inversiones fin.              45,000
-------------------------------
```

#### 680 - Amortización inmovilizado intangible

**Uso**: Amortización equipos mining si capitalizados

**Subcuentas**:
- **6800 - Amortización ASICs**
- **6801 - Amortización GPUs**
- **6802 - Amortización software**

**Ejemplo**:
```
Compra 10 ASICs: 50,000 €
Vida útil: 3 años
Amortización anual: 50,000 / 3 = 16,667 €

Asiento anual:
-------------------------------
(680) Amortización inmo. intang.  16,667
  a (280) Amortización acumulada         16,667
-------------------------------
```

#### 698 - Pérdidas por deterioro

**Subcuentas**:
- **6980 - Deterioro criptomonedas CP**
- **6981 - Deterioro criptomonedas LP**
- **6982 - Deterioro existencias crypto**

### GRUPO 7 - Ingresos

#### 700 - Ventas de criptomonedas

**Uso**: Exchanges y comercio crypto como actividad

**Subcuentas**:
- **7000 - Ventas Bitcoin**
- **7001 - Ventas Ethereum**
- **7002 - Ventas Altcoins**

#### 705 - Prestaciones de servicios

**Subcuentas crypto**:
- **7050 - Servicios custodia wallets**
- **7051 - Comisiones trading**
- **7052 - Servicios staking**
- **7053 - Mining hosting**

**Ejemplo Custody Provider**:
```
Cuenta 7050 - Custodia wallets
Cliente 1: 100 BTC × 0.5% anual = 0.5 BTC = 22,500 €
Cliente 2: 500 ETH × 0.3% anual = 1.5 ETH = 3,000 €
Total ingresos custodia: 25,500 €/año
```

#### 762 - Ingresos de créditos

**Uso**: Intereses de staking/lending

**Subcuentas**:
- **7620 - Intereses staking ETH**
- **7621 - Intereses lending DeFi**
- **7622 - Rewards liquidity pools**

**Ejemplo**:
```
Cuenta 7620 - Staking ETH
100 ETH staked al 4% APY
Rewards anuales: 4 ETH
Valor al recibir: 4 × 2,000 = 8,000 €

Asiento mensual (667 €):
-------------------------------
(540) Inversiones fin. CP           667
  a (762) Ingresos créditos             667
-------------------------------
```

#### 768 - Beneficios en activos financieros

**Uso**: Ganancias realizadas por venta crypto

**Subcuentas**:
- **7680 - Beneficios venta Bitcoin**
- **7681 - Beneficios venta Ethereum**
- **7682 - Beneficios venta Altcoins**

**Ejemplo**:
```
Venta 2 BTC comprados a 40,000 €, vendidos a 50,000 €
Ganancia: (50,000 - 40,000) × 2 = 20,000 €

Asiento:
-------------------------------
(572) Bancos                     100,000
  a (540) Inversiones fin. BTC            80,000
  a (768) Beneficios venta BTC            20,000
-------------------------------
```

#### 773 - Trabajos realizados para activos (mining)

**Uso**: Activación de criptos generadas por mining

**Ejemplo**:
```
Minado 1 BTC con coste 10,000 €
BTC cotiza a 45,000 €

Asiento activación:
-------------------------------
(540) Inversiones fin. BTC        45,000
  a (773) Trabajos activos               45,000
-------------------------------
```

#### 774 - Subvenciones/donaciones (airdrops)

**Uso**: Airdrops y tokens gratuitos recibidos

#### 798 - Reversión del deterioro

**Uso**: Recuperación de valor de criptos previamente deterioradas

**Ejemplo**:
```
BTC deteriorado en 10,000 € (40k → 30k)
Año siguiente recupera a 42k (pero límite es 40k)
Reversión: 10,000 €

Asiento:
-------------------------------
(594) Deterioro valor inv.        10,000
  a (798) Reversión deterioro            10,000
-------------------------------
```

## Asientos Tipo - Ejemplos Completos

### 1. Compra Simple de BTC

```
Compra 1 BTC a 45,000 € + 50 € comisión

-------------------------------
(540) Bitcoin especulativo CP    45,050
  a (572) Binance                        45,050
-------------------------------
```

### 2. Venta con Ganancia

```
Venta 1 BTC comprado a 40,000 €, vendido a 50,000 €
Comisión: 50 €

-------------------------------
(572) Binance                    49,950
(668) Gastos financieros             50
  a (540) Bitcoin especulativo           40,000
  a (768) Beneficios venta BTC           10,000
-------------------------------
```

### 3. Swap BTC → ETH

```
Cambio 1 BTC (coste 40,000 €) por 20 ETH
ETH cotiza a 2,100 € = 42,000 € valor recibido

-------------------------------
(540) Ethereum especulativo CP   40,000
(768) Beneficio permuta           2,000
  a (540) Bitcoin especulativo           40,000
  a (768) Beneficio venta BTC             2,000
-------------------------------
```

### 4. Staking con Rewards Periódicos

```
Depositar 100 ETH en staking (valor 200,000 €)

-------------------------------
(543) Créditos CP - Staking     200,000
  a (540) Ethereum especulativo         200,000
-------------------------------

Recibir reward mensual: 0.3 ETH valorados en 600 €

-------------------------------
(540) Ethereum especulativo         600
  a (762) Ingresos staking               600
-------------------------------
```

### 5. Deterioro al Cierre

```
5 BTC con coste 45,000 € cada uno = 225,000 €
Cotización cierre: 40,000 €
Valor mercado: 5 × 40,000 = 200,000 €
Deterioro: 25,000 €

-------------------------------
(698) Pérdidas deterioro         25,000
  a (594) Deterioro valor BTC            25,000
-------------------------------
```

### 6. Mining - Generación de Cripto

```
Minado 0.5 BTC
Coste electricidad: 5,000 €
BTC cotiza a 45,000 € → Valor: 22,500 €

1) Activación del activo generado:
-------------------------------
(540) Bitcoin especulativo       22,500
  a (773) Trabajos para activos         22,500
-------------------------------

2) Registro del coste:
-------------------------------
(628) Suministros (electricidad) 5,000
  a (572) Bancos                          5,000
-------------------------------

Resultado: 22,500 - 5,000 = 17,500 € ganancia
```

## Balance y Cuenta de Resultados Tipo

### Balance de Situación - Empresa Trading Crypto

```
ACTIVO
─────────────────────────────────────
NO CORRIENTE
(25) Inv. fin. LP - BTC          500,000
(28) Amortización acumulada      -50,000
                                 --------
Total Activo No Corriente        450,000

CORRIENTE
(540) Inv. fin. CP - BTC       1,200,000
(540) Inv. fin. CP - ETH         400,000
(594) Deterioro                  -50,000
(572) Binance                    100,000
(430) Clientes                    50,000
                                ---------
Total Activo Corriente         1,700,000

TOTAL ACTIVO                   2,150,000
═════════════════════════════════════

PATRIMONIO NETO Y PASIVO
─────────────────────────────────────
PATRIMONIO NETO
(100) Capital social             500,000
(129) Resultados ejercicio       300,000
                                 --------
Total Patrimonio Neto            800,000

PASIVO CORRIENTE
(400) Proveedores                150,000
(475) HP acreedora                50,000
                                 --------
Total Pasivo                     200,000

TOTAL PN Y PASIVO              2,150,000
═════════════════════════════════════
```

### Cuenta de Resultados - Exchange Crypto

```
INGRESOS
─────────────────────────────────────
(705) Comisiones trading         500,000
(700) Venta criptomonedas      1,000,000
(768) Beneficios venta crypto    200,000
(762) Ingresos staking            20,000
                                ---------
Total Ingresos                 1,720,000

GASTOS
─────────────────────────────────────
(600) Compra criptomonedas       800,000
(668) Comisiones exchange         50,000
(628) Electricidad mining         30,000
(640) Sueldos y salarios         200,000
(642) Seguridad Social            60,000
(621) Arrendamientos              40,000
(698) Deterioro inversiones       50,000
                                ---------
Total Gastos                   1,230,000

RESULTADO ANTES IMPUESTOS        490,000
(6300) IS (25%)                 -122,500
                                ---------
RESULTADO DEL EJERCICIO          367,500
═════════════════════════════════════
```

## Recomendaciones Prácticas

✅ **Usar subcuentas** para cada criptomoneda (facilita trazabilidad)
✅ **Documentar todas las operaciones** con timestamps y hashes
✅ **Conciliar saldos contables** con wallets al cierre
✅ **Mantener histórico de cotizaciones** (CoinMarketCap, CoinGecko)
✅ **Aplicar FIFO fiscal** aunque contablemente uses otro método
✅ **Revisar deterioros trimestralmente** (principio prudencia)
✅ **Separar cuentas** por finalidad (inversión vs. operativa)

## Errores Comunes a Evitar

❌ Mezclar criptos de inversión con operativas
❌ No registrar comisiones como gasto financiero
❌ Olvidar deterioros al cierre del ejercicio
❌ No documentar precios de mercado
❌ Usar cuentas genéricas sin detalle
❌ No separar ganancias realizadas de no realizadas
