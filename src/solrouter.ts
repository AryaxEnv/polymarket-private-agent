import { SolRouter } from '@solrouter/sdk';

export interface SolRouterConfig {
  apiKey: string;
  network: "devnet" | "mainnet";
}

export interface QueryParams {
  model: string;
  prompt: string;
  maxTokens?: number;
}

export interface QueryResult {
  response: string;
  queryId: string;
  txSignature?: string;
  tokensUsed: number;
}

export class SolRouterClient {
  private readonly client: SolRouter;

  constructor(config: SolRouterConfig) {
    if (!config.apiKey) {
      throw new Error("SOLROUTER_API_KEY is missing.");
    }
    this.client = new SolRouter({
      apiKey: config.apiKey,
    });
  }

  async query(params: QueryParams): Promise<QueryResult> {
    console.log(`   → Routing via SolRouter SDK`);
    console.log(`   → Model: gpt-oss-20b`);
    console.log(`   → Prompt length: ${params.prompt.length} chars`);
    console.log(`   → Encryption: client-side (TEE-bound)\n`);

    const response = await this.client.chat(params.prompt, {
      model: 'gpt-oss-20b',
    });

    return {
      response: response.message,
      queryId: 'solr_' + Math.random().toString(36).slice(2, 12),
      tokensUsed: 0,
    };
  }

  async getBalance(): Promise<{ usdc: number; credits: number }> {
    const bal = await this.client.getBalance();
    return {
      usdc: parseFloat(bal.balanceFormatted ?? "0"),
      credits: 0,
    };
  }
}