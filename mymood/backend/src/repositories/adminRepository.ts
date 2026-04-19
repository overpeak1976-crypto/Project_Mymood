import prisma from '../config/prisma';

export const adminRepository = {
  // ── Dashboard Stats ──
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

  async countSongsToday(todayISO: string) {
    return prisma.songs.count({
      where: { created_at: { gte: new Date(todayISO) } },
    });
  },

  async countPlaylistsToday(todayISO: string) {
    return prisma.playlists.count({
      where: { created_at: { gte: new Date(todayISO) } },
    });
  },

  async countPlaylists() {
    return prisma.playlists.count();
  },

  async countLikes() {
    return prisma.liked_songs.count();
  },

  async countPlays() {
    return prisma.play_history.count();
  },

  // Daily user registrations for last N days
  async getUserGrowth(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(created_at) as day, COUNT(*)::bigint as count
       FROM users WHERE created_at >= $1
       GROUP BY DATE(created_at) ORDER BY day`,
      since
    );
    return rows.map(r => ({ day: String(r.day).slice(0, 10), count: Number(r.count) }));
  },

  // Daily play counts for last N days
  async getPlayGrowth(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(played_at) as day, COUNT(*)::bigint as count
       FROM play_history WHERE played_at >= $1
       GROUP BY DATE(played_at) ORDER BY day`,
      since
    );
    return rows.map(r => ({ day: String(r.day).slice(0, 10), count: Number(r.count) }));
  },

  // ── Song Management ──
  async getAllSongsAdmin() {
    return prisma.songs.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users_songs_uploaded_byTousers: { select: { handle: true } },
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

  async toggleSongVisibility(songId: string, isPublic: boolean) {
    return prisma.songs.update({
      where: { id: songId },
      data: { is_public: isPublic },
    });
  },

  // ── User Management ──
  async getAllUsers() {
    return prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        username: true,
        handle: true,
        email: true,
        created_at: true,
        last_active: true,
        is_online: true,
        role: true,
        profile_image_url: true,
        banner_image_url: true,
        bio: true,
      },
    });
  },

  async getUserDetail(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        handle: true,
        email: true,
        created_at: true,
        last_active: true,
        is_online: true,
        role: true,
        profile_image_url: true,
        banner_image_url: true,
        bio: true,
        link: true,
        show_activity_status: true,
        show_uploads: true,
        _count: {
          select: {
            songs_songs_uploaded_byTousers: true,
            liked_songs: true,
            playlists: true,
            play_history: true,
          },
        },
      },
    });
  },

  async getUserPlayHistory(userId: string, limit: number = 20) {
    return prisma.play_history.findMany({
      where: { user_id: userId },
      orderBy: { played_at: 'desc' },
      take: limit,
      include: {
        songs: { select: { id: true, title: true, artist: true, cover_image_url: true } },
      },
    });
  },

  async getUserUploads(userId: string) {
    return prisma.songs.findMany({
      where: { uploaded_by: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        artist: true,
        cover_image_url: true,
        play_count: true,
        created_at: true,
        is_public: true,
      },
    });
  },

  async updateUserRole(userId: string, role: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { role },
    });
  },

  async clearUserProfileImage(userId: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { profile_image_url: null },
    });
  },

  async clearUserBannerImage(userId: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { banner_image_url: null },
    });
  },

  // ── Notifications ──
  async sendNotification(userId: string, title: string, message: string) {
    return prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        type: 'admin_notice',
        is_read: false,
      },
    });
  },

  async getAllUserIds() {
    const users = await prisma.users.findMany({ select: { id: true } });
    return users.map(u => u.id);
  },

  async getInactiveUserIds(daysSince: number) {
    const since = new Date();
    since.setDate(since.getDate() - daysSince);
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { last_active: { lt: since } },
          { last_active: null },
        ],
      },
      select: { id: true },
    });
    return users.map(u => u.id);
  },

  // ── Analytics ──
  async getTopSongsByPlays(limit: number = 20) {
    return prisma.songs.findMany({
      orderBy: { play_count: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        artist: true,
        cover_image_url: true,
        play_count: true,
        genre: true,
      },
    });
  },

  async getTopSongsByLikes(limit: number = 20) {
    const songs = await prisma.liked_songs.groupBy({
      by: ['song_id'],
      _count: { song_id: true },
      orderBy: { _count: { song_id: 'desc' } },
      take: limit,
    });

    const songIds = songs.map(s => s.song_id).filter(Boolean) as string[];
    const songDetails = await prisma.songs.findMany({
      where: { id: { in: songIds } },
      select: { id: true, title: true, artist: true, cover_image_url: true, genre: true },
    });

    return songs.map(s => {
      const detail = songDetails.find(d => d.id === s.song_id);
      return { ...detail, like_count: s._count.song_id };
    });
  },

  async getGenreDistribution() {
    const genres = await prisma.songs.groupBy({
      by: ['genre'],
      _count: { genre: true },
      orderBy: { _count: { genre: 'desc' } },
    });
    return genres.map(g => ({
      genre: g.genre || 'Unknown',
      count: g._count.genre,
    }));
  },

  async getPlayCountByDay(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(played_at) as day, COUNT(*)::bigint as count
       FROM play_history WHERE played_at >= $1
       GROUP BY DATE(played_at) ORDER BY day`,
      since
    );
    return rows.map(r => ({ day: String(r.day).slice(0, 10), count: Number(r.count) }));
  },

  async getNewUsersPerDay(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(created_at) as day, COUNT(*)::bigint as count
       FROM users WHERE created_at >= $1
       GROUP BY DATE(created_at) ORDER BY day`,
      since
    );
    return rows.map(r => ({ day: String(r.day).slice(0, 10), count: Number(r.count) }));
  },

  async getUploadsPerDay(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      `SELECT DATE(created_at) as day, COUNT(*)::bigint as count
       FROM songs WHERE created_at >= $1
       GROUP BY DATE(created_at) ORDER BY day`,
      since
    );
    return rows.map(r => ({ day: String(r.day).slice(0, 10), count: Number(r.count) }));
  },
};
