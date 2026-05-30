import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AnswersService {
  constructor(private supabase: SupabaseService) {}

  private async getPartnerIdOrNull(userId: string): Promise<string | null> {
    const { data } = await this.supabase.db
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return data.user1_id === userId ? data.user2_id : data.user1_id;
  }

  /** 내 답변 + 파트너 답변 모두 조회 */
  async getAll(userId: string) {
    const partnerId = await this.getPartnerIdOrNull(userId);

    const userIds = [userId, ...(partnerId ? [partnerId] : [])];

    const { data, error } = await this.supabase.db
      .from('user_answers')
      .select('user_id, question_key, answer, updated_at')
      .in('user_id', userIds);

    if (error) throw new Error(error.message);

    const myAnswers = (data ?? []).filter((a) => a.user_id === userId);
    const partnerAnswers = partnerId
      ? (data ?? []).filter((a) => a.user_id === partnerId)
      : [];

    return { data: { my: myAnswers, partner: partnerAnswers } };
  }

  /** 답변 저장 (upsert) */
  async upsert(userId: string, questionKey: string, answer: string) {
    const { data, error } = await this.supabase.db
      .from('user_answers')
      .upsert(
        { user_id: userId, question_key: questionKey, answer, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,question_key' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  }

  /** 답변 삭제 */
  async remove(userId: string, questionKey: string) {
    await this.supabase.db
      .from('user_answers')
      .delete()
      .eq('user_id', userId)
      .eq('question_key', questionKey);
    return { success: true };
  }
}
