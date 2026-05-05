import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class EventsService {
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

  async getEvents(userId: string, year: number, month: number) {
    const coupleId = await this.getCoupleId(userId);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;

    const { data } = await this.supabase.db
      .from('calendar_events')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('date', from)
      .lte('date', to)
      .order('date');
    return { data };
  }

  async create(userId: string, body: any) {
    const coupleId = await this.getCoupleId(userId);
    const { data, error } = await this.supabase.db
      .from('calendar_events')
      .insert({ ...body, couple_id: coupleId, created_by: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  async update(id: string, userId: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('calendar_events')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  async remove(id: string, userId: string) {
    await this.supabase.db.from('calendar_events').delete().eq('id', id);
    return { success: true };
  }
}
