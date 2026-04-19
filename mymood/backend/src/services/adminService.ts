import { adminRepository } from '../repositories/adminRepository';
import { cloudinaryService } from './cloudinaryService';

export const adminService = {
  // ── Dashboard ──
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      userCount, songCount, shareCount, onlineUsers,
      todayNewUsers, todayActiveUsers, todaySongs, todayPlaylists,
      totalPlaylists, totalLikes, totalPlays,
    ] = await Promise.all([
      adminRepository.countUsers(),
      adminRepository.countSongs(),
      adminRepository.countSharedInbox(),
      adminRepository.countOnlineUsers(),
      adminRepository.countNewUsersToday(todayISO),
      adminRepository.countActiveUsersToday(todayISO),
      adminRepository.countSongsToday(todayISO),
      adminRepository.countPlaylistsToday(todayISO),
      adminRepository.countPlaylists(),
      adminRepository.countLikes(),
      adminRepository.countPlays(),
    ]);

    return {
      total_users: userCount,
      total_songs: songCount,
      total_shares: shareCount,
      online_users: onlineUsers,
      today_new_users: todayNewUsers,
      today_active_users: todayActiveUsers,
      today_new_songs: todaySongs,
      today_new_playlists: todayPlaylists,
      total_playlists: totalPlaylists,
      total_likes: totalLikes,
      total_plays: totalPlays,
    };
  },

  async getUserGrowthChart(days: number = 14) {
    return adminRepository.getUserGrowth(days);
  },

  async getPlayGrowthChart(days: number = 14) {
    return adminRepository.getPlayGrowth(days);
  },

  // ── Song Management ──
  async deleteSong(songId: string) {
    const song = await adminRepository.findSongForDeletion(songId);
    if (!song) throw new Error('ไม่พบข้อมูลเพลงนี้ในระบบ');

    if (song.audio_file_url) {
      await cloudinaryService.deleteFile(song.audio_file_url, 'video');
    }
    if (song.cover_image_url) {
      await cloudinaryService.deleteFile(song.cover_image_url, 'image');
    }

    await adminRepository.deleteSongVectors(songId);
    await adminRepository.deleteSong(songId);
  },

  async getAllSongs() {
    const songs = await adminRepository.getAllSongsAdmin();
    return songs.map((song: any) => ({
      ...song,
      uploader: song.users_songs_uploaded_byTousers,
      users_songs_uploaded_byTousers: undefined,
    }));
  },

  async toggleSongVisibility(songId: string, isPublic: boolean) {
    return adminRepository.toggleSongVisibility(songId, isPublic);
  },

  // ── User Management ──
  async getAllUsers() {
    return adminRepository.getAllUsers();
  },

  async getUserDetail(userId: string) {
    const user = await adminRepository.getUserDetail(userId);
    if (!user) throw new Error('ไม่พบผู้ใช้');
    const [playHistory, uploads] = await Promise.all([
      adminRepository.getUserPlayHistory(userId),
      adminRepository.getUserUploads(userId),
    ]);
    return { ...user, play_history: playHistory, uploads };
  },

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['user', 'admin', 'banned', 'suspended'];
    if (!validRoles.includes(role)) throw new Error('Invalid role');
    return adminRepository.updateUserRole(userId, role);
  },

  async clearUserProfileImage(userId: string) {
    return adminRepository.clearUserProfileImage(userId);
  },

  async clearUserBannerImage(userId: string) {
    return adminRepository.clearUserBannerImage(userId);
  },

  // ── Notifications ──
  async sendMessageToUser(userId: string, title: string, message: string) {
    if (!message) throw new Error('กรุณาพิมพ์ข้อความด้วยครับ');
    const notifTitle = title || '📢 ประกาศจากผู้ดูแลระบบ';
    return adminRepository.sendNotification(userId, notifTitle, message);
  },

  async broadcastMessage(title: string, message: string) {
    if (!message) throw new Error('กรุณาพิมพ์ข้อความด้วยครับ');
    const notifTitle = title || '📢 ประกาศจากผู้ดูแลระบบ';
    const userIds = await adminRepository.getAllUserIds();
    const results = await Promise.allSettled(
      userIds.map(id => adminRepository.sendNotification(id, notifTitle, message))
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { sent, total: userIds.length };
  },

  async sendToInactiveUsers(title: string, message: string, daysSince: number = 7) {
    if (!message) throw new Error('กรุณาพิมพ์ข้อความด้วยครับ');
    const notifTitle = title || '📢 คิดถึงคุณนะ!';
    const userIds = await adminRepository.getInactiveUserIds(daysSince);
    const results = await Promise.allSettled(
      userIds.map(id => adminRepository.sendNotification(id, notifTitle, message))
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { sent, total: userIds.length };
  },

  // ── Analytics ──
  async getAnalytics(days: number = 30) {
    const [
      topByPlays, topByLikes, genreDistribution,
      playsByDay, newUsersByDay, uploadsByDay,
    ] = await Promise.all([
      adminRepository.getTopSongsByPlays(20),
      adminRepository.getTopSongsByLikes(20),
      adminRepository.getGenreDistribution(),
      adminRepository.getPlayCountByDay(days),
      adminRepository.getNewUsersPerDay(days),
      adminRepository.getUploadsPerDay(days),
    ]);

    return {
      top_songs_by_plays: topByPlays,
      top_songs_by_likes: topByLikes,
      genre_distribution: genreDistribution,
      plays_by_day: playsByDay,
      new_users_by_day: newUsersByDay,
      uploads_by_day: uploadsByDay,
    };
  },
};
