import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class ChatService {
  constructor(private supabase: SupabaseService) {}

  private async getCoupleId(userId: string): Promise<string> {
    const { data } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();
    if (!data) throw new NotFoundException('커플이 연결되지 않았습니다.');
    return data.id;
  }

  /** 1개월 지난 메시지 자동 삭제 */
  private async deleteOldMessages(coupleId: string) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    await this.supabase.db
      .from('chat_messages')
      .delete()
      .eq('couple_id', coupleId)
      .lt('created_at', oneMonthAgo.toISOString());
  }

  /** 메시지 목록 조회 (최신 50개, cursor 기반 페이지네이션) */
  async getMessages(userId: string, before?: string, after?: string) {
    const coupleId = await this.getCoupleId(userId);

    // 오래된 메시지 정리 (비동기, 오류 무시)
    this.deleteOldMessages(coupleId).catch(() => {});

    let query = this.supabase.db
      .from('chat_messages')
      .select('*, sender:users!sender_id(id, nickname, profile_image)')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (before) query = query.lt('created_at', before);
    if (after)  query = query.gt('created_at', after);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { data: (data || []).reverse() };
  }

  /** 텍스트 / 이모티콘 메시지 전송 */
  async sendMessage(userId: string, body: {
    message_type: string;
    content?: string;
    emoticon?: string;
    file_url?: string;
    file_name?: string;
  }) {
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

    if (error) throw new Error(error.message);
    return { data };
  }

  /** 이미지 / 파일 Cloudinary 업로드 → URL 반환 */
  async uploadFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string; name: string; type: string }> {
    await this.getCoupleId(userId); // 커플 연결 확인

    const isVideo = file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'chat', resource_type: resourceType },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('업로드 실패'));
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });

    return {
      url,
      name: file.originalname,
      type: resourceType === 'video' ? 'video' : 'image',
    };
  }
}
