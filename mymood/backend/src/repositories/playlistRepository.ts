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

  async getPlaylistById(playlistId: string, userId: string) {
    return prisma.playlists.findFirst({
      where: { id: playlistId, user_id: userId },
      select: {
        id: true,
        name: true,
        description: true,
        cover_image_url: true,
        is_public: true,
        is_ai_generated: true,
        ai_prompt_used: true,
        created_at: true,
        playlist_tracks: {
          orderBy: { order_index: 'asc' },
          select: {
            id: true,
            order_index: true,
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
        },
      },
    });
  },

  async removeTrack(trackId: string) {
    return prisma.playlist_tracks.delete({ where: { id: trackId } });
  },

  async deletePlaylist(playlistId: string, userId: string) {
    await prisma.playlist_tracks.deleteMany({ where: { playlist_id: playlistId } });
    return prisma.playlists.delete({ where: { id: playlistId, user_id: userId } });
  },
};
