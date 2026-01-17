import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import Decimal from 'decimal.js';

interface Modelo721Position {
  // Identificación del bien
  tipoMoneda: string; // Código de la criptomoneda (BTC, ETH, etc.)
  nombreMoneda: string; // Nombre completo

  // Localización
  claveExchange: string; // Código del exchange/wallet
  nombreExchange: string;
  paisExchange: string; // Código ISO país

  // Valoración a 31 de diciembre
  saldoAFinDeAno: Decimal; // Cantidad de unidades
  valorEurAFinDeAno: Decimal; // Valor en EUR a 31/12

  // Datos de adquisición
  fechaAdquisicion: Date;
  valorAdquisicionEur: Decimal;

  // Porcentaje de titularidad
  porcentajeTitularidad: number;
}

export interface Modelo721Summary {
  ejercicio: number;
  fechaGeneracion: Date;
  totalValorEur: Decimal;
  posiciones: Modelo721Position[];
  obligadoDeclarar: boolean; // >50,000 EUR
  variacionSignificativa: boolean; // >20,000 EUR vs año anterior
}

export interface Modelo720CryptoItem {
  // Subgrupo 8: Monedas virtuales
  claveIdentificacion: string;
  denominacionCripto: string;
  saldoCantidad: Decimal;
  valoracionEur: Decimal;
  codigoPais: string;
  claveCondicion: 'T' | 'A' | 'R' | 'B'; // Titular, Autorizado, Representante, Beneficiario
  fechaPrimeraAdquisicion: Date;
  origenAdquisicion: string;
}

// Mapping de países por exchange conocido
const EXCHANGE_COUNTRIES: Record<string, string> = {
  COINBASE: 'US',
  KRAKEN: 'US',
  BINANCE: 'MT', // Malta
  BITSTAMP: 'LU', // Luxemburgo
  GEMINI: 'US',
  KUCOIN: 'SC', // Seychelles
  BITFINEX: 'VG', // British Virgin Islands
  FTX: 'BS', // Bahamas (histórico)
  BYBIT: 'VG',
  OKX: 'SC',
};

