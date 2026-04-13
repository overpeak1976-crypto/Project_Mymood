import { playlistRepository } from '../repositories/playlistRepository';

export const playlistService = {
  async getMyPlaylists(userId: string) {
    const playlists = await playlistRepository.getMyPlaylists(userId);
    // Add track count as a convenience field
    return playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      cover_image_url: p.cover_image_url,
      created_at: p.created_at,
      track_count: p.playlist_tracks.length,
      tracks: p.playlist_tracks.map((t) => t.songs),
    }));
  },

  async createPlaylist(userId: string, name: string, description?: string) {
    if (!name?.trim()) throw new Error('ชื่อเพลย์ลิสต์ห้ามว่างครับ');
    return playlistRepository.createPlaylist(userId, name.trim(), description ?? null, null);
  },

  async addTrack(userId: string, playlistId: string, songId: string) {
    if (!songId) throw new Error('กรุณาส่ง song_id มาด้วยครับ');
    // Get current track count to assign correct order_index
    const existing = await playlistRepository.getMyPlaylists(userId);
    const playlist = existing.find((p) => p.id === playlistId);
    if (!playlist) throw new Error('ไม่พบ Playlist หรือคุณไม่มีสิทธิ์แก้ไข');
    const nextIndex = playlist.playlist_tracks.length;
    await playlistRepository.insertPlaylistTracks([{ playlist_id: playlistId, song_id: songId, order_index: nextIndex }]);
  },
};
