import { z } from 'zod';

const configSchema = z.object({
  // Server configuration
  port: z.number().int().min(1).max(65535).default(3000),
  
  // AWS configuration
  awsRegion: z.string().default('us-east-1'),
  awsEndpoint: z.string().optional(),
  awsAccessKeyId: z.string().default('test'),
  awsSecretAccessKey: z.string().default('test'),
  
  // SNS/SQS configuration
  loanEventsTopic: z.string().default('coruscant-bank-loan-events'),
  loanQueueName: z.string().default('coruscant-bank-loan-queue'),
  
  // Feature flags
  enableSelfPublishing: z.boolean().default(false),
  
  // External services
  liquidationServiceUrl: z.string().url().default('http://localhost:4000'),
  
  // Business rules
  loanActivationThreshold: z.number().min(0).max(100).default(50),
  loanLiquidationThreshold: z.number().min(0).max(100).default(80),
  minimumCollateralRatio: z.number().min(1).default(2),
  
  // Application limits
  maxInMemoryEvents: z.number().int().min(1).default(1000),
  
  // Simulation settings
  maxSimulationClients: z.number().int().min(1).default(10),
  simulationActionIntervalMs: z.number().int().min(100).default(1000),
  autoStartSimulation: z.boolean().default(false)
});

export type ApplicationConfig = z.infer<typeof configSchema>;

export class ConfigurationService {
  private config: ApplicationConfig;

  constructor() {
    this.config = this.loadAndValidateConfig();
  }

  public getConfig(): ApplicationConfig {
    return { ...this.config };
  }

  public getPort(): number {
    return this.config.port;
  }

  public getAwsConfig() {
    return {
      region: this.config.awsRegion,
      endpoint: this.config.awsEndpoint,
      credentials: {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey
      }
    };
  }

  public getLoanEventsTopic(): string {
    return this.config.loanEventsTopic;
  }

  public getLoanQueueName(): string {
    return this.config.loanQueueName;
  }

  public isSelfPublishingEnabled(): boolean {
    return this.config.enableSelfPublishing;
  }

  public getLiquidationServiceUrl(): string {
    return this.config.liquidationServiceUrl;
  }

  public getRiskAssessmentConfig() {
    return {
      activationThreshold: this.config.loanActivationThreshold,
      liquidationThreshold: this.config.loanLiquidationThreshold,
      minimumCollateralRatio: this.config.minimumCollateralRatio
    };
  }

  public getMaxInMemoryEvents(): number {
    return this.config.maxInMemoryEvents;
  }

  public getSimulationConfig() {
    return {
      maxClients: this.config.maxSimulationClients,
      actionIntervalMs: this.config.simulationActionIntervalMs,
      autoStart: this.config.autoStartSimulation
    };
  }

  private loadAndValidateConfig(): ApplicationConfig {
    const rawConfig = {
      port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
      awsRegion: process.env.AWS_REGION,
      awsEndpoint: process.env.AWS_ENDPOINT,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      loanEventsTopic: process.env.LOAN_EVENTS_TOPIC,
      loanQueueName: process.env.LOAN_QUEUE_NAME,
      enableSelfPublishing: process.env.ENABLE_SELF_PUBLISHING === 'true',
      liquidationServiceUrl: process.env.LIQUIDATION_SERVICE_URL,
      loanActivationThreshold: process.env.LOAN_ACTIVATION_THRESHOLD ? 
        parseFloat(process.env.LOAN_ACTIVATION_THRESHOLD) : undefined,
      loanLiquidationThreshold: process.env.LOAN_LIQUIDATION_THRESHOLD ? 
        parseFloat(process.env.LOAN_LIQUIDATION_THRESHOLD) : undefined,
      minimumCollateralRatio: process.env.MINIMUM_COLLATERAL_RATIO ? 
        parseFloat(process.env.MINIMUM_COLLATERAL_RATIO) : undefined,
      maxInMemoryEvents: process.env.MAX_IN_MEMORY_EVENTS ? 
        parseInt(process.env.MAX_IN_MEMORY_EVENTS) : undefined,
      maxSimulationClients: process.env.MAX_SIMULATION_CLIENTS ? 
        parseInt(process.env.MAX_SIMULATION_CLIENTS) : undefined,
      simulationActionIntervalMs: process.env.SIMULATION_ACTION_INTERVAL_MS ? 
        parseInt(process.env.SIMULATION_ACTION_INTERVAL_MS) : undefined,
      autoStartSimulation: process.env.AUTO_START_SIMULATION === 'true'
    };

    const result = configSchema.safeParse(rawConfig);
    
    if (!result.success) {
      const errorMessages = result.error.errors.map(
        error => `${error.path.join('.')}: ${error.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    return result.data;
  }
}