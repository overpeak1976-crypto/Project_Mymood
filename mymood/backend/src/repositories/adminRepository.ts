import prisma from '../config/prisma';

export const adminRepository = {
  async countUsers() {
    return prisma.users.count();
  },

  async countSongs() {
    return prisma.songs.count();
  },

  async countSharedInbox() {
    return prisma.shared_inbox.count();
  },

  async countOnlineUsers() {
    return prisma.users.count({ where: { is_online: true } });
  },

  async countNewUsersToday(todayISO: string) {
    return prisma.users.count({
      where: { created_at: { gte: new Date(todayISO) } },
    });
  },

  async countActiveUsersToday(todayISO: string) {
    return prisma.users.count({
      where: { last_active: { gte: new Date(todayISO) } },
    });
  },

  async getAllSongsAdmin() {
    return prisma.songs.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users_songs_uploaded_byTousers: { select: { handle: true } },
      },
    });
  },

  async getAllUsers() {
    return prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        username: true,
        handle: true,
        email: true,
        created_at: true,
        profile_image_url: true,
      },
    });
  },

  async findSongForDeletion(songId: string) {
    return prisma.songs.findUnique({
      where: { id: songId },
      select: { audio_file_url: true, cover_image_url: true },
    });
  },

  async deleteSongVectors(songId: string) {
    return prisma.song_vectors.deleteMany({ where: { song_id: songId } });
  },

  async deleteSong(songId: string) {
    return prisma.songs.delete({ where: { id: songId } });
  },

  async sendNotification(
    userId: string,
    title: string,
    message: string,
  ) {
    return prisma.notifications.create({
      data: {
        user_id: userId,
        title: title,
        message: message,
        type: 'admin_notice',
        is_read: false,
      },
    });
  },
};
