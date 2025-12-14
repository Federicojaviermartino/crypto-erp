# BOICAC - Contabilización de Criptomonedas y Blockchain

## Introducción

El **BOICAC** (Boletín del Instituto de Contabilidad y Auditoría de Cuentas) es la publicación oficial del ICAC que establece criterios contables vinculantes en España.

**BOICAC 1/2022 (Consulta 1)**: Primera guía oficial para la contabilización de criptomonedas en España.

## Marco Normativo

- **Plan General de Contabilidad (PGC)**: RD 1514/2007
- **BOICAC 1/2022**: Tratamiento contable de criptomonedas
- **NIC 38**: Activos intangibles (referencia internacional)
- **Ley 27/2014**: Impuesto sobre Sociedades (tratamiento fiscal)

## Clasificación Contable de Criptomonedas

### Criterio Principal: Finalidad de Tenencia

#### 1. Criptomonedas como Inversión (Especulación)

**Cuenta contable**: **540 - Inversiones financieras a corto plazo en instrumentos de patrimonio**

**Cuando aplica**:
- Compradas para reventa a corto plazo
- Trading activo
- Expectativa de beneficio por apreciación

**Valoración inicial**: Precio de adquisición + costes de transacción

**Valoración posterior**:
- **Coste** o **valor razonable** (el menor)
- Si hay pérdida de valor: Deterioro en PyG
- Si hay recuperación: Reversión (hasta límite del coste)

**Ejemplo**:
```
Compra: 1 BTC a 40,000 € + 50 € comisión
Valoración inicial: 40,050 €

Al cierre: BTC cotiza a 35,000 €
Deterioro: 40,050 - 35,000 = 5,050 €

Asiento deterioro:
-------------------------------
(698) Pérdidas por deterioro    5,050
  a (594) Deterioro valor inv.          5,050
-------------------------------
```

#### 2. Criptomonedas para Uso Operativo

**Cuenta contable**: **206 - Aplicaciones informáticas**

**Cuando aplica**:
- Criptos usadas en la actividad empresarial
- Tokens de utilidad (utility tokens)
- Stablecoins para pagos recurrentes

**Amortización**: Lineal según vida útil estimada (generalmente NO amortizable si mantiene valor)

**Ejemplo**:
```
Empresa tiene 10,000 USDT para pagos a proveedores

Asiento compra:
-------------------------------
(206) Aplicaciones informáticas  10,000
  a (572) Bancos                         10,000
-------------------------------
```

#### 3. Criptomonedas como Existencias (Comercio)

**Cuenta contable**: **300-399 - Existencias**

**Cuando aplica**:
- Empresas dedicadas al comercio de criptos (exchanges)
- Actividad principal es compraventa

**Valoración**: Precio de adquisición o coste de producción (mining)

**Ejemplo Exchange**:
```
Compra para inventario: 100 ETH a 2,000 € = 200,000 €

Asiento:
-------------------------------
(310) Existencias criptomonedas  200,000
  a (400) Proveedores                     200,000
-------------------------------

Venta: 50 ETH a 2,200 € = 110,000 €

Asiento venta:
-------------------------------
(430) Clientes                    110,000
  a (700) Ventas                           110,000
-------------------------------

Asiento coste:
-------------------------------
(610) Variación existencias       100,000
  a (310) Existencias                     100,000
-------------------------------

Ganancia: 110,000 - 100,000 = 10,000 €
```

## Operaciones Específicas

### A) Compra de Criptomonedas

**Empresa inversora** (no es su actividad principal):

```
Compra 5 BTC a 45,000 € = 225,000 €
Comisión exchange: 500 €

Asiento:
-------------------------------
(540) Inversiones financieras CP  225,500
  a (572) Bancos                           225,500
-------------------------------
```

### B) Venta de Criptomonedas

```
Venta 5 BTC a 50,000 € = 250,000 €
Coste original: 225,500 €
Comisión venta: 300 €

Asiento:
-------------------------------
(572) Bancos                       249,700
(668) Gastos financieros               300
  a (540) Inversiones fin. CP              225,500
  a (768) Beneficios activos fin.           24,500
-------------------------------

Resultado: 250,000 - 225,500 - 300 = 24,200 € neto
```

