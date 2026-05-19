import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
    if (this.config.get<string>('TRANSLATION_ENDPOINT_URL')) {
      return this.config.get<string>('TRANSLATION_PROVIDER') ?? 'endpoint';
    }
    return this.config.get<string>('TRANSLATION_PROVIDER') ?? 'google';
  }

  async translate(request: TranslationRequest): Promise<TranslationFields> {
    const endpoint = this.config.get<string>('TRANSLATION_ENDPOINT_URL');
    if (this.providerName === 'passthrough') {
      return request.fields;
    }
    if (endpoint) {
      return this.translateViaEndpoint(endpoint, request);
    }

    return {
      quickTake: request.fields.quickTake
        ? await this.translateText(request.fields.quickTake, request)
        : null,
      body: request.fields.body ? await this.translateText(request.fields.body, request) : null,
    };
  }

  private async translateViaEndpoint(endpoint: string, request: TranslationRequest) {
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
      throw new ServiceUnavailableException(`Translation provider failed with ${response.status}`);
    }

    const data = (await response.json()) as { fields?: TranslationFields };
    return {
      quickTake: data.fields?.quickTake ?? request.fields.quickTake ?? null,
      body: data.fields?.body ?? request.fields.body ?? null,
    };
  }

  private async translateText(text: string, request: TranslationRequest) {
    const baseUrl =
      this.config.get<string>('TRANSLATION_GOOGLE_BASE_URL') ??
      'https://translate.googleapis.com/translate_a/single';
    const params = new URLSearchParams({
      client: 'gtx',
      sl: this.providerLocale(request.sourceLocale) ?? 'auto',
      tl: this.providerLocale(request.targetLocale) ?? 'en',
      dt: 't',
      q: text,
    });
    const response = await fetch(`${baseUrl}?${params}`);
    if (!response.ok) {
      throw new ServiceUnavailableException(`Translation provider failed with ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    const translated = this.parseGoogleResponse(data);
    if (!translated) {
      throw new ServiceUnavailableException('Translation provider returned no text');
    }
    return translated;
  }

  private parseGoogleResponse(data: unknown) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return null;
    }
    const segments = data[0] as unknown[];
    return segments
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
      .join('')
      .trim();
  }

  private providerLocale(locale: string | null) {
    const normalized = locale?.trim().replace('_', '-').toLowerCase();
    return normalized?.split('-')[0] || null;
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
