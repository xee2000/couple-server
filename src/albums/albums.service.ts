import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 초기화
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class AlbumsService {
  constructor(private supabase: SupabaseService) {}

  private async getCoupleId(userId: string): Promise<string> {
    const { data } = await this.supabase.db
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .not('user2_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (!data) throw new NotFoundException('커플이 연결되지 않았습니다.');
    return data.id;
  }

  /** Cloudinary에 버퍼 업로드 → URL 반환 */
  private uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('업로드 실패'));
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  async getAll(userId: string) {
    const coupleId = await this.getCoupleId(userId);
    const { data, error } = await this.supabase.db
      .from('albums')
      .select('*, album_photos(id, file_path, order_index)')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return { data };
  }

  async create(
    userId: string,
    body: { title: string; content?: string; date: string },
    files: Express.Multer.File[],
  ) {
    const coupleId = await this.getCoupleId(userId);

    // Cloudinary 업로드 (병렬)
    const urls = await Promise.all(
      files.map((f) => this.uploadToCloudinary(f.buffer, 'couple-app')),
    );

    const { data: album, error } = await this.supabase.db
      .from('albums')
      .insert({
        title: body.title,
        content: body.content ?? null,
        date: body.date,
        couple_id: coupleId,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (urls.length > 0) {
      await this.supabase.db.from('album_photos').insert(
        urls.map((url, i) => ({
          album_id: album.id,
          file_path: url,   // Cloudinary URL 직접 저장
          order_index: i,
        })),
      );
    }

    return { data: album };
  }

  async remove(id: string) {
    // Cloudinary 파일은 URL만 저장하므로 DB만 삭제 (Cloudinary 파일은 대시보드에서 관리)
    await this.supabase.db.from('albums').delete().eq('id', id);
    return { success: true };
  }
}
