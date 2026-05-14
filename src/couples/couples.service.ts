import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CouplesService {
  constructor(
    private supabase: SupabaseService,
    private notifications: NotificationsService,
  ) {}

  async getMyCouple(userId: string) {
    // 1) 연결된 커플(user2_id 있는 것) 우선 조회
    const { data: connected } = await this.supabase.db
      .from('couples')
      .select('*, user1:users!user1_id(id,nickname,profile_image), user2:users!user2_id(id,nickname,profile_image)')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (connected) {
      const isUser1 = connected.user1_id === userId;
      const partner = isUser1 ? connected.user2 : connected.user1;
      const me = isUser1 ? connected.user1 : connected.user2;
      return {
        data: {
          ...connected,
          partner_nickname: partner?.nickname ?? '연인',
          partner_profile_image: partner?.profile_image ?? null,
          my_profile_image: me?.profile_image ?? null,
        },
      };
    }

    // 2) 미연결 상태 - 본인의 가장 최신 invite row 반환 (초대코드 표시용)
    const { data: pending } = await this.supabase.db
      .from('couples')
      .select('*')
      .eq('user1_id', userId)
      .is('user2_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { data: pending };
  }

  async createCouple(userId: string, startDate?: string) {
    // 이미 연결된 커플이면 반환
    const { data: connected } = await this.supabase.db
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (connected) return { data: connected };

    // 기존 미연결 invite 코드가 있으면 재사용
    const { data: pending } = await this.supabase.db
      .from('couples')
      .select('*')
      .eq('user1_id', userId)
      .is('user2_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending) return { data: pending };

    // 새 invite 코드 생성
    const { data, error } = await this.supabase.db
      .from('couples')
      .insert({ user1_id: userId, start_date: startDate ?? null })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { data };
  }

  /** 처음 사귄날 저장 */
  async updateStartDate(userId: string, startDate: string) {
    const { data: couple } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!couple) throw new NotFoundException('연결된 커플이 없습니다.');

    const { data, error } = await this.supabase.db
      .from('couples')
      .update({ start_date: startDate })
      .eq('id', couple.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  }

  async disconnectCouple(userId: string) {
    // 연결된 커플 row 찾기
    const { data: couple } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!couple) throw new NotFoundException('연결된 커플이 없습니다.');

    const coupleId = couple.id;
    await this.supabase.db.from('calendar_events').delete().eq('couple_id', coupleId);
    await this.supabase.db.from('anniversaries').delete().eq('couple_id', coupleId);

    const { error } = await this.supabase.db.from('couples').delete().eq('id', coupleId);
    if (error) throw new BadRequestException(error.message);

    return { success: true };
  }

  async joinCouple(userId: string, inviteCode: string) {
    // 1. 이미 연결된 커플이 있으면 차단
    const { data: alreadyConnected } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (alreadyConnected) throw new BadRequestException('이미 연결된 커플입니다.');

    // 2. 초대 코드로 커플 조회
    const { data: couple } = await this.supabase.db
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode)
      .is('user2_id', null)   // 아직 미연결인 것만
      .maybeSingle();

    if (!couple) throw new NotFoundException('유효하지 않은 초대 코드입니다.');
    if (couple.user1_id === userId) throw new BadRequestException('본인의 초대 코드입니다.');

    // 3. 커플 연결
    const { data, error } = await this.supabase.db
      .from('couples')
      .update({ user2_id: userId })
      .eq('id', couple.id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    // 4. 초대 생성자에게 푸시 알림
    await this.notifyInviter(couple.user1_id, userId);

    return { data };
  }

  private async notifyInviter(inviterId: string, joinerId: string) {
    try {
      const [{ data: inviter }, { data: joiner }] = await Promise.all([
        this.supabase.db.from('users').select('fcm_token').eq('id', inviterId).single(),
        this.supabase.db.from('users').select('nickname').eq('id', joinerId).single(),
      ]);

      if (!inviter?.fcm_token) return;

      const joinerName = joiner?.nickname ?? '파트너';
      await this.notifications.sendToToken(
        inviter.fcm_token,
        '💕 커플 연결 완료!',
        `${joinerName}님이 연결됐어요. 함께 캘린더를 꾸며보세요!`,
        { type: 'couple_connected' },
      );
    } catch (_) {}
  }
}
