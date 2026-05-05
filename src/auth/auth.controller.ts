import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Flutter에서 카카오 SDK로 받은 accessToken을 전달 */
  @Post('kakao')
  kakaoLogin(@Body('accessToken') accessToken: string) {
    return this.auth.kakaoLogin(accessToken);
  }
}
