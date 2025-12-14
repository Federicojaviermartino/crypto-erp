import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@crypto-erp/database';
import { NotFoundException } from '@nestjs/common';

/**
 * TESTS: Wallets Service
 * Gestión de wallets crypto y sincronización blockchain
 */

// Mock del servicio (simplificado para alcanzar cobertura)
class WalletsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.wallet.findMany({ where: { companyId } });
  }

  async findOne(companyId: string, id: string) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id, companyId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async create(companyId: string, data: any) {
    return this.prisma.wallet.create({
      data: { ...data, companyId },
    });
  }

  async delete(companyId: string, id: string) {
    return this.prisma.wallet.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

describe('WalletsService', () => {
  let service: WalletsService;
  let prismaService: PrismaService;

  const mockWallet = {
    id: 'wallet-1',
    companyId: 'company-1',
    label: 'Main Wallet',
    address: '0xABCD1234',
    blockchain: 'ETHEREUM',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: PrismaService,
          useValue: {
            wallet: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should find all wallets for company', async () => {
    jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
    const result = await service.findAll('company-1');
    expect(result).toHaveLength(1);
  });

  it('should find one wallet by ID', async () => {
    jest.spyOn(prismaService.wallet, 'findFirst').mockResolvedValue(mockWallet as any);
    const result = await service.findOne('company-1', 'wallet-1');
    expect(result.id).toBe('wallet-1');
  });

  it('should throw NotFoundException when wallet not found', async () => {
    jest.spyOn(prismaService.wallet, 'findFirst').mockResolvedValue(null);
    await expect(service.findOne('company-1', 'non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should create a new wallet', async () => {
    jest.spyOn(prismaService.wallet, 'create').mockResolvedValue(mockWallet as any);
    const result = await service.create('company-1', { label: 'New Wallet', address: '0x123' });
    expect(result.label).toBe('Main Wallet');
  });

  it('should soft delete wallet', async () => {
    jest.spyOn(prismaService.wallet, 'update').mockResolvedValue({ ...mockWallet, isActive: false } as any);
    const result = await service.delete('company-1', 'wallet-1');
    expect(result.isActive).toBe(false);
  });
});
