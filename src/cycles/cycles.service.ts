import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CyclesService {
  constructor(
    private supabase: SupabaseService,
    private notifications: NotificationsService,
  ) {}

  /** 내 + 파트너 주기 모두 조회 */
  async getAll(userId: string) {
    const { data: couple } = await this.supabase.db
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();

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

    // 파트너에게 푸시 알림
    await this.notifyPartner(userId, 'new');

    return { data };
  }

  async update(id: string, userId: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('menstrual_cycles')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // 파트너에게 푸시 알림
    await this.notifyPartner(userId, 'update');

    return { data };
  }

  async remove(id: string) {
    await this.supabase.db.from('menstrual_cycles').delete().eq('id', id);
    return { success: true };
  }

  /**
   * 커플에서 파트너의 FCM 토큰을 찾아 푸시 발송
   */
  private async notifyPartner(userId: string, type: 'new' | 'update') {
    try {
      // 1. 커플에서 파트너 ID 추출
      const { data: couple } = await this.supabase.db
        .from('couples')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .not('user2_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (!couple) return;

      const partnerId =
        couple.user1_id === userId ? couple.user2_id : couple.user1_id;
      if (!partnerId) return; // 아직 연결 안 된 상태

      // 2. 파트너 FCM 토큰 조회
      const { data: partner } = await this.supabase.db
        .from('users')
        .select('fcm_token, nickname')
        .eq('id', partnerId)
        .single();

      if (!partner?.fcm_token) return;

      // 3. 푸시 발송
      const title = '💕 파트너 알림';
      const body =
        type === 'new'
          ? '파트너가 생리 주기를 기록했어요 🌸'
          : '파트너가 생리 주기를 수정했어요 🌸';

      await this.notifications.sendToToken(partner.fcm_token, title, body, {
        type: 'cycle_updated',
      });
    } catch (e) {
      // 알림 실패가 메인 로직에 영향을 주지 않도록
    }
  }
}
