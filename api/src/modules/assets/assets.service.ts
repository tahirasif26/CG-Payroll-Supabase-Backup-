import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  AssignAssetDto,
  CreateAssetDto,
  ListAssetsQuery,
  UnassignAssetDto,
  UpdateAssetDto,
} from './dto/asset.schemas';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: string, query: ListAssetsQuery) {
    const where: Prisma.AssetWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as AssetStatus } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.search
        ? {
            OR: [
              { assetTag: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        orderBy: { assetTag: 'asc' },
        include: { assignedTo: { select: { id: true, firstName: true, lastName: true, empId: true } } },
        skip,
        take,
      }),
      this.prisma.asset.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findById(clientId: string, id: string) {
    const a = await this.prisma.asset.findFirst({
      where: { id, clientId },
      include: {
        assignedTo: true,
        history: { orderBy: { date: 'desc' } },
      },
    });
    if (!a) throw notFound();
    return a;
  }

  async create(clientId: string, dto: CreateAssetDto) {
    const existing = await this.prisma.asset.findFirst({
      where: { clientId, assetTag: dto.assetTag },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ASSET_TAG_TAKEN',
        message: `An asset with tag "${dto.assetTag}" already exists`,
      });
    }
    return this.prisma.asset.create({
      data: {
        clientId,
        assetTag: dto.assetTag,
        name: dto.name,
        category: dto.category ?? null,
        brand: dto.brand ?? null,
        model: dto.model ?? null,
        serialNumber: dto.serialNumber ?? null,
        condition: dto.condition ?? null,
        location: dto.location ?? null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseCost: dto.purchaseCost ?? null,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        serviceDueDate: dto.serviceDueDate ? new Date(dto.serviceDueDate) : null,
        notes: dto.notes ?? null,
        status: AssetStatus.in_stock,
      },
    });
  }

  async update(clientId: string, id: string, dto: UpdateAssetDto) {
    await this.findById(clientId, id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.purchaseDate !== undefined
          ? { purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null }
          : {}),
        ...(dto.warrantyExpiry !== undefined
          ? { warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null }
          : {}),
        ...(dto.serviceDueDate !== undefined
          ? { serviceDueDate: dto.serviceDueDate ? new Date(dto.serviceDueDate) : null }
          : {}),
      },
    });
  }

  async assign(
    clientId: string,
    id: string,
    performedById: string | null,
    dto: AssignAssetDto,
  ) {
    const a = await this.findById(clientId, id);
    if (a.status === AssetStatus.retired || a.status === AssetStatus.lost) {
      throw new BadRequestException({
        code: 'NOT_ASSIGNABLE',
        message: `Cannot assign a ${a.status} asset`,
      });
    }
    const date = dto.assignedDate ? new Date(dto.assignedDate) : new Date();
    await this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id },
        data: {
          assignedToId: dto.assignedToId,
          assignedDate: date,
          status: AssetStatus.assigned,
        },
      }),
      this.prisma.assetHistory.create({
        data: {
          assetId: id,
          clientId,
          action: 'assigned',
          fromEmployeeId: a.assignedToId,
          toEmployeeId: dto.assignedToId,
          performedById,
          note: dto.note,
          date,
        },
      }),
    ]);
    return this.findById(clientId, id);
  }

  async unassign(
    clientId: string,
    id: string,
    performedById: string | null,
    dto: UnassignAssetDto,
  ) {
    const a = await this.findById(clientId, id);
    if (a.status !== AssetStatus.assigned) {
      throw new BadRequestException({
        code: 'NOT_ASSIGNED',
        message: 'Asset is not currently assigned',
      });
    }
    await this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id },
        data: {
          assignedToId: null,
          assignedDate: null,
          status: dto.status as AssetStatus,
        },
      }),
      this.prisma.assetHistory.create({
        data: {
          assetId: id,
          clientId,
          action: dto.status === AssetStatus.in_stock ? 'unassigned' : dto.status,
          fromEmployeeId: a.assignedToId,
          toEmployeeId: null,
          performedById,
          note: dto.note,
          date: new Date(),
        },
      }),
    ]);
    return this.findById(clientId, id);
  }

  async delete(clientId: string, id: string) {
    const a = await this.findById(clientId, id);
    if (a.status === AssetStatus.assigned) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_ASSIGNED',
        message: 'Unassign the asset before deleting it',
      });
    }
    return this.prisma.asset.delete({ where: { id } });
  }
}

function paginate<T>(items: T[], total: number, query: { page: number; pageSize: number }) {
  return {
    data: items,
    meta: {
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    },
  };
}
function notFound() {
  return new NotFoundException({ code: 'ASSET_NOT_FOUND', message: 'Asset not found' });
}
