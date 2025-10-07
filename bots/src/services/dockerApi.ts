import axios from 'axios';
import type { AxiosError } from 'axios';
import { env } from '../config/env.js';

export type DockerStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface Docker {
  id: string;
  name: string;
  status: DockerStatus;
  type?: string | null;
  stopcommand?: string | null;
  pid?: number | null;
  localport?: number | null;
  bindport?: number | null;
  dockercompose?: string | null;
  dockerlocation?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DockerMonitor {
  id: string;
  dockerId: string;
  name: string;
  cpu: number | null;
  ram: number | null;
  status: DockerStatus;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

const client = axios.create({
  baseURL: env.dockerApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    ...(env.dockerApiKey ? { Authorization: `Bearer ${env.dockerApiKey}` } : {}),
  },
  timeout: 15_000,
});

const normalizeError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message =
      axiosError.response?.data?.message ??
      axiosError.response?.statusText ??
      axiosError.message ??
      'Unknown error';
    return new Error(message);
  }

  if (error instanceof Error) return error;
  return new Error('Unknown error');
};

export const dockerApi = {
  async listDockers(): Promise<Docker[]> {
    try {
      const response = await client.get<Docker[]>('/dockers');
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getDocker(id: string): Promise<Docker> {
    try {
      const response = await client.get<Docker>(`/dockers/${id}`);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getDockerByName(name: string): Promise<Docker | null> {
    const dockers = await this.listDockers();
    return dockers.find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? null;
  },

  async getDockerStats(id: string): Promise<DockerMonitor | null> {
    try {
      const response = await client.get<DockerMonitor | null>(`/dockers/${id}/stats`);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async startDocker(id: string): Promise<Docker> {
    try {
      const response = await client.post<Docker>(`/dockers/${id}/start`);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async stopDocker(id: string, reason?: string): Promise<Docker> {
    try {
      const payload = reason ? { reason } : undefined;
      const response = await client.post<Docker>(`/dockers/${id}/stop`, payload);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

