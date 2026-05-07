import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  /** FCM 토큰 저장/갱신 */
  async saveFcmToken(userId: string, fcmToken: string) {
    const { error } = await this.supabase.db
      .from('users')
      .update({ fcm_token: fcmToken })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  /** 성별 저장 — 최초 로그인 이후 1회 */
  async saveGender(userId: string, gender: 'male' | 'female') {
    if (gender !== 'male' && gender !== 'female') {
      throw new BadRequestException('gender는 male 또는 female이어야 합니다.');
    }
    const { error } = await this.supabase.db
      .from('users')
      .update({ gender })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { success: true };
  }
}
