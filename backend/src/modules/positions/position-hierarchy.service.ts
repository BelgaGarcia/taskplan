import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdatePositionHierarchyDto } from './dto/update-position-hierarchy.dto';

type Edge = { positionId: string; inheritedPositionId: string };

@Injectable()
export class PositionHierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  async getInheritedPositionIds(positionId: string): Promise<string[]> {
    const edges = await this.prisma.positionInheritance.findMany({
      select: { positionId: true, inheritedPositionId: true },
    });
    return this.resolveInheritedPositionIds(positionId, edges);
  }

  async canInherit(
    positionId: string,
    inheritedPositionId: string,
  ): Promise<boolean> {
    return (await this.getInheritedPositionIds(positionId)).includes(
      inheritedPositionId,
    );
  }

  async getHierarchy() {
    const [positions, inheritances] = await this.prisma.$transaction([
      this.prisma.position.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.positionInheritance.findMany({
        select: { positionId: true, inheritedPositionId: true },
      }),
    ]);
    return { positions, inheritances };
  }

  async replaceHierarchy(dto: UpdatePositionHierarchyDto) {
    const edges = this.uniqueEdges(dto.inheritances);
    const positionIds = new Set(
      edges.flatMap((edge) => [edge.positionId, edge.inheritedPositionId]),
    );

    if (positionIds.size) {
      const existing = await this.prisma.position.count({
        where: { id: { in: Array.from(positionIds) }, active: true },
      });
      if (existing !== positionIds.size) {
        throw new BadRequestException(
          'A hierarquia só pode referenciar cargos ativos existentes.',
        );
      }
    }

    this.validateNoCycle(edges);

    await this.prisma.$transaction(async (tx) => {
      await tx.positionInheritance.deleteMany();
      if (edges.length) {
        await tx.positionInheritance.createMany({ data: edges });
      }
    });

    return this.getHierarchy();
  }

  validateNoCycle(edges: Edge[]): void {
    const graph = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.positionId === edge.inheritedPositionId) {
        throw new BadRequestException('Um cargo não pode herdar de si mesmo.');
      }
      graph.set(edge.positionId, [
        ...(graph.get(edge.positionId) ?? []),
        edge.inheritedPositionId,
      ]);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (positionId: string): void => {
      if (visiting.has(positionId)) {
        throw new BadRequestException(
          'A hierarquia de cargos não pode conter ciclos.',
        );
      }
      if (visited.has(positionId)) return;
      visiting.add(positionId);
      for (const inheritedId of graph.get(positionId) ?? []) visit(inheritedId);
      visiting.delete(positionId);
      visited.add(positionId);
    };

    for (const positionId of graph.keys()) visit(positionId);
  }

  private resolveInheritedPositionIds(positionId: string, edges: Edge[]) {
    const graph = new Map<string, string[]>();
    for (const edge of edges) {
      graph.set(edge.positionId, [
        ...(graph.get(edge.positionId) ?? []),
        edge.inheritedPositionId,
      ]);
    }

    const allowed = new Set<string>([positionId]);
    const queue = [positionId];
    while (queue.length) {
      const current = queue.shift()!;
      for (const inheritedId of graph.get(current) ?? []) {
        if (!allowed.has(inheritedId)) {
          allowed.add(inheritedId);
          queue.push(inheritedId);
        }
      }
    }
    return Array.from(allowed);
  }

  private uniqueEdges(edges: Edge[]) {
    const unique = new Map<string, Edge>();
    for (const edge of edges) {
      unique.set(`${edge.positionId}:${edge.inheritedPositionId}`, edge);
    }
    return Array.from(unique.values());
  }
}
