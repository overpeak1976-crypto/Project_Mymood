import prisma from '../config/prisma';

export const likeRepository = {
  async findLike(userId: string, songId: string) {
    return prisma.liked_songs.findFirst({
      where: { user_id: userId, song_id: songId },
    });
  },

  async deleteLike(userId: string, songId: string) {
    return prisma.liked_songs.deleteMany({
      where: { user_id: userId, song_id: songId },
    });
  },

  async insertLike(userId: string, songId: string) {
    return prisma.liked_songs.create({
      data: { user_id: userId, song_id: songId },
    });
  },

  async getLikedSongs(userId: string) {
    return prisma.liked_songs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        created_at: true,
        songs: {
          select: {
            id: true,
            title: true,
            artist: true,
            cover_image_url: true,
            audio_file_url: true,
            duration_seconds: true,
          },
        },
      },
    });
  },
};
