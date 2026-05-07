import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {}

  /** 카카오 액세스 토큰 → 유저 정보 조회 */
  async kakaoLogin(kakaoAccessToken: string) {
    // 1. 카카오 API로 유저 정보 조회
    let kakaoUser: any;
    try {
      const { data } = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${kakaoAccessToken}` },
      });
      kakaoUser = data;
    } catch {
      throw new UnauthorizedException('카카오 토큰이 유효하지 않습니다.');
    }

    const kakaoId: number = kakaoUser.id;
    const nickname: string = kakaoUser.kakao_account?.profile?.nickname ?? '익명';
    const profileImage: string = kakaoUser.kakao_account?.profile?.profile_image_url ?? '';
    // 카카오 성별: 동의 항목에 gender 추가 시 'male' | 'female' | null
    const gender: string | null = kakaoUser.kakao_account?.gender ?? null;

    // 2. Supabase에서 유저 조회 or 생성
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('kakao_id', kakaoId)
      .single();

    let user = existing;

    if (!user) {
      const { data: created, error } = await this.supabase.db
        .from('users')
        .insert({ kakao_id: kakaoId, nickname, profile_image: profileImage, gender })
        .select()
        .single();

      if (error) throw new Error(error.message);
      user = created;
    } else if (gender && user.gender !== gender) {
      // 동의 후 성별 정보가 새로 들어온 경우 업데이트
      const { data: updated } = await this.supabase.db
        .from('users')
        .update({ gender })
        .eq('id', user.id)
        .select()
        .single();
      if (updated) user = updated;
    }

    // 3. JWT 발급
    const token = this.jwt.sign({ sub: user.id, kakaoId: user.kakao_id });
    return { token, user };
  }
}
