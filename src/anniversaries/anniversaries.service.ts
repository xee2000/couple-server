import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AnniversariesService {
  constructor(private supabase: SupabaseService) {}

  private async getCoupleId(userId: string): Promise<string> {
    const { data } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();
    if (!data) throw new NotFoundException('커플이 연결되지 않았습니다.');
    return data.id;
  }

  async getAll(userId: string) {
    const coupleId = await this.getCoupleId(userId);
    const { data } = await this.supabase.db
      .from('anniversaries')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date');
    return { data };
  }

  async create(userId: string, body: any) {
    const coupleId = await this.getCoupleId(userId);
    const { data, error } = await this.supabase.db
      .from('anniversaries')
      .insert({ ...body, couple_id: coupleId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  async update(id: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('anniversaries')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  async remove(id: string) {
    await this.supabase.db.from('anniversaries').delete().eq('id', id);
    return { success: true };
  }
}
