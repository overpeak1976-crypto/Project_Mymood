import { adminRepository } from '../repositories/adminRepository';
import { cloudinaryService } from './cloudinaryService';

export const adminService = {
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      userCount,
      songCount,
      shareCount,
      onlineUsers,
      todayNewUsers,
      todayActiveUsers,
    ] = await Promise.all([
      adminRepository.countUsers(),
      adminRepository.countSongs(),
      adminRepository.countSharedInbox(),
      adminRepository.countOnlineUsers(),
      adminRepository.countNewUsersToday(todayISO),
      adminRepository.countActiveUsersToday(todayISO),
    ]);

    return {
      total_users: userCount,
      total_songs: songCount,
      total_shares: shareCount,
      online_users: onlineUsers,
      today_new_users: todayNewUsers,
      today_active_users: todayActiveUsers,
    };
  },

  async deleteSong(songId: string) {
    const song = await adminRepository.findSongForDeletion(songId);
    if (!song) throw new Error('ไม่พบข้อมูลเพลงนี้ในระบบ');

    // Delete files from Cloudinary
    if (song.audio_file_url) {
      await cloudinaryService.deleteFile(song.audio_file_url, 'video');
    }
    if (song.cover_image_url) {
      await cloudinaryService.deleteFile(song.cover_image_url, 'image');
    }

    // Delete dependent vectors first, then song
    await adminRepository.deleteSongVectors(songId);
    await adminRepository.deleteSong(songId);
  },

  async getAllSongs() {
    const songs = await adminRepository.getAllSongsAdmin();
    // Remap Prisma's verbose relation name to the 'uploader' key the frontend expects
    return songs.map((song: any) => ({
      ...song,
      uploader: song.users_songs_uploaded_byTousers,
      users_songs_uploaded_byTousers: undefined,
    }));
  },

  async getAllUsers() {
    return adminRepository.getAllUsers();
  },

  async sendMessageToUser(userId: string, title: string, message: string) {
    if (!message) throw new Error('กรุณาพิมพ์ข้อความด้วยครับ');
    const notifTitle = title || '📢 ประกาศจากผู้ดูแลระบบ';
    return adminRepository.sendNotification(userId, notifTitle, message);
  },
};
