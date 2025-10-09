import type {
  Prisma,
  docker as DockerEntity,
  servermonitor as ServerMonitorEntity,
  status,
} from '../../generated/prisma/index.js';
import { prisma } from '../config/prisma.js';

export type CreateDockerInput = Omit<
  Prisma.dockerCreateInput,
  'servermonitors' | 'id' | 'createdAt' | 'updatedAt'
> & {
  rconport?: number | null;
  rconpassword?: string | null;
};

export type UpdateDockerInput = Partial<CreateDockerInput> & {
  status?: status | null;
  pid?: number | null;
};

export class DockerRepository {
  static create(data: CreateDockerInput): Promise<DockerEntity> {
    return prisma.docker.create({ data });
  }

  static findMany(): Promise<DockerEntity[]> {
    return prisma.docker.findMany({ orderBy: { createdAt: 'desc' } });
  }

  static findActive(): Promise<DockerEntity[]> {
    return prisma.docker.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  static findById(id: string): Promise<DockerEntity | null> {
    return prisma.docker.findUnique({ where: { id } });
  }

  static findByName(name: string): Promise<DockerEntity | null> {
    return prisma.docker.findUnique({ where: { name } });
  }

  static update(id: string, data: UpdateDockerInput): Promise<DockerEntity> {
    return prisma.docker.update({ where: { id }, data });
  }

  static delete(id: string): Promise<DockerEntity> {
    return prisma.docker.delete({ where: { id } });
  }

  static upsertMonitor(
    dockerId: string,
    payload: Partial<ServerMonitorEntity> & { name: string },
  ): Promise<ServerMonitorEntity> {
    const updateData: Prisma.servermonitorUpdateInput = {
      docker: { connect: { id: dockerId } },
    };
    if (payload.cpu !== undefined) {
      updateData.cpu = payload.cpu;
    }
    if (payload.ram !== undefined) {
      updateData.ram = payload.ram;
    }
    if (payload.status) {
      updateData.status = payload.status;
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description ?? null;
    }

    const createData: Prisma.servermonitorCreateInput = {
      name: payload.name,
      docker: { connect: { id: dockerId } },
    };
    if (payload.cpu !== undefined) {
      createData.cpu = payload.cpu;
    }
    if (payload.ram !== undefined) {
      createData.ram = payload.ram;
    }
    if (payload.status) {
      createData.status = payload.status;
    }
    if (payload.description !== undefined) {
      createData.description = payload.description ?? null;
    }

    return prisma.servermonitor.upsert({
      where: { name: payload.name },
      update: updateData,
      create: createData,
    });
  }

  static listMonitors(): Promise<ServerMonitorEntity[]> {
    return prisma.servermonitor.findMany({ orderBy: { createdAt: 'desc' } });
  }

  static findMonitorByDockerId(dockerId: string): Promise<ServerMonitorEntity | null> {
    return prisma.servermonitor.findFirst({ where: { dockerId } });
  }
}
