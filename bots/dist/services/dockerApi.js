import axios from 'axios';
import { env } from '../config/env.js';
const client = axios.create({
    baseURL: env.dockerApiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
        ...(env.dockerApiKey ? { Authorization: `Bearer ${env.dockerApiKey}` } : {}),
    },
    timeout: 15000,
});
const normalizeError = (error) => {
    if (axios.isAxiosError(error)) {
        const axiosError = error;
        const message = axiosError.response?.data?.message ??
            axiosError.response?.statusText ??
            axiosError.message ??
            'Unknown error';
        return new Error(message);
    }
    if (error instanceof Error)
        return error;
    return new Error('Unknown error');
};
export const dockerApi = {
    async listDockers() {
        try {
            const response = await client.get('/dockers');
            return response.data;
        }
        catch (error) {
            throw normalizeError(error);
        }
    },
    async getDocker(id) {
        try {
            const response = await client.get(`/dockers/${id}`);
            return response.data;
        }
        catch (error) {
            throw normalizeError(error);
        }
    },
    async getDockerByName(name) {
        const dockers = await this.listDockers();
        return dockers.find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? null;
    },
    async getDockerStats(id) {
        try {
            const response = await client.get(`/dockers/${id}/stats`);
            return response.data;
        }
        catch (error) {
            throw normalizeError(error);
        }
    },
    async startDocker(id) {
        try {
            const response = await client.post(`/dockers/${id}/start`);
            return response.data;
        }
        catch (error) {
            throw normalizeError(error);
        }
    },
    async stopDocker(id, reason) {
        try {
            const payload = reason ? { reason } : undefined;
            const response = await client.post(`/dockers/${id}/stop`, payload);
            return response.data;
        }
        catch (error) {
            throw normalizeError(error);
        }
    },
    async sendCommand(id, command) {
        try {
            const response = await client.post(`/dockers/${id}/command`, { command });
            return response.data;
        }
        catch (error) {
            throw normalizeError(error);
        }
    },
};
//# sourceMappingURL=dockerApi.js.map