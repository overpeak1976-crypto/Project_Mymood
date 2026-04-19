import prisma from '../config/prisma';

export const playRepository = {
  async insertPlayHistory(userId: string, songId: string, playedAt?: Date, durationMs?: number, positionMs?: number) {
    return prisma.play_history.create({
      data: {
        user_id: userId,
        song_id: songId,
        played_at: playedAt
      },
    });
  },
  async updateCurrentPlayingSongId(userId: string, songId: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { current_playing_song_id: songId },
    });
  },

  async getSongPlayCount(songId: string) {
    const song = await prisma.songs.findUnique({
      where: { id: songId },
      select: { play_count: true },
    });
    return song?.play_count ?? 0;
  },

  async updatePlayCount(songId: string, newCount: number) {
    return prisma.songs.update({
      where: { id: songId },
      data: { play_count: newCount },
    });
  },

  async getRecentHistory(userId: string, limit = 10) {
    return prisma.play_history.findMany({
      where: { user_id: userId },
      orderBy: { played_at: 'desc' },
      take: limit,
      distinct: ['song_id'], // avoid duplicate songs in history
      select: {
        played_at: true,
        songs: {
          select: {
            id: true,
            title: true,
            artist: true,
            cover_image_url: true,
            audio_file_url: true,
          },
        },
      },
    });
  },
};
