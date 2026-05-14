import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    private supabase: SupabaseService,
    private notifications: NotificationsService,
  ) {}

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
      .select('*, creator:users!created_by(nickname)')
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

    // 파트너에게 FCM 푸시 발송
    await this.notifyPartner(userId, coupleId, body.title, body.date);

    return { data };
  }

  /** 파트너에게 일정 등록 알림 발송 */
  private async notifyPartner(
    userId: string,
    coupleId: string,
    eventTitle: string,
    date: string,
  ) {
    try {
      const { data: couple } = await this.supabase.db
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .single();
      if (!couple) return;

      const partnerId =
        couple.user1_id === userId ? couple.user2_id : couple.user1_id;
      if (!partnerId) return;

      const [{ data: me }, { data: partner }] = await Promise.all([
        this.supabase.db
          .from('users')
          .select('nickname')
          .eq('id', userId)
          .single(),
        this.supabase.db
          .from('users')
          .select('fcm_token')
          .eq('id', partnerId)
          .single(),
      ]);

      if (!partner?.fcm_token) return;

      const myName = me?.nickname ?? '파트너';
      await this.notifications.sendToToken(
        partner.fcm_token,
        `📅 ${myName}님이 일정을 추가했어요`,
        `${date} · ${eventTitle}`,
        { type: 'new_event', screen: 'calendar' },
      );
    } catch (_) {}
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