### C) Swap entre Criptomonedas

**Permuta NO comercial** (no genera ingreso fiscal inmediato):

```
Cambio 1 BTC (coste 40,000 €) por 20 ETH
ETH cotiza a 2,100 € → Valor recibido: 42,000 €

Asiento:
-------------------------------
(540) Inv. fin. CP - ETH           40,000
(768) Beneficio activos fin.        2,000
  a (540) Inv. fin. CP - BTC               40,000
  a (768) Beneficio por permuta             2,000
-------------------------------

Nota: Fiscalmente tributa la ganancia de 2,000 €
```

### D) Staking Rewards

**Recepción de rewards** (consulta BOICAC 2/2023):

```
Staking de 100 ETH genera 3 ETH de reward
Valor de mercado al recibirlos: 2,000 € × 3 = 6,000 €

Asiento:
-------------------------------
(540) Inversiones fin. CP           6,000
  a (769) Otros ingresos fin.              6,000
-------------------------------

Base de coste fiscal de esos 3 ETH: 6,000 €
```

### E) Mining

**Generación por mining** (actividad empresarial):

```
Minado 0.5 BTC con coste eléctrico 5,000 €
BTC cotiza a 45,000 € → Valor generado: 22,500 €

Asiento producción:
-------------------------------
(540) Inversiones fin. CP          22,500
  a (773) Ingresos producción              22,500
-------------------------------

Asiento costes:
-------------------------------
(628) Suministros (electricidad)   5,000
  a (572) Bancos                            5,000
-------------------------------

Resultado: 22,500 - 5,000 = 17,500 €
```

### F) Airdrops

**Recepción gratuita de tokens**:

```
Recibido airdrop de 1,000 tokens
Valor de mercado: 5 € × 1,000 = 5,000 €

Asiento:
-------------------------------
(540) Inversiones fin. CP           5,000
  a (774) Subvenciones/donaciones          5,000
-------------------------------

Base coste fiscal: 5,000 €
```

## Cierre del Ejercicio

### Valoración de Cartera

**Regla**: Coste o mercado, el menor (principio de prudencia)

**Ejemplo cierre 31/12**:
```
Cartera:
- 10 BTC comprados a 40,000 € = 400,000 € (coste)
- Cotización al cierre: 35,000 €
- Valor de mercado: 10 × 35,000 = 350,000 €

Deterioro: 400,000 - 350,000 = 50,000 €

Asiento:
-------------------------------
(698) Pérdidas por deterioro       50,000
  a (594) Deterioro valor inv.             50,000
-------------------------------
```

### Reversión de Deterioro

**Año siguiente**, si BTC recupera a 42,000 €:

```
Valor mercado: 10 × 42,000 = 420,000 €
Límite reversión: 400,000 € (coste original)
Reversión: 50,000 € (total del deterioro previo)

Asiento:
-------------------------------
(594) Deterioro valor inv.         50,000
  a (798) Reversión deterioro              50,000
-------------------------------

Valor contable final: 400,000 €
(nunca supera el coste original)
```

## Información en Memoria

### Apartado 5 - Normas de Valoración

Debe incluir:
- **Criterio de clasificación** (inversión, existencias, uso)
- **Método de valoración** (coste, mercado)
- **Política de deterioros**
- **Amortización** (si aplica)

**Ejemplo**:
```
"Las criptomonedas mantenidas con finalidad especulativa se
clasifican como inversiones financieras a corto plazo (cuenta 540).
Se valoran al coste o mercado, el menor. Los deterioros se registran
cuando el valor de mercado es inferior al coste de adquisición,
siendo reversibles hasta el límite del coste original."
```

### Apartado 9 - Activos Financieros

Desglose de cartera:
```
Inversiones financieras a corto plazo:
- Bitcoin (BTC): 10 unidades, coste 400,000 €, valor mercado 420,000 €
- Ethereum (ETH): 100 unidades, coste 200,000 €, valor mercado 180,000 €
- Deterioro acumulado: -20,000 €
Total valor contable: 580,000 €
```

### Apartado 19 - Información sobre Medio Ambiente

