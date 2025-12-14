# Modelo 200 - Impuesto sobre Sociedades

## ¿Qué es el Modelo 200?

El Modelo 200 es la declaración anual del Impuesto sobre Sociedades (IS) que deben presentar las empresas españolas. Grava los beneficios obtenidos por sociedades mercantiles, asociaciones y fundaciones.

## Plazos de Presentación

- **Plazo general**: Dentro de los **25 días naturales** siguientes a los 6 meses posteriores al cierre del ejercicio
- **Ejercicio coincidente con año natural**: Del 1 al 25 de julio

## Tipos Impositivos 2024

### Tipo General

- **25%**: Sociedades mercantiles estándar
- **15%**: Entidades de nueva creación (primeros 2 años con beneficios)
- **23%**: Cooperativas fiscalmente protegidas
- **10%**: Fundaciones y asociaciones de utilidad pública
- **1%**: Fondos de pensiones

### Tipos Reducidos

- **Empresas de nueva creación**:
  - 15% primer período con base positiva
  - 15% período siguiente
  - 25% a partir del tercer período

## Base Imponible

**Base Imponible = Resultado Contable ± Ajustes Fiscales**

### Ajustes Fiscales Positivos (aumentan la base)

1. **Gastos no deducibles**:
   - Multas y sanciones
   - Donativos no justificados
   - Atenciones a clientes > límites
   - Retribuciones a administradores no justificadas

2. **Amortizaciones fiscalmente no deducibles**

3. **Deterioros de valor no admitidos fiscalmente**

### Ajustes Fiscales Negativos (reducen la base)

1. **Exenciones**:
   - Dividendos de participaciones > 5% (95% exento)
   - Rentas de establecimientos permanentes en el extranjero

2. **Deducciones por doble imposición**

3. **Reserva de capitalización** (hasta 2022):
   - 10% del incremento de fondos propios

## Criptomonedas en el Impuesto sobre Sociedades

### Tratamiento Contable (PGC)

Las criptomonedas se contabilizan según **BOICAC 1/2022**:

**Cuenta 206 - Aplicaciones informáticas** (si son para uso funcional)
- Amortización lineal según vida útil estimada

**Cuenta 540 - Inversiones financieras a corto plazo en instrumentos de patrimonio**
- Para criptos como inversión especulativa
- Valoración al coste o mercado (el menor)

### Ganancias y Pérdidas Patrimoniales Crypto

**Momento del devengo fiscal**:
- En la **transmisión onerosa** (venta, swap, pago con crypto)
- NO se tributa por mera revalorización (holding)

**Cálculo de la ganancia**:
```
Ganancia = Precio de venta - Precio de adquisición - Gastos asociados
```

**Método FIFO obligatorio** en España:
- First In, First Out
- Se venden primero las criptos adquiridas hace más tiempo

### Ejemplo Práctico: Sociedad Trading Crypto

**Datos del ejercicio 2024:**

**Operaciones:**
1. Enero: Compra 10 BTC a 40,000 € = 400,000 €
2. Marzo: Compra 5 BTC a 50,000 € = 250,000 €
3. Junio: Vende 8 BTC a 60,000 € = 480,000 €
4. Octubre: Vende 3 BTC a 55,000 € = 165,000 €

**Cálculo FIFO de ganancias:**

**Venta Junio (8 BTC a 60,000 €)**:
- Usa 8 BTC del lote de enero (40,000 € c/u)
- Coste: 8 × 40,000 = 320,000 €
- Ingreso: 8 × 60,000 = 480,000 €
- **Ganancia: 160,000 €**

**Venta Octubre (3 BTC a 55,000 €)**:
- Usa 2 BTC restantes de enero (40,000 € c/u)
- Usa 1 BTC de marzo (50,000 € c/u)
- Coste: (2 × 40,000) + (1 × 50,000) = 130,000 €
- Ingreso: 3 × 55,000 = 165,000 €
- **Ganancia: 35,000 €**

**Total ganancia patrimonial: 195,000 €**

**Resultado Contable**:
- Ingresos por ventas: 645,000 €
- Coste adquisiciones vendidas: 450,000 €
- Gastos operativos: 50,000 €
- **Resultado antes impuestos: 145,000 €**

**Ajustes fiscales**:
- Diferencia temporal por valoración: +50,000 €
- **Base imponible: 195,000 €**

**Cuota íntegra (25%): 48,750 €**

### Staking y Farming

**Consulta vinculante V0999-20**:

- **Rewards de staking**: Ingreso en el momento del devengo
- **Valoración**: Precio de mercado en el momento de recepción
- **Coste fiscal**: El valor declarado como ingreso

