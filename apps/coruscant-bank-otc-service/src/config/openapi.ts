import path from 'path';
import fs from 'fs';
import YAML from 'js-yaml';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import logger from '../utils/logger';

// Define OpenAPI schema types
interface OpenAPIServer {
  url: string;
  description: string;
}

interface OpenAPISchema {
  servers?: OpenAPIServer[];
  [key: string]: unknown;
}

// Load OpenAPI schema
export const loadOpenApiSchema = (): OpenAPISchema => {
  try {
    const schemaPath = path.join(__dirname, '../../coruscant-bank-otc-service.yaml');
    const fileContents = fs.readFileSync(schemaPath, 'utf8');
    return YAML.load(fileContents) as OpenAPISchema;
  } catch (error) {
    logger.error({ error }, 'Error loading OpenAPI schema');
    throw error;
  }
};

// Setup Swagger UI
export const setupSwaggerUI = (app: Express): void => {
  try {
    const openApiSchema = loadOpenApiSchema();

    // Add server URL for local development
    if (!openApiSchema.servers) {
      openApiSchema.servers = [];
    }

    // Add local development server
    const localServer = {
      url: `http://localhost:${process.env.PORT || 3000}`,
      description: 'Local development server'
    };

    // Add Docker server
    const dockerServer = {
      url: 'http://coruscant-bank-otc-service:3000',
      description: 'Docker container'
    };

    // Add servers if they don't exist already
    if (!openApiSchema.servers.some((s: OpenAPIServer) => s.url === localServer.url)) {
      openApiSchema.servers.unshift(localServer);
    }

    if (!openApiSchema.servers.some((s: OpenAPIServer) => s.url === dockerServer.url)) {
      openApiSchema.servers.push(dockerServer);
    }

    // Configure Swagger UI options
    const swaggerOptions: swaggerUi.SwaggerUiOptions = {
      explorer: true,
      swaggerOptions: {
        validatorUrl: null,
        docExpansion: 'list'
      }
    };

    // Setup Swagger UI routes
    app.use('/api', swaggerUi.serve, swaggerUi.setup(openApiSchema, swaggerOptions));

    logger.info('Swagger UI initialized at /api');
  } catch (error) {
    logger.error({ error }, 'Error setting up Swagger UI');
    throw error;
  }
};
