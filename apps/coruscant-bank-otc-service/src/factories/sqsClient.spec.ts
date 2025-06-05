import { SQSClient } from '@aws-sdk/client-sqs';
import { createSqsClient, sqsClient } from './sqsClient';
import { awsConfig } from '../config/aws';

// Mock AWS SDK
jest.mock('@aws-sdk/client-sqs');
jest.mock('../config/aws', () => ({
  awsConfig: {
    region: 'us-east-1',
    endpoint: 'http://localhost:4566'
  }
}));

const MockedSQSClient = SQSClient as jest.MockedClass<typeof SQSClient>;

describe('SQS Client Factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSqsClient', () => {
    it('should create and return new SQS client with aws config', () => {
      const mockSqsInstance = {} as SQSClient;
      MockedSQSClient.mockImplementation(() => mockSqsInstance);

      const result = createSqsClient();

      expect(MockedSQSClient).toHaveBeenCalledWith(awsConfig);
      expect(result).toBe(mockSqsInstance);
    });

    it('should create new instance each time called', () => {
      const mockInstance1 = {} as SQSClient;
      const mockInstance2 = {} as SQSClient;
      
      MockedSQSClient
        .mockImplementationOnce(() => mockInstance1)
        .mockImplementationOnce(() => mockInstance2);

      const result1 = createSqsClient();
      const result2 = createSqsClient();

      expect(result1).toBe(mockInstance1);
      expect(result2).toBe(mockInstance2);
      expect(MockedSQSClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('sqsClient singleton', () => {
    it('should be defined as singleton instance', () => {
      expect(sqsClient).toBeDefined();
      expect(sqsClient).toBeInstanceOf(SQSClient);
    });
  });
});