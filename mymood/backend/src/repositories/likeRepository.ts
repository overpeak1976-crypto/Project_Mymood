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
    const liked = await prisma.liked_songs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
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

    // Flatten the response: extract the song data from the nested structure
    return liked.map(item => ({
      id: item.songs?.id,
      title: item.songs?.title,
      artist: item.songs?.artist,
      cover_image_url: item.songs?.cover_image_url,
      audio_file_url: item.songs?.audio_file_url,
      duration_seconds: item.songs?.duration_seconds,
      liked_at: item.created_at,
    })).filter(item => item.id); // Filter out any null entries
  },
};
