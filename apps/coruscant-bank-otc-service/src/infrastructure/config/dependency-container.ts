import { ConfigurationService } from './application-config';
import { LoanRepository } from '../../domain/repositories/loan-repository';
import { BorrowerRepository } from '../../domain/repositories/borrower-repository';
import { LoanRiskAssessmentService } from '../../domain/services/loan-risk-assessment-service';
import { EventPublisher } from '../../application/interfaces/event-publisher';
import { LiquidationService } from '../../application/interfaces/liquidation-service';
import { SubmitLoanApplicationUseCase } from '../../application/use-cases/submit-loan-application';
import { SubmitCollateralTopUpUseCase } from '../../application/use-cases/submit-collateral-top-up';
import { InMemoryLoanRepository } from '../persistence/in-memory-loan-repository';
import { InMemoryBorrowerRepository } from '../persistence/in-memory-borrower-repository';
import { SnsEventPublisher } from '../messaging/sns-event-publisher';
import { HttpLiquidationService } from '../http/http-liquidation-service';
import { SnsPublisher } from '../messaging/sns-publisher';
import { SnsClientFactory } from '../factories/sns-client-factory';

export class DependencyContainer {
  private static instance: DependencyContainer;
  private readonly configService: ConfigurationService;
  private readonly services: Map<string, unknown> = new Map();

  private constructor() {
    this.configService = new ConfigurationService();
    this.registerServices();
  }

  public static getInstance(): DependencyContainer {
    if (!this.instance) {
      this.instance = new DependencyContainer();
    }
    return this.instance;
  }

  public getConfigurationService(): ConfigurationService {
    return this.configService;
  }

  public getLoanRepository(): LoanRepository {
    return this.get<LoanRepository>('LoanRepository');
  }

  public getBorrowerRepository(): BorrowerRepository {
    return this.get<BorrowerRepository>('BorrowerRepository');
  }

  public getRiskAssessmentService(): LoanRiskAssessmentService {
    return this.get<LoanRiskAssessmentService>('LoanRiskAssessmentService');
  }

  public getEventPublisher(): EventPublisher {
    return this.get<EventPublisher>('EventPublisher');
  }

  public getLiquidationService(): LiquidationService {
    return this.get<LiquidationService>('LiquidationService');
  }

  public getSubmitLoanApplicationUseCase(): SubmitLoanApplicationUseCase {
    return this.get<SubmitLoanApplicationUseCase>('SubmitLoanApplicationUseCase');
  }

  public getSubmitCollateralTopUpUseCase(): SubmitCollateralTopUpUseCase {
    return this.get<SubmitCollateralTopUpUseCase>('SubmitCollateralTopUpUseCase');
  }

  private get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }
    return service as T;
  }

  private registerServices(): void {
    // Repositories
    this.services.set('LoanRepository', new InMemoryLoanRepository());
    this.services.set('BorrowerRepository', new InMemoryBorrowerRepository());

    // Domain services
    this.services.set(
      'LoanRiskAssessmentService',
      new LoanRiskAssessmentService(this.configService.getRiskAssessmentConfig())
    );

    // Infrastructure services
    const snsClient = SnsClientFactory.create();
    const snsPublisher = new SnsPublisher(
      snsClient,
      this.configService.getLoanEventsTopicArn()
    );
    this.services.set('SNSPublisher', snsPublisher);
    this.services.set(
      'EventPublisher',
      new SnsEventPublisher(snsPublisher)
    );
    this.services.set(
      'LiquidationService',
      new HttpLiquidationService(this.configService.getLiquidationServiceUrl())
    );

    // Use cases
    this.services.set(
      'SubmitLoanApplicationUseCase',
      new SubmitLoanApplicationUseCase(
        this.getLoanRepository(),
        this.getBorrowerRepository(),
        this.getRiskAssessmentService(),
        this.getEventPublisher(),
        this.getLiquidationService(),
        this.configService.isSelfPublishingEnabled()
      )
    );

    this.services.set(
      'SubmitCollateralTopUpUseCase',
      new SubmitCollateralTopUpUseCase(
        this.getLoanRepository(),
        this.getEventPublisher(),
        this.getLiquidationService(),
        this.configService.isSelfPublishingEnabled()
      )
    );
  }
}