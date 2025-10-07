import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.1.0',
  info: {
    title: 'Docker Management API',
    version: '1.0.0',
    description:
      'REST API for managing docker-compose projects, collecting runtime statistics, and streaming container logs via WebSocket.',
  },
  servers: [
    {
      url: 'http://localhost:{port}/api',
      description: 'Local development',
      variables: {
        port: {
          default: '4000',
          description: 'API port',
        },
      },
    },
  ],
  components: {
    schemas: {
      Docker: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PENDING'] },
          type: { type: 'string', nullable: true },
          stopcommand: { type: 'string', nullable: true },
          pid: { type: 'integer', nullable: true },
          localport: { type: 'integer', nullable: true },
          bindport: { type: 'integer', nullable: true },
          dockercompose: { type: 'string', nullable: true },
          dockerlocation: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DockerCreatePayload: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          stopcommand: { type: 'string' },
          localport: { type: 'integer' },
          bindport: { type: 'integer' },
          dockercompose: { type: 'string' },
          dockerlocation: { type: 'string' },
          description: { type: 'string' },
        },
      },
      DockerUpdatePayload: {
        allOf: [{ $ref: '#/components/schemas/DockerCreatePayload' }],
      },
      DockerStartPayload: {
        type: 'object',
        properties: {
          build: { type: 'boolean', default: false },
        },
      },
      ServerMonitor: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          dockerId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          cpu: { type: 'number', nullable: true, description: 'Percent CPU usage' },
          ram: { type: 'number', nullable: true, description: 'Usage in MiB' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PENDING'] },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          details: {},
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Check API health.',
        responses: {
          200: { description: 'API is healthy.' },
        },
      },
    },
    '/dockers': {
      get: {
        tags: ['Docker'],
        summary: 'List docker records.',
        responses: {
          200: {
            description: 'Success.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Docker' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Docker'],
        summary: 'Create a new docker record.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DockerCreatePayload' },
            },
          },
        },
        responses: {
          201: {
            description: 'Created.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Docker' },
              },
            },
          },
          409: {
            description: 'Duplicate name.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/dockers/{id}': {
      get: {
        tags: ['Docker'],
        summary: 'Get docker details.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Success.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Docker' } } },
          },
          404: {
            description: 'Not found.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Docker'],
        summary: 'Update docker details.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DockerUpdatePayload' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Docker' } } },
          },
        },
      },
      delete: {
        tags: ['Docker'],
        summary: 'Delete docker entry (must not be running).',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Deleted.' },
          400: {
            description: 'Container running.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/dockers/{id}/start': {
      post: {
        tags: ['Docker'],
        summary: 'Start docker-compose project.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DockerStartPayload' },
            },
          },
        },
        responses: {
          200: {
            description: 'Started.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Docker' } } },
          },
        },
      },
    },
    '/dockers/{id}/stop': {
      post: {
        tags: ['Docker'],
        summary: 'Stop container by sending stdin command.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Stopped.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Docker' } } },
          },
        },
      },
    },
    '/dockers/{id}/restart': {
      post: {
        tags: ['Docker'],
        summary: 'Restart docker-compose project.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Restarted.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Docker' } } },
          },
        },
      },
    },
    '/dockers/{id}/stats': {
      get: {
        tags: ['Docker'],
        summary: 'Get latest statistics snapshot for docker.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Success.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ServerMonitor' } } },
          },
        },
      },
    },
    '/monitors': {
      get: {
        tags: ['Monitor'],
        summary: 'List monitoring snapshots for all dockers.',
        responses: {
          200: {
            description: 'Success.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ServerMonitor' } },
              },
            },
          },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],
});

