import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import * as openapi from './openapi';
import { loadOpenApiSchema, setupSwaggerUI } from './openapi';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('js-yaml');
jest.mock('swagger-ui-express', () => ({
  serve: jest.fn(),
  setup: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockedYAML = YAML as jest.Mocked<typeof YAML>;
const mockedSwaggerUi = swaggerUi as jest.Mocked<typeof swaggerUi>;

describe('OpenAPI Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.PORT;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadOpenApiSchema', () => {
    it('should successfully load OpenAPI schema from YAML file', () => {
      const mockSchemaPath = '/app/src/config/../../coruscant-bank-otc-service.yaml';
      const mockFileContents = 'openapi: 3.0.0\ninfo:\n  title: Test API';
      const mockParsedSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API' },
        paths: {}
      };

      mockedPath.join.mockReturnValue(mockSchemaPath);
      mockedFs.readFileSync.mockReturnValue(mockFileContents);
      mockedYAML.load.mockReturnValue(mockParsedSchema);

      const result = loadOpenApiSchema();

      expect(mockedPath.join).toHaveBeenCalledWith(__dirname, '../../coruscant-bank-otc-service.yaml');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(mockSchemaPath, 'utf8');
      expect(mockedYAML.load).toHaveBeenCalledWith(mockFileContents);
      expect(result).toEqual(mockParsedSchema);
    });

    it('should handle file read errors', () => {
      const mockError = new Error('File not found');
      mockedPath.join.mockReturnValue('/mock/path');
      mockedFs.readFileSync.mockImplementation(() => {
        throw mockError;
      });

      expect(() => loadOpenApiSchema()).toThrow(mockError);
      expect(logger.error).toHaveBeenCalledWith({ error: mockError }, 'Error loading OpenAPI schema');
    });

    it('should handle YAML parsing errors', () => {
      const mockError = new Error('Invalid YAML');
      mockedPath.join.mockReturnValue('/mock/path');
      mockedFs.readFileSync.mockReturnValue('invalid: yaml: content:');
      mockedYAML.load.mockImplementation(() => {
        throw mockError;
      });

      expect(() => loadOpenApiSchema()).toThrow(mockError);
      expect(logger.error).toHaveBeenCalledWith({ error: mockError }, 'Error loading OpenAPI schema');
    });

    it('should handle missing file errors', () => {
      const mockError = new Error('ENOENT: no such file or directory');
      mockedPath.join.mockReturnValue('/nonexistent/file.yaml');
      mockedFs.readFileSync.mockImplementation(() => {
        throw mockError;
      });

      expect(() => loadOpenApiSchema()).toThrow(mockError);
      expect(logger.error).toHaveBeenCalledWith({ error: mockError }, 'Error loading OpenAPI schema');
    });
  });

  describe('setupSwaggerUI', () => {
    let mockApp: jest.Mocked<express.Express>;

    beforeEach(() => {
      mockApp = {
        use: jest.fn()
      } as unknown as jest.Mocked<express.Express>;

      // Setup swagger-ui-express mocks
      // No need to set up serve since it's already mocked
      (mockedSwaggerUi.setup as jest.Mock).mockReturnValue('mock-setup-middleware');
    });

    it('should setup Swagger UI with default port when PORT env var not set', () => {
      const mockSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API' }
      };

      // Mock loadOpenApiSchema
      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      expect(mockApp.use).toHaveBeenCalledWith(
        '/api',
        expect.anything(),
        'mock-setup-middleware'
      );

      expect(mockedSwaggerUi.setup).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockSchema,
          servers: expect.arrayContaining([
            {
              url: 'http://localhost:3000',
              description: 'Local development server'
            },
            {
              url: 'http://coruscant-bank-otc-service:3000',
              description: 'Docker container'
            }
          ])
        }),
        {
          explorer: true,
          swaggerOptions: {
            validatorUrl: null,
            docExpansion: 'list'
          }
        }
      );

      expect(logger.info).toHaveBeenCalledWith('Swagger UI initialized at /api');
    });

    it('should setup Swagger UI with custom port from environment', () => {
      process.env.PORT = '8080';
      const mockSchema = { openapi: '3.0.0', info: { title: 'Test API' } };

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      expect(mockedSwaggerUi.setup).toHaveBeenCalledWith(
        expect.objectContaining({
          servers: expect.arrayContaining([
            {
              url: 'http://localhost:8080',
              description: 'Local development server'
            }
          ])
        }),
        expect.any(Object)
      );
    });

    it('should add servers array when it does not exist in schema', () => {
      const mockSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API' }
        // No servers array
      };

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      expect(mockedSwaggerUi.setup).toHaveBeenCalledWith(
        expect.objectContaining({
          servers: expect.arrayContaining([
            {
              url: 'http://localhost:3000',
              description: 'Local development server'
            },
            {
              url: 'http://coruscant-bank-otc-service:3000',
              description: 'Docker container'
            }
          ])
        }),
        expect.any(Object)
      );
    });

    it('should not add duplicate servers if they already exist', () => {
      const existingServers = [
        { url: 'http://localhost:3000', description: 'Existing local server' },
        { url: 'http://coruscant-bank-otc-service:3000', description: 'Existing docker server' }
      ];

      const mockSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API' },
        servers: [...existingServers]
      };

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      // Should not add duplicates
      const setupCall = mockedSwaggerUi.setup.mock.calls[0];
      const passedSchema = setupCall?.[0];
      
      expect(passedSchema?.servers).toHaveLength(2);
      expect(passedSchema?.servers).toEqual(existingServers);
    });

    it('should add local server but not docker server if only docker exists', () => {
      const existingServers = [
        { url: 'http://coruscant-bank-otc-service:3000', description: 'Existing docker server' }
      ];

      const mockSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API' },
        servers: [...existingServers]
      };

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      const setupCall = mockedSwaggerUi.setup.mock.calls[0];
      const passedSchema = setupCall?.[0];
      
      expect(passedSchema?.servers).toHaveLength(2);
      expect(passedSchema?.servers?.[0]).toEqual({
        url: 'http://localhost:3000',
        description: 'Local development server'
      });
      expect(passedSchema?.servers?.[1]).toEqual(existingServers[0]);
    });

    it('should add docker server but not local server if only local exists', () => {
      const existingServers = [
        { url: 'http://localhost:3000', description: 'Existing local server' }
      ];

      const mockSchema = {
        openapi: '3.0.0',
        info: { title: 'Test API' },
        servers: [...existingServers]
      };

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      const setupCall = mockedSwaggerUi.setup.mock.calls[0];
      const passedSchema = setupCall?.[0];
      
      expect(passedSchema?.servers).toHaveLength(2);
      expect(passedSchema?.servers?.[0]).toEqual(existingServers[0]);
      expect(passedSchema?.servers?.[1]).toEqual({
        url: 'http://coruscant-bank-otc-service:3000',
        description: 'Docker container'
      });
    });

    it('should configure swagger options correctly', () => {
      const mockSchema = { openapi: '3.0.0', info: { title: 'Test API' } };

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);

      setupSwaggerUI(mockApp);

      expect(mockedSwaggerUi.setup).toHaveBeenCalledWith(
        expect.any(Object),
        {
          explorer: true,
          swaggerOptions: {
            validatorUrl: null,
            docExpansion: 'list'
          }
        }
      );
    });

    it('should handle errors during setup and rethrow them', () => {
      const mockError = new Error('Setup failed');
      jest.spyOn(openapi, 'loadOpenApiSchema').mockImplementation(() => {
        throw mockError;
      });

      expect(() => setupSwaggerUI(mockApp)).toThrow(mockError);
      expect(logger.error).toHaveBeenCalledWith({ error: mockError }, 'Error setting up Swagger UI');
    });

    it('should handle swagger-ui-express setup errors', () => {
      const mockSchema = { openapi: '3.0.0', info: { title: 'Test API' } };
      const setupError = new Error('Swagger setup failed');

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);
      mockedSwaggerUi.setup.mockImplementation(() => {
        throw setupError;
      });

      expect(() => setupSwaggerUI(mockApp)).toThrow(setupError);
      expect(logger.error).toHaveBeenCalledWith({ error: setupError }, 'Error setting up Swagger UI');
    });

    it('should handle app.use middleware registration errors', () => {
      const mockSchema = { openapi: '3.0.0', info: { title: 'Test API' } };
      const middlewareError = new Error('Middleware registration failed');

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(mockSchema);
      mockApp.use.mockImplementation(() => {
        throw middlewareError;
      });

      expect(() => setupSwaggerUI(mockApp)).toThrow(middlewareError);
      expect(logger.error).toHaveBeenCalledWith({ error: middlewareError }, 'Error setting up Swagger UI');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex schema with existing servers and custom port', () => {
      process.env.PORT = '4000';
      
      const complexSchema = {
        openapi: '3.0.0',
        info: { 
          title: 'Complex API',
          version: '1.0.0',
          description: 'A complex test API'
        },
        servers: [
          { url: 'https://production.example.com', description: 'Production server' },
          { url: 'https://staging.example.com', description: 'Staging server' }
        ],
        paths: {
          '/health': {
            get: {
              summary: 'Health check',
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      const mockApp = {
        use: jest.fn()
      } as unknown as jest.Mocked<express.Express>;

      jest.spyOn(openapi, 'loadOpenApiSchema').mockReturnValue(complexSchema);

      setupSwaggerUI(mockApp);

      const setupCall = mockedSwaggerUi.setup.mock.calls[0];
      const passedSchema = setupCall?.[0];
      
      // Should have original servers plus the two new ones
      expect(passedSchema?.servers).toHaveLength(4);
      
      // Check that local server exists with custom port
      expect(passedSchema?.servers).toContainEqual({
        url: 'http://localhost:4000',
        description: 'Local development server'
      });
      
      // Check that docker server exists
      expect(passedSchema?.servers).toContainEqual({
        url: 'http://coruscant-bank-otc-service:3000',
        description: 'Docker container'
      });
      
      // Check that original servers are preserved
      expect(passedSchema?.servers).toContainEqual(complexSchema.servers[0]);
      expect(passedSchema?.servers).toContainEqual(complexSchema.servers[1]);

      // Should preserve other schema properties
      expect(passedSchema?.info).toEqual(complexSchema.info);
      expect(passedSchema?.paths).toEqual(complexSchema.paths);
    });
  });
});