import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@crypto-erp/database';
import { NotFoundException } from '@nestjs/common';

/**
 * TESTS: Contacts Service
 * Gestión de contactos (clientes y proveedores)
 */

class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query?: any) {
    return this.prisma.contact.findMany({
      where: {
        companyId,
        ...(query?.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { taxId: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }),
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, companyId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(companyId: string, data: any) {
    return this.prisma.contact.create({ data: { ...data, companyId } });
  }

  async update(companyId: string, id: string, data: any) {
    await this.findOne(companyId, id);
    return this.prisma.contact.update({ where: { id }, data });
  }

  async delete(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.contact.delete({ where: { id } });
  }
}

describe('ContactsService', () => {
  let service: ContactsService;
  let prismaService: PrismaService;

  const mockContact = {
    id: 'contact-1',
    companyId: 'company-1',
    name: 'Cliente Test SA',
    taxId: 'B87654321',
    email: 'cliente@test.com',
    phone: '+34 600 000 000',
    address: 'Calle Test 123',
    city: 'Madrid',
    postalCode: '28001',
    country: 'ES',
    isCustomer: true,
    isSupplier: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: PrismaService,
          useValue: {
            contact: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should find all contacts', async () => {
    jest.spyOn(prismaService.contact, 'findMany').mockResolvedValue([mockContact] as any);
    const result = await service.findAll('company-1');
    expect(result).toHaveLength(1);
  });

  it('should search contacts by name or taxId', async () => {
    jest.spyOn(prismaService.contact, 'findMany').mockResolvedValue([mockContact] as any);
    await service.findAll('company-1', { search: 'Cliente' });
    expect(prismaService.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('should find one contact', async () => {
    jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
    const result = await service.findOne('company-1', 'contact-1');
    expect(result.name).toBe('Cliente Test SA');
  });

  it('should throw when contact not found', async () => {
    jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(null);
    await expect(service.findOne('company-1', 'non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should create contact', async () => {
    jest.spyOn(prismaService.contact, 'create').mockResolvedValue(mockContact as any);
    const result = await service.create('company-1', { name: 'New Contact', taxId: 'B12345678' });
    expect(result).toBeDefined();
  });

  it('should update contact', async () => {
    jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
    jest.spyOn(prismaService.contact, 'update').mockResolvedValue({ ...mockContact, name: 'Updated' } as any);
    const result = await service.update('company-1', 'contact-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('should delete contact', async () => {
    jest.spyOn(prismaService.contact, 'findFirst').mockResolvedValue(mockContact as any);
    jest.spyOn(prismaService.contact, 'delete').mockResolvedValue(mockContact as any);
    await service.delete('company-1', 'contact-1');
    expect(prismaService.contact.delete).toHaveBeenCalledWith({ where: { id: 'contact-1' } });
  });
});
