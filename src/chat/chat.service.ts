import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private supabase: SupabaseService) {}

  private async getCoupleId(userId: string): Promise<string> {
    this.logger.debug(`getCoupleId 조회 → userId: ${userId}`);
    const { data, error } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();

    if (error) {
      this.logger.error(`getCoupleId Supabase 오류 → userId: ${userId} | ${error.message}`);
      throw new NotFoundException('커플이 연결되지 않았습니다.');
    }
    if (!data) {
      this.logger.warn(`getCoupleId 결과 없음 → userId: ${userId}`);
      throw new NotFoundException('커플이 연결되지 않았습니다.');
    }
    this.logger.debug(`getCoupleId 성공 → coupleId: ${data.id}`);
    return data.id;
  }

  /** 1개월 지난 메시지 자동 삭제 */
  private async deleteOldMessages(coupleId: string) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const { error, count } = await this.supabase.db
      .from('chat_messages')
      .delete({ count: 'exact' })
      .eq('couple_id', coupleId)
      .lt('created_at', oneMonthAgo.toISOString());

    if (error) {
      this.logger.warn(`오래된 메시지 삭제 실패 → coupleId: ${coupleId} | ${error.message}`);
    } else if (count && count > 0) {
      this.logger.log(`오래된 메시지 ${count}건 삭제 → coupleId: ${coupleId}`);
    }
  }

  /** 메시지 목록 조회 */
  async getMessages(userId: string, before?: string, after?: string) {
    this.logger.log(`[GET /chat] userId: ${userId} | before: ${before ?? '-'} | after: ${after ?? '-'}`);
    try {
      const coupleId = await this.getCoupleId(userId);
      this.deleteOldMessages(coupleId).catch((e) =>
        this.logger.warn(`deleteOldMessages 예외: ${e?.message}`),
      );

      let query = this.supabase.db
        .from('chat_messages')
        .select('*, sender:users!sender_id(id, nickname, profile_image)')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(50);

      // URL 쿼리에서 '+' → ' ' 자동 디코딩 문제 보정
      const safeTs = (ts: string) => ts.replace(/ /g, '+');
      if (before) query = query.lt('created_at', safeTs(before));
      if (after)  query = query.gt('created_at', safeTs(after));

      const { data, error } = await query;
      if (error) {
        this.logger.error(`메시지 조회 실패 → coupleId: ${coupleId} | ${error.message}`);
        throw new Error(error.message);
      }

      const messages = (data || []).reverse();
      this.logger.log(`메시지 조회 완료 → ${messages.length}건`);
      return { data: messages };
    } catch (e) {
      this.logger.error(`[GET /chat] 처리 중 예외 → ${e?.message}`, e?.stack);
      throw e;
    }
  }

  /** 텍스트 / 이모티콘 메시지 전송 */
  async sendMessage(
    userId: string,
    body: {
      message_type: string;
      content?: string;
      emoticon?: string;
      file_url?: string;
      file_name?: string;
    },
  ) {
    this.logger.log(
      `[POST /chat] userId: ${userId} | type: ${body.message_type} | content: ${body.content?.substring(0, 30) ?? '-'}`,
    );
    try {
      const coupleId = await this.getCoupleId(userId);

      const { data, error } = await this.supabase.db
        .from('chat_messages')
        .insert({
          couple_id: coupleId,
          sender_id: userId,
          message_type: body.message_type ?? 'text',
          content: body.content ?? null,
          emoticon: body.emoticon ?? null,
          file_url: body.file_url ?? null,
          file_name: body.file_name ?? null,
        })
        .select('*, sender:users!sender_id(id, nickname, profile_image)')
        .single();

      if (error) {
        this.logger.error(`메시지 저장 실패 → coupleId: ${coupleId} | ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`메시지 저장 완료 → id: ${data.id}`);
      return { data };
    } catch (e) {
      this.logger.error(`[POST /chat] 처리 중 예외 → ${e?.message}`, e?.stack);
      throw e;
    }
  }

  /** 이미지 / 파일 Cloudinary 업로드 */
  async uploadFile(userId: string, file: Express.Multer.File) {
    this.logger.log(
      `[POST /chat/upload] userId: ${userId} | file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
    );
    try {
      await this.getCoupleId(userId);

      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      const url = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'chat', resource_type: resourceType },
          (err, result) => {
            if (err || !result) {
              this.logger.error(`Cloudinary 업로드 실패 → ${err?.message}`);
              return reject(err ?? new Error('업로드 실패'));
            }
            resolve(result.secure_url);
          },
        );
        stream.end(file.buffer);
      });

      this.logger.log(`파일 업로드 완료 → url: ${url}`);
      return { url, name: file.originalname, type: resourceType === 'video' ? 'video' : 'image' };
    } catch (e) {
      this.logger.error(`[POST /chat/upload] 처리 중 예외 → ${e?.message}`, e?.stack);
      throw e;
    }
  }
}
