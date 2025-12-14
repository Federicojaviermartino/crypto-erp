import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateContactDto, QueryContactsDto } from '../dto/index.js';
import { Contact, Prisma, ContactType } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    companyId: string,
    query: QueryContactsDto,
  ): Promise<{ contacts: Contact[]; total: number }> {
    const where: Prisma.ContactWhereInput = {
      companyId,
      ...(query.type && { type: query.type }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { taxId: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { contacts, total };
  }

  async findById(companyId: string, id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, companyId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async findByTaxId(companyId: string, taxId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { companyId, taxId },
    });
  }

  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    // Check for duplicate tax ID if provided
    if (dto.taxId) {
      const existing = await this.findByTaxId(companyId, dto.taxId);
      if (existing) {
        throw new ConflictException(`Contact with tax ID ${dto.taxId} already exists`);
      }
    }

    return this.prisma.contact.create({
      data: {
        name: dto.name,
        taxId: dto.taxId,
        type: (dto.type as ContactType) || ContactType.CUSTOMER,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country || 'ES',
        notes: dto.notes,
        isActive: dto.isActive ?? true,
        companyId,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateContactDto>,
  ): Promise<Contact> {
    await this.findById(companyId, id);

    // Check for duplicate tax ID if being updated
    if (dto.taxId) {
      const existing = await this.prisma.contact.findFirst({
        where: { companyId, taxId: dto.taxId, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Contact with tax ID ${dto.taxId} already exists`);
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.type && { type: dto.type as ContactType }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deactivate(companyId: string, id: string): Promise<Contact> {
    await this.findById(companyId, id);

    return this.prisma.contact.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(companyId: string, id: string): Promise<Contact> {
    await this.findById(companyId, id);

    return this.prisma.contact.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async delete(companyId: string, id: string): Promise<void> {
    await this.findById(companyId, id);

    // Check if contact has invoices
    const invoiceCount = await this.prisma.invoice.count({
      where: { contactId: id },
    });

    if (invoiceCount > 0) {
      throw new ConflictException(
        `Cannot delete contact with ${invoiceCount} associated invoices. Deactivate instead.`,
      );
    }

    await this.prisma.contact.delete({ where: { id } });
  }
}
