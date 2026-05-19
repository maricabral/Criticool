import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TranslationFields = {
  quickTake?: string | null;
  body?: string | null;
};

export type TranslationRequest = {
  fields: TranslationFields;
  sourceLocale: string | null;
  targetLocale: string;
};

@Injectable()
export class TranslationAdapter {
  constructor(private readonly config: ConfigService) {}

  get providerName() {
    return this.config.get<string>('TRANSLATION_PROVIDER') ?? 'passthrough';
  }

  async translate(request: TranslationRequest): Promise<TranslationFields> {
    const endpoint = this.config.get<string>('TRANSLATION_ENDPOINT_URL');
    if (!endpoint) {
      return request.fields;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        fields: request.fields,
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
      }),
    });
    if (!response.ok) {
      throw new Error(`Translation provider failed with ${response.status}`);
    }

    const data = (await response.json()) as { fields?: TranslationFields };
    return {
      quickTake: data.fields?.quickTake ?? request.fields.quickTake ?? null,
      body: data.fields?.body ?? request.fields.body ?? null,
    };
  }

  private headers() {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const apiKey = this.config.get<string>('TRANSLATION_API_KEY');
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }
}