Si el mining tiene impacto ambiental significativo:
- Consumo eléctrico anual
- Emisiones de CO2 estimadas
- Uso de energías renovables

## Consolidación Contable

**Grupos empresariales con actividad crypto**:

**Eliminaciones intragrupo**:
```
Si Sociedad A vende BTC a Sociedad B (mismo grupo):

Eliminación de resultado interno:
-------------------------------
(768) Beneficios intragrupo        10,000
  a (540) Inversiones fin. CP              10,000
-------------------------------
```

## Auditoría de Criptomonedas

### Verificaciones clave:

1. **Existencia**: Comprobar ownership con wallet addresses
2. **Propiedad**: Verificar control de private keys
3. **Valoración**: Contrastar con fuentes fiables (CoinMarketCap, CoinGecko)
4. **Integridad**: Conciliar saldos con exploradores blockchain
5. **Presentación**: Revisar clasificación contable correcta

### Procedimientos de auditoría:

```
Confirmación directa:
- Captura de pantalla de wallet con timestamp
- Firma digital de mensaje con private key
- Verificación en blockchain explorer

Valoración:
- Cotizaciones de 3 fuentes independientes
- Promedio del día de cierre
- Documentación de illiquid tokens
```

## Casos Especiales

### NFTs (Non-Fungible Tokens)

**Clasificación**:
- **Obra de arte digital**: Inmovilizado material (211)
- **Derecho de explotación**: Inmovilizado intangible (203)
- **Inversión especulativa**: Inversión financiera (540)

**Ejemplo NFT arte**:
```
Compra Bored Ape por 100 ETH (200,000 €)

Asiento:
-------------------------------
(211) Obras de arte                200,000
  a (540) Inv. fin. CP (ETH)               200,000
-------------------------------

No amortizable (obra de arte)
Deterioro si valor mercado < coste
```

### DeFi (Lending, Liquidity Pools)

**Lending (préstamo de criptos)**:
```
Préstamo de 10 ETH a protocolo DeFi
Valor: 20,000 €

Asiento:
-------------------------------
(543) Créditos a CP                 20,000
  a (540) Inv. fin. CP                     20,000
-------------------------------

Intereses devengados mensuales: 100 €

Asiento mensual:
-------------------------------
(546) Intereses a CP                  100
  a (762) Ingresos créditos                  100
-------------------------------
```

**Liquidity Pools**:
```
Aporte a pool Uniswap: 10 ETH + 20,000 USDT
Recibo LP tokens que representan mi participación

Valoración: Valor de los activos aportados
Clasificación: Inversión financiera (540)

Complicación: Impermanent loss requiere ajustes periódicos
```

### Tokens de Gobernanza

**Clasificación**: Inversión financiera o inmovilizado según uso

```
Compra 1,000 UNI (Uniswap governance)
Finalidad: Participar en decisiones del protocolo

Si uso operativo:
-------------------------------
(250) Inv. fin. LP en instr. patr.  5,000
  a (572) Bancos                             5,000
-------------------------------

Si inversión especulativa:
-------------------------------
(540) Inv. fin. CP                   5,000
  a (572) Bancos                             5,000
-------------------------------
```

## Normativa Futura

**Regulación europea MiCA** (Markets in Crypto-Assets):
- Entrada vigor: 2024-2025
- Afectará clasificación contable de stablecoins
- Nuevos requisitos de información para PSACs (Proveedores de Servicios de Activos Criptográficos)

## Resumen - Criterios Clave

✅ **Clasificación por finalidad**, no por naturaleza del activo
✅ **Valoración prudente**: Coste o mercado, el menor
✅ **Documentación exhaustiva**: Precios, fechas, transacciones
✅ **Memoria detallada**: Políticas contables claras
✅ **FIFO fiscal obligatorio**, aunque contablemente se pueda usar otro
✅ **Deterioros reversibles** hasta límite del coste

## Referencias Normativas

- **BOICAC 1/2022**: Consulta 1 sobre criptomonedas
- **NRV 6ª PGC**: Norma de valoración de activos financieros
- **NRV 9ª PGC**: Instrumentos financieros
- **Resolución ICAC 9 enero 2023**: Actualización criterios
