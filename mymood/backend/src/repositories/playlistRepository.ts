import prisma from '../config/prisma';

export const playlistRepository = {
  async createPlaylist(
    userId: string,
    name: string,
    description: string | null,
    coverImageUrl: string | null,
  ) {
    return prisma.playlists.create({
      data: { user_id: userId, name, description, cover_image_url: coverImageUrl },
    });
  },

  async insertPlaylistTracks(
    tracks: Array<{ playlist_id: string; song_id: string; order_index: number }>,
  ) {
    return prisma.playlist_tracks.createMany({ data: tracks });
  },

  async getMyPlaylists(userId: string) {
    return prisma.playlists.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        cover_image_url: true,
        created_at: true,
        playlist_tracks: {
          orderBy: { order_index: 'asc' },
          select: {
            order_index: true,
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
        },
      },
    });
  },
};
