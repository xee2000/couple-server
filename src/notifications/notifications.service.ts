import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    // 이미 초기화되어 있으면 스킵
    if (admin.apps.length > 0) return;

    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON 환경변수가 없습니다. 푸시 알림이 비활성화됩니다.');
      return;
    }

    try {
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('Firebase Admin SDK 초기화 완료');
    } catch (e) {
      this.logger.error('Firebase Admin SDK 초기화 실패', e);
    }
  }

  /**
   * FCM 단일 기기에 푸시 발송
   */
  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>) {
    if (admin.apps.length === 0) return;

    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        android: {
          notification: {
            channelId: 'couple_default',
            priority: 'high',
          },
        },
        data: data ?? {},
      });
      this.logger.log(`푸시 발송 완료 → token: ${token.substring(0, 20)}...`);
    } catch (e) {
      // 토큰 만료/무효 등은 조용히 처리
      this.logger.warn(`푸시 발송 실패: ${e?.message}`);
    }
  }
}