**Ejemplo:**
- Staking de 100 ETH genera 5 ETH de reward
- ETH cotiza a 2,000 € en ese momento
- **Ingreso fiscal: 5 × 2,000 = 10,000 €**
- Coste adquisición de esos 5 ETH: 10,000 € (para futuras ventas FIFO)

### Mining Empresarial

Si el mining es actividad económica:

**Ingresos**:
- Valor de mercado de las criptos minadas en el momento de generación
- Block rewards + transaction fees

**Gastos deducibles**:
- Electricidad
- Amortización de equipos (ASICs, GPUs)
- Alquiler de espacio
- Refrigeración
- Mantenimiento

**Cuenta de resultados tipo**:
```
Ingresos mining:                 100,000 €
- Electricidad:                   30,000 €
- Amortización equipos:           20,000 €
- Otros gastos:                   10,000 €
================================
Resultado antes impuestos:       40,000 €
Impuesto Sociedades (25%):       10,000 €
================================
Resultado neto:                  30,000 €
```

## Pagos Fraccionados (Modelo 202)

Las sociedades deben realizar **pagos a cuenta** del IS:

**Plazos**:
- Primer pago: 1-20 de abril
- Segundo pago: 1-20 de octubre
- Tercer pago: 1-20 de diciembre

**Métodos de cálculo**:

1. **Modalidad general** (18% del resultado):
   - 18% de la base imponible del período

2. **Modalidad por cuota** (5/12 de la cuota del año anterior):
   - Más previsible para empresas estables

## Deducciones Importantes

### Deducción por I+D+i

Aplicable a desarrollo de:
- Protocolos blockchain
- Smart contracts innovadores
- Sistemas de seguridad crypto

**Porcentajes**:
- 25% gastos I+D
- 12% innovación tecnológica

### Deducción por Digitalización

- 25% inversiones en ciberseguridad
- Aplicable a wallets empresariales, cold storage, HSM

## Obligaciones Contables Crypto

### Libros obligatorios:

1. **Libro Diario**: Todas las operaciones crypto
2. **Libro de Inventarios**: Valoración de cartera al cierre
3. **Cuentas Anuales**: Balance, PyG, Memoria

### Información a incluir en la Memoria:

- Política de valoración de criptomonedas
- Detalle de saldos y movimientos
- Riesgos asociados (volatilidad, liquidez)
- Compromisos de compra/venta
- Operaciones con partes vinculadas

## Pérdidas Fiscales (BINs)

Las **Bases Imponibles Negativas** son compensables:

- **Sin límite temporal** (desde 2015)
- **Límite cuantitativo**:
  - 70% de la base previa si cifra negocio > 20M €
  - 50% si > 60M €
  - 25% si > 60M € (adicional)

**Ejemplo con pérdidas crypto**:
- Año 2023: Pérdida de 100,000 € (BIN)
- Año 2024: Ganancia de 150,000 €
- Base imponible 2024: 150,000 - 100,000 = **50,000 €**
- Cuota IS: 50,000 × 25% = **12,500 €**

## Grupos de Consolidación Fiscal

Empresas crypto pueden formar grupo si:
- Participación ≥ 75% (directa o indirecta)
- Ambas residentes en España

**Ventajas**:
- Compensación de pérdidas entre sociedades del grupo
- Eliminación de operaciones intragrupo
- Diferimiento de ganancias internas

## Errores Comunes en Crypto

❌ **Error**: No declarar rewards de staking como ingresos
✅ **Correcto**: Declarar al valor de mercado en momento del devengo

❌ **Error**: Usar LIFO o precio medio ponderado
✅ **Correcto**: FIFO obligatorio en España

❌ **Error**: No activar gastos de mining (electricidad, equipos)
✅ **Correcto**: Capitalizar y amortizar según normativa

❌ **Error**: No documentar precio de mercado en operaciones
✅ **Correcto**: Mantener histórico de cotizaciones (CoinMarketCap, CoinGecko)

## Sanciones

**Infracciones graves**:
- No presentar declaración: 50%-150% cuota dejada de ingresar
- Datos falsos: 50%-150% cuota dejada de ingresar

**Infracciones leves**:
- Presentación fuera de plazo sin requerimiento: 100-6,000 €

## Recursos y Normativa

- **Ley 27/2014**: Ley del Impuesto sobre Sociedades
- **Real Decreto 634/2015**: Reglamento del IS
- **BOICAC 1/2022**: Contabilización de criptomonedas
- **Consulta vinculante V0999-20**: Tratamiento fiscal mining
- **Consulta V0999-21**: Staking y DeFi

## Relación con Otros Modelos

- **Modelo 202**: Pagos fraccionados trimestrales
- **Modelo 220**: Impuesto sobre Grupos de Sociedades
- **Modelo 232**: Operaciones vinculadas