@Injectable()
export class Modelo721Service {
  private readonly logger = new Logger(Modelo721Service.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el informe Modelo 721 para un año fiscal
   * El Modelo 721 declara criptomonedas en el extranjero si el valor > 50,000 EUR
   */
  async generateModelo721(companyId: string, year: number): Promise<Modelo721Summary> {
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Obtener todas las wallets y exchange accounts
    const [wallets, exchangeAccounts] = await Promise.all([
      this.prisma.wallet.findMany({
        where: { companyId, isActive: true },
        include: {
          transactions: {
            where: { blockTimestamp: { lte: endOfYear } },
            orderBy: { blockTimestamp: 'asc' },
          },
        },
      }),
      this.prisma.exchangeAccount.findMany({
        where: { companyId, isActive: true },
      }),
    ]);

    // Obtener CryptoLots para calcular el cost basis
    const lots = await this.prisma.cryptoLot.findMany({
      where: { companyId },
      include: { cryptoAsset: true },
    });

    // Calcular saldos por activo y origen (exchange/wallet)
    const balancesBySource = new Map<string, {
      asset: string;
      assetName: string;
      source: string;
      sourceName: string;
      country: string;
      balance: Decimal;
      costBasis: Decimal;
      firstAcquisition: Date | null;
    }>();

    // Procesar transacciones de wallets
    for (const wallet of wallets) {
      // Determinar país del wallet (blockchain = jurisdicción del nodo, usamos US por defecto)
      const country = this.getWalletCountry(wallet.chain);

      for (const tx of wallet.transactions) {
        // Procesar activo entrante (assetIn/amountIn)
        if (tx.assetIn && tx.amountIn) {
          const sourceKey = `${tx.assetIn}:wallet:${wallet.id}`;

          if (!balancesBySource.has(sourceKey)) {
            balancesBySource.set(sourceKey, {
              asset: tx.assetIn,
              assetName: tx.assetIn, // Se actualizará después
              source: `WALLET-${wallet.address.slice(0, 8)}`,
              sourceName: wallet.label || `Wallet ${wallet.chain}`,
              country,
              balance: new Decimal(0),
              costBasis: new Decimal(0),
              firstAcquisition: null,
            });
          }

          const entry = balancesBySource.get(sourceKey)!;
          const amount = new Decimal(tx.amountIn);
          const priceEur = tx.priceInEur ? new Decimal(tx.priceInEur) : new Decimal(0);

          // Tipos que aumentan el saldo
          if (['BUY', 'DEPOSIT', 'STAKING_REWARD', 'AIRDROP', 'INCOME'].includes(tx.type)) {
            entry.balance = entry.balance.plus(amount);
            entry.costBasis = entry.costBasis.plus(amount.mul(priceEur));
            if (!entry.firstAcquisition) {
              entry.firstAcquisition = tx.blockTimestamp;
            }
          }
        }

        // Procesar activo saliente (assetOut/amountOut)
        if (tx.assetOut && tx.amountOut) {
          const sourceKey = `${tx.assetOut}:wallet:${wallet.id}`;

          if (!balancesBySource.has(sourceKey)) {
            balancesBySource.set(sourceKey, {
              asset: tx.assetOut,
              assetName: tx.assetOut,
              source: `WALLET-${wallet.address.slice(0, 8)}`,
              sourceName: wallet.label || `Wallet ${wallet.chain}`,
              country,
              balance: new Decimal(0),
              costBasis: new Decimal(0),
              firstAcquisition: null,
            });
          }

          const entry = balancesBySource.get(sourceKey)!;
          const amount = new Decimal(tx.amountOut);

          // Tipos que disminuyen el saldo
          if (['SELL', 'WITHDRAWAL', 'SWAP', 'FEE'].includes(tx.type)) {
            entry.balance = entry.balance.minus(amount);
          }
        }
      }
    }

    // Procesar saldos de exchange accounts
    for (const exchange of exchangeAccounts) {
      const country = exchange.country || EXCHANGE_COUNTRIES[exchange.exchange.toUpperCase()] || 'US';

      // Obtener balances del exchange (usando los lots como proxy)
      const exchangeLots = lots.filter(l => l.sourceType === exchange.exchange.toLowerCase());

      for (const lot of exchangeLots) {
        const remaining = new Decimal(lot.remainingAmount);
        if (remaining.lte(0)) continue;

        const sourceKey = `${lot.cryptoAsset.symbol}:exchange:${exchange.id}`;

        if (!balancesBySource.has(sourceKey)) {
          balancesBySource.set(sourceKey, {
            asset: lot.cryptoAsset.symbol,
            assetName: lot.cryptoAsset.name,
            source: exchange.exchange.toUpperCase(),
            sourceName: exchange.label || exchange.exchange,
            country,
            balance: new Decimal(0),
            costBasis: new Decimal(0),
            firstAcquisition: null,
          });
        }

        const entry = balancesBySource.get(sourceKey)!;
        entry.balance = entry.balance.plus(remaining);
        entry.costBasis = entry.costBasis.plus(new Decimal(lot.costBasisEur));
        if (!entry.firstAcquisition || lot.acquiredAt < entry.firstAcquisition) {
          entry.firstAcquisition = lot.acquiredAt;
        }
      }
    }

    // Obtener precios a 31 de diciembre
    const pricesAtYearEnd = await this.getPricesAtDate(endOfYear);

    // Construir posiciones del Modelo 721
    const posiciones: Modelo721Position[] = [];

    for (const [, data] of balancesBySource) {
      if (data.balance.lte(0)) continue;

      // Solo incluir si está en el extranjero (no España)
      if (data.country === 'ES') continue;

      const priceEur = pricesAtYearEnd.get(data.asset) || new Decimal(0);
      const valorFinAno = data.balance.mul(priceEur);

      posiciones.push({
        tipoMoneda: data.asset,
        nombreMoneda: data.assetName,
        claveExchange: data.source,
        nombreExchange: data.sourceName,
        paisExchange: data.country,
        saldoAFinDeAno: data.balance,
        valorEurAFinDeAno: valorFinAno,
        fechaAdquisicion: data.firstAcquisition || new Date(year, 0, 1),
        valorAdquisicionEur: data.costBasis,
        porcentajeTitularidad: 100,
      });
    }

    const totalValorEur = posiciones.reduce(
      (sum, p) => sum.plus(p.valorEurAFinDeAno),
      new Decimal(0),
    );

    // Verificar si hay variación significativa vs año anterior
    const previousYear = await this.getPreviousYearTotal(companyId, year - 1);
    const variacion = totalValorEur.minus(previousYear).abs();

    const summary: Modelo721Summary = {
      ejercicio: year,
      fechaGeneracion: new Date(),
      totalValorEur,
      posiciones,
      obligadoDeclarar: totalValorEur.gt(50000),
      variacionSignificativa: variacion.gt(20000),
    };

    this.logger.log(
      `Modelo 721 generado para ${year}: ${posiciones.length} posiciones, ` +
      `valor total: ${totalValorEur.toFixed(2)} EUR, obligado: ${summary.obligadoDeclarar}`,
    );

    return summary;
  }

  /**
   * Determinar país de un wallet basado en la blockchain
   * Las blockchains descentralizadas se consideran "extranjero" por defecto
   */
  private getWalletCountry(chain: string): string {
    // Para blockchains públicas, usamos US ya que la mayoría de nodos están ahí
    // Esto es una simplificación - la AEAT no tiene guía específica para DeFi
    const chainCountries: Record<string, string> = {
      ethereum: 'US',
      polygon: 'US',
      bsc: 'SG', // Binance Smart Chain -> Singapur
      arbitrum: 'US',
      optimism: 'US',
      avalanche: 'US',
      solana: 'US',
      bitcoin: 'US',
    };
    return chainCountries[chain.toLowerCase()] || 'US';
  }

  /**
   * Genera datos para el subgrupo 8 del Modelo 720 (criptomonedas)
   * El Modelo 720 incluye criptos en el "Subgrupo 8 - Monedas virtuales"
   * Solo obligatorio si valor > 50,000 EUR y variación > 20,000 EUR
   */
  async generateModelo720Crypto(companyId: string, year: number): Promise<Modelo720CryptoItem[]> {
    const modelo721 = await this.generateModelo721(companyId, year);

    return modelo721.posiciones.map((pos) => ({
      claveIdentificacion: pos.tipoMoneda,
      denominacionCripto: pos.nombreMoneda,
      saldoCantidad: pos.saldoAFinDeAno,
      valoracionEur: pos.valorEurAFinDeAno,
      codigoPais: pos.paisExchange,
      claveCondicion: 'T' as const, // Titular
      fechaPrimeraAdquisicion: pos.fechaAdquisicion,
      origenAdquisicion: pos.nombreExchange,
    }));
  }

  /**
   * Exporta el Modelo 721 en formato XML compatible con la AEAT
   * Formato según especificación BOE para presentación telemática
   */
  async exportToAEATFormat(companyId: string, year: number): Promise<string> {
    const modelo = await this.generateModelo721(companyId, year);

    // Obtener datos de la empresa para el declarante
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Formato XML según BOE para Modelo 721
    const xmlParts: string[] = [];

    // Cabecera XML
    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlParts.push('<Modelo721 xmlns="https://www.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Modelos_700_799/Modelo_721">');

    // Datos identificativos del declarante
    xmlParts.push('  <DatosIdentificativos>');
    xmlParts.push(`    <Ejercicio>${year}</Ejercicio>`);
    xmlParts.push(`    <NIF>${this.escapeXml(company.taxId || '')}</NIF>`);
    xmlParts.push(`    <Denominacion>${this.escapeXml(company.name)}</Denominacion>`);
    xmlParts.push(`    <FechaGeneracion>${modelo.fechaGeneracion.toISOString()}</FechaGeneracion>`);
    xmlParts.push('  </DatosIdentificativos>');

    // Resumen de la declaración
    xmlParts.push('  <ResumenDeclaracion>');
    xmlParts.push(`    <NumeroRegistros>${modelo.posiciones.length}</NumeroRegistros>`);
    xmlParts.push(`    <TotalValoracion>${modelo.totalValorEur.toFixed(2)}</TotalValoracion>`);
    xmlParts.push(`    <ObligadoDeclarar>${modelo.obligadoDeclarar ? 'S' : 'N'}</ObligadoDeclarar>`);
    xmlParts.push(`    <VariacionSignificativa>${modelo.variacionSignificativa ? 'S' : 'N'}</VariacionSignificativa>`);
    xmlParts.push('  </ResumenDeclaracion>');

    // Detalle de bienes (monedas virtuales)
    xmlParts.push('  <DetalleBienes>');

    for (const [index, pos] of modelo.posiciones.entries()) {
      xmlParts.push(`    <Bien numero="${index + 1}">`);
      xmlParts.push('      <TipoBien>M</TipoBien>'); // M = Moneda virtual
      xmlParts.push(`      <ClaveMoneda>${this.escapeXml(pos.tipoMoneda)}</ClaveMoneda>`);
      xmlParts.push(`      <Denominacion>${this.escapeXml(pos.nombreMoneda)}</Denominacion>`);
      xmlParts.push(`      <CodigoPais>${pos.paisExchange}</CodigoPais>`);
      xmlParts.push(`      <IdentificacionCustodia>${this.escapeXml(pos.claveExchange)}</IdentificacionCustodia>`);
      xmlParts.push(`      <NombreCustodia>${this.escapeXml(pos.nombreExchange)}</NombreCustodia>`);
      xmlParts.push(`      <Saldo31Diciembre>${pos.saldoAFinDeAno.toFixed(8)}</Saldo31Diciembre>`);
      xmlParts.push(`      <ValoracionEur>${pos.valorEurAFinDeAno.toFixed(2)}</ValoracionEur>`);
      xmlParts.push(`      <FechaPrimeraAdquisicion>${this.formatDate(pos.fechaAdquisicion)}</FechaPrimeraAdquisicion>`);
      xmlParts.push(`      <ValorAdquisicion>${pos.valorAdquisicionEur.toFixed(2)}</ValorAdquisicion>`);
      xmlParts.push(`      <PorcentajeTitularidad>${pos.porcentajeTitularidad}</PorcentajeTitularidad>`);
      xmlParts.push(`      <ClaveCondicion>T</ClaveCondicion>`); // T = Titular
      xmlParts.push('    </Bien>');
    }

    xmlParts.push('  </DetalleBienes>');
    xmlParts.push('</Modelo721>');

    return xmlParts.join('\n');
  }

  /**
   * Exporta el Modelo 720 Subgrupo 8 (criptomonedas) en formato XML AEAT
   */
  async exportModelo720ToAEATFormat(companyId: string, year: number): Promise<string> {
    const items = await this.generateModelo720Crypto(companyId, year);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const totalValor = items.reduce(
      (sum, item) => sum.plus(item.valoracionEur),
      new Decimal(0),
    );

    const xmlParts: string[] = [];

    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlParts.push('<Modelo720 xmlns="https://www.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Modelos_700_799/Modelo_720">');

    xmlParts.push('  <DatosIdentificativos>');
    xmlParts.push(`    <Ejercicio>${year}</Ejercicio>`);
    xmlParts.push(`    <NIF>${this.escapeXml(company.taxId || '')}</NIF>`);
    xmlParts.push(`    <Denominacion>${this.escapeXml(company.name)}</Denominacion>`);
    xmlParts.push('  </DatosIdentificativos>');

    // Subgrupo 8: Monedas virtuales
    xmlParts.push('  <Subgrupo8_MonedasVirtuales>');
    xmlParts.push(`    <NumeroRegistros>${items.length}</NumeroRegistros>`);
    xmlParts.push(`    <TotalValoracion>${totalValor.toFixed(2)}</TotalValoracion>`);

    for (const [index, item] of items.entries()) {
      xmlParts.push(`    <MonedaVirtual numero="${index + 1}">`);
      xmlParts.push(`      <ClaveIdentificacion>${this.escapeXml(item.claveIdentificacion)}</ClaveIdentificacion>`);
      xmlParts.push(`      <Denominacion>${this.escapeXml(item.denominacionCripto)}</Denominacion>`);
      xmlParts.push(`      <SaldoCantidad>${item.saldoCantidad.toFixed(8)}</SaldoCantidad>`);
      xmlParts.push(`      <ValoracionEur>${item.valoracionEur.toFixed(2)}</ValoracionEur>`);
      xmlParts.push(`      <CodigoPais>${item.codigoPais}</CodigoPais>`);
      xmlParts.push(`      <ClaveCondicion>${item.claveCondicion}</ClaveCondicion>`);
      xmlParts.push(`      <FechaPrimeraAdquisicion>${this.formatDate(item.fechaPrimeraAdquisicion)}</FechaPrimeraAdquisicion>`);
      xmlParts.push(`      <OrigenAdquisicion>${this.escapeXml(item.origenAdquisicion)}</OrigenAdquisicion>`);
      xmlParts.push('    </MonedaVirtual>');
    }

    xmlParts.push('  </Subgrupo8_MonedasVirtuales>');
    xmlParts.push('</Modelo720>');

    return xmlParts.join('\n');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Genera CSV para revisión manual
   */
  async exportToCSV(companyId: string, year: number): Promise<string> {
    const modelo = await this.generateModelo721(companyId, year);

    const headers = [
      'Criptomoneda',
      'Nombre',
      'Exchange/Wallet',
      'País',
      'Saldo 31/12',
      'Valor EUR 31/12',
      'Fecha Adquisición',
      'Valor Adquisición EUR',
      '% Titularidad',
    ];

    const rows = modelo.posiciones.map((pos) => [
      pos.tipoMoneda,
      pos.nombreMoneda,
      pos.nombreExchange,
      pos.paisExchange,
      pos.saldoAFinDeAno.toFixed(8),
      pos.valorEurAFinDeAno.toFixed(2),
      this.formatDate(pos.fechaAdquisicion),
      pos.valorAdquisicionEur.toFixed(2),
      pos.porcentajeTitularidad.toString(),
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
      '',
      `Total Valor EUR;${modelo.totalValorEur.toFixed(2)}`,
      `Required to file;${modelo.obligadoDeclarar ? 'Yes' : 'No'}`,
      `Significant variation;${modelo.variacionSignificativa ? 'Yes' : 'No'}`,
    ];

    return csv.join('\n');
  }

  /**
   * Obtiene precios históricos de la tabla PriceHistory
   * Fallback a precios por defecto si no hay datos
   */
  private async getPricesAtDate(date: Date): Promise<Map<string, Decimal>> {
    const prices = new Map<string, Decimal>();

    // Buscar en PriceHistory el precio más cercano a la fecha
    const priceRecords = await this.prisma.priceHistory.findMany({
      where: {
        timestamp: {
          gte: new Date(date.getTime() - 24 * 60 * 60 * 1000), // 24h antes
          lte: date,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Agrupar por símbolo, tomando el más reciente
    const seenSymbols = new Set<string>();
    for (const record of priceRecords) {
      if (!seenSymbols.has(record.symbol)) {
        seenSymbols.add(record.symbol);
        prices.set(record.symbol, new Decimal(record.priceEur));
      }
    }

    // Precios de fallback si no hay datos históricos
    const defaultPrices: Record<string, number> = {
      BTC: 42000,
      ETH: 2200,
      USDT: 0.92,
      USDC: 0.92,
      SOL: 85,
      BNB: 280,
      XRP: 0.55,
      ADA: 0.52,
      DOT: 6.5,
      MATIC: 0.85,
      AVAX: 35,
      LINK: 14,
      UNI: 6,
      AAVE: 90,
    };

    // Obtener todos los assets y añadir fallbacks
    const assets = await this.prisma.cryptoAsset.findMany();

    for (const asset of assets) {
      if (!prices.has(asset.symbol)) {
        const fallbackPrice = defaultPrices[asset.symbol] || 1;
        prices.set(asset.symbol, new Decimal(fallbackPrice));
        this.logger.warn(
          `No historical price for ${asset.symbol} at ${this.formatDate(date)}, using fallback: ${fallbackPrice} EUR`,
        );
      }
    }

    return prices;
  }

  /**
   * Obtiene el total declarado en el año anterior
   * Útil para determinar variación significativa (>20,000 EUR)
   */
  private async getPreviousYearTotal(companyId: string, year: number): Promise<Decimal> {
    // Buscar si hay un reporte guardado del año anterior
    // Esto requeriría una tabla FiscalReport para almacenar históricos
    // Por ahora, generamos el modelo del año anterior si hay datos

    try {
      const previousModelo = await this.generateModelo721(companyId, year);
      return previousModelo.totalValorEur;
    } catch {
      // Si no hay datos del año anterior, retornamos 0
      return new Decimal(0);
    }
  }

  /**
   * Valida si los datos están completos para presentar el modelo
   */
  async validateForSubmission(
    companyId: string,
    year: number,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const modelo = await this.generateModelo721(companyId, year);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Obtener datos de la empresa para validación
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company?.taxId) {
      errors.push('Company does not have a tax ID configured');
    }

    // Validaciones de posiciones
    for (const pos of modelo.posiciones) {
      if (!pos.paisExchange || pos.paisExchange.length !== 2) {
        errors.push(`${pos.tipoMoneda}: Invalid exchange country (must be 2-letter ISO code)`);
      }

      if (pos.valorEurAFinDeAno.lte(0)) {
        warnings.push(`${pos.tipoMoneda} at ${pos.nombreExchange}: Year-end value is 0 or negative`);
      }

      if (!pos.fechaAdquisicion) {
        errors.push(`${pos.tipoMoneda}: Missing first acquisition date`);
      }

      if (pos.valorAdquisicionEur.lte(0)) {
        warnings.push(`${pos.tipoMoneda}: Acquisition value is 0 - verify data`);
      }

      // Check consistency: current value vs cost
      const ratio = pos.valorEurAFinDeAno.div(pos.valorAdquisicionEur);
      if (ratio.gt(100) || ratio.lt(0.01)) {
        warnings.push(
          `${pos.tipoMoneda}: Extreme difference between current value (${pos.valorEurAFinDeAno.toFixed(2)} EUR) ` +
            `and cost (${pos.valorAdquisicionEur.toFixed(2)} EUR) - verify prices`,
        );
      }
    }

    // Global validations
    if (!modelo.obligadoDeclarar) {
      warnings.push(
        `Total value (${modelo.totalValorEur.toFixed(2)} EUR) does not exceed 50,000 EUR threshold - ` +
          `no obligation to file Modelo 721`,
      );
    }

    if (modelo.obligadoDeclarar && modelo.posiciones.length === 0) {
      errors.push('Required to file but no positions found - verify wallet and exchange data');
    }

    // Verificar que hay precios históricos disponibles
    const endOfYear = new Date(year, 11, 31);
    const priceCheck = await this.prisma.priceHistory.count({
      where: {
        timestamp: {
          gte: new Date(endOfYear.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: endOfYear,
        },
      },
    });

    if (priceCheck === 0) {
      warnings.push(
        `No historical prices available for 31/12/${year}. ` +
          `The values shown are estimates and should be verified.`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Genera un resumen ejecutivo del Modelo 721
   */
  async getSummary(
    companyId: string,
    year: number,
  ): Promise<{
    obligado: boolean;
    totalEur: string;
    numPosiciones: number;
    topAssets: Array<{ symbol: string; valorEur: string; porcentaje: string }>;
    topExchanges: Array<{ nombre: string; valorEur: string; pais: string }>;
  }> {
    const modelo = await this.generateModelo721(companyId, year);

    // Agrupar por asset
    const byAsset = new Map<string, Decimal>();
    for (const pos of modelo.posiciones) {
      const current = byAsset.get(pos.tipoMoneda) || new Decimal(0);
      byAsset.set(pos.tipoMoneda, current.plus(pos.valorEurAFinDeAno));
    }

    // Agrupar por exchange
    const byExchange = new Map<string, { valor: Decimal; pais: string }>();
    for (const pos of modelo.posiciones) {
      const current = byExchange.get(pos.nombreExchange) || { valor: new Decimal(0), pais: pos.paisExchange };
      current.valor = current.valor.plus(pos.valorEurAFinDeAno);
      byExchange.set(pos.nombreExchange, current);
    }

    // Top 5 assets
    const topAssets = Array.from(byAsset.entries())
      .sort((a, b) => b[1].minus(a[1]).toNumber())
      .slice(0, 5)
      .map(([symbol, valor]) => ({
        symbol,
        valorEur: valor.toFixed(2),
        porcentaje: modelo.totalValorEur.gt(0)
          ? valor.div(modelo.totalValorEur).mul(100).toFixed(1)
          : '0',
      }));

    // Top 5 exchanges
    const topExchanges = Array.from(byExchange.entries())
      .sort((a, b) => b[1].valor.minus(a[1].valor).toNumber())
      .slice(0, 5)
      .map(([nombre, data]) => ({
        nombre,
        valorEur: data.valor.toFixed(2),
        pais: data.pais,
      }));

    return {
      obligado: modelo.obligadoDeclarar,
      totalEur: modelo.totalValorEur.toFixed(2),
      numPosiciones: modelo.posiciones.length,
      topAssets,
      topExchanges,
    };
  }
}
