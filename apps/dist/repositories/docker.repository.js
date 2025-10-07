import { prisma } from '../config/prisma.js';
export class DockerRepository {
    static create(data) {
        return prisma.docker.create({ data });
    }
    static findMany() {
        return prisma.docker.findMany({ orderBy: { createdAt: 'desc' } });
    }
    static findActive() {
        return prisma.docker.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
        });
    }
    static findById(id) {
        return prisma.docker.findUnique({ where: { id } });
    }
    static findByName(name) {
        return prisma.docker.findUnique({ where: { name } });
    }
    static update(id, data) {
        return prisma.docker.update({ where: { id }, data });
    }
    static delete(id) {
        return prisma.docker.delete({ where: { id } });
    }
    static upsertMonitor(dockerId, payload) {
        const updateData = {
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
        const createData = {
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
    static listMonitors() {
        return prisma.servermonitor.findMany({ orderBy: { createdAt: 'desc' } });
    }
    static findMonitorByDockerId(dockerId) {
        return prisma.servermonitor.findFirst({ where: { dockerId } });
    }
}
//# sourceMappingURL=docker.repository.js.map