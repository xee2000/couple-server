import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CyclesService {
  constructor(private supabase: SupabaseService) {}

  /** 내 + 파트너 주기 모두 조회 */
  async getAll(userId: string) {
    // 커플에서 파트너 ID 찾기
    const { data: couple } = await this.supabase.db
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();

    const userIds = couple
      ? [couple.user1_id, couple.user2_id].filter(Boolean)
      : [userId];

    const { data } = await this.supabase.db
      .from('menstrual_cycles')
      .select('*')
      .in('user_id', userIds)
      .order('start_date', { ascending: false });

    return { data };
  }

  async create(userId: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('menstrual_cycles')
      .insert({ ...body, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  async update(id: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('menstrual_cycles')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  async remove(id: string) {
    await this.supabase.db.from('menstrual_cycles').delete().eq('id', id);
    return { success: true };
  }
}
