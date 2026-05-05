import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(private config: ConfigService) {
    this.client = createClient(
      config.get('SUPABASE_URL')!,
      config.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  get db(): SupabaseClient {
    return this.client;
  }
}
