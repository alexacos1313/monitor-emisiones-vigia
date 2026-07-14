// frontend/src/services/base.service.ts
import api from './api';

export interface ServiceConfig {
  useMock?: boolean;
  mockDelay?: number;
}

export class BaseService {
  protected useMock: boolean;
  protected mockDelay: number;

  constructor(config: ServiceConfig = {}) {
    // Por defecto usar mock (true) hasta que conectemos con backend real
    this.useMock = config.useMock ?? true;
    this.mockDelay = config.mockDelay || 500;
  }

  protected async handleRequest<T>(
    mockData: T,
    apiCall: () => Promise<any>,
    errorMessage?: string
  ): Promise<T> {
    if (this.useMock) {
      console.log(`[MOCK] ${errorMessage || 'Petición'}`);
      await this.delay();
      return mockData;
    }

    try {
      const response = await apiCall();
      return response.data;
    } catch (error) {
      console.error(errorMessage || 'Error:', error);
      if (this.useMock) {
        await this.delay();
        return mockData;
      }
      throw error;
    }
  }

  private delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.mockDelay));
  }

  setMockMode(enabled: boolean) {
    this.useMock = enabled;
  }
}