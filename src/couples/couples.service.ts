import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CouplesService {
  constructor(private supabase: SupabaseService) {}

  async getMyCouple(userId: string) {
    const { data } = await this.supabase.db
      .from('couples')
      .select('*, user1:users!user1_id(id,nickname,profile_image), user2:users!user2_id(id,nickname,profile_image)')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();
    return { data };
  }

  async createCouple(userId: string, startDate?: string) {
    // 이미 커플이면 기존 반환
    const { data: existing } = await this.supabase.db
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();
    if (existing) return { data: existing };

    const { data, error } = await this.supabase.db
      .from('couples')
      .insert({ user1_id: userId, start_date: startDate ?? null })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { data };
  }

  async joinCouple(userId: string, inviteCode: string) {
    const { data: couple } = await this.supabase.db
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (!couple) throw new NotFoundException('초대 코드가 유효하지 않습니다.');
    if (couple.user1_id === userId) throw new BadRequestException('본인의 초대 코드입니다.');
    if (couple.user2_id) throw new BadRequestException('이미 연결된 커플입니다.');

    const { data, error } = await this.supabase.db
      .from('couples')
      .update({ user2_id: userId })
      .eq('id', couple.id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { data };
  }
}
