import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export const songRepository = {
  async getAllSongs() {
    return prisma.songs.findMany({
      orderBy: { created_at: 'desc' },
    });
  },

  async getPopularSongs(limit: number = 10) {
    return prisma.songs.findMany({
      where: { is_public: true },
      orderBy: { play_count: 'desc' },
      take: limit,
    });
  },

  async findSongById(id: string) {
    return prisma.songs.findUnique({ where: { id } });
  },

  async findArtistByName(name: string) {
    return prisma.artists.findFirst({
      where: { name: { mode: 'insensitive', equals: name } },
      select: { id: true },
    });
  },

  async createArtist(name: string) {
    return prisma.artists.create({
      data: { name },
      select: { id: true },
    });
  },

  async findAlbumByTitleAndArtist(title: string, artistId: string) {
    return prisma.albums.findFirst({
      where: {
        title: { mode: 'insensitive', equals: title },
        artist_id: artistId,
      },
      select: { id: true },
    });
  },

  async createAlbum(title: string, artistId: string, coverImageUrl: string) {
    return prisma.albums.create({
      data: { title, artist_id: artistId, cover_image_url: coverImageUrl },
      select: { id: true },
    });
  },

  async createSong(data: {
    title: string;
    artist: string;
    artist_id: string | null;
    album_id: string | null;
    uploaded_by: string;
    audio_file_url: string;
    cover_image_url: string;
    bpm: number;
    danceability: number;
    music_key: string;
    music_scale: string;
    energy: number;
    duration_seconds: number;
    genre: string;
    is_public?: boolean;
  }) {
    return prisma.songs.create({ data, select: { id: true } });
  },

  async updateSongGenre(id: string, genre: string) {
    return prisma.songs.update({ where: { id }, data: { genre } });
  },

  async findSongVector(songId: string) {
    return prisma.song_vectors.findUnique({
      where: { song_id: songId },
      select: { song_id: true },
    });
  },

  // embedding column is Unsupported('vector') — must use raw SQL
  async createSongVector(songId: string, moodKeywords: string, embeddingArray: number[]) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO song_vectors (song_id, mood_keywords, embedding)
      VALUES (${songId}::uuid, ${moodKeywords}, ${embeddingStr}::vector)
    `;
  },

  async updateSongVector(songId: string, moodKeywords: string, embeddingArray: number[]) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    await prisma.$executeRaw`
      UPDATE song_vectors
      SET mood_keywords = ${moodKeywords}, embedding = ${embeddingStr}::vector, updated_at = now()
      WHERE song_id = ${songId}::uuid
    `;
  },

  async searchSongsByVector(embeddingArray: number[], matchThreshold: number, matchCount: number) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    // Uses the match_songs Postgres function (RPC) via raw query
    const results = await prisma.$queryRaw<any[]>`
      SELECT * FROM match_songs(
        ${embeddingStr}::vector,
        ${matchThreshold}::float,
        ${matchCount}::int
      )
    `;
    return results;
  },

  async searchSongsByVectorWithExclude(embeddingArray: number[], matchThreshold: number, matchCount: number, excludeIds: string[] = []) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    const overfetchCount = matchCount + excludeIds.length + 20;

    if (!excludeIds || excludeIds.length === 0) {
      return prisma.$queryRaw<any[]>`
        SELECT * FROM match_songs(
          ${embeddingStr}::vector,
          ${matchThreshold}::float,
          ${matchCount}::int
        )
      `;
    }

    return prisma.$queryRaw<any[]>`
      SELECT * FROM (
        SELECT * FROM match_songs(
          ${embeddingStr}::vector,
          ${matchThreshold}::float,
          ${overfetchCount}::int
        )
      ) AS matches
      WHERE id NOT IN (${Prisma.join(excludeIds)})
      LIMIT ${matchCount}::int
    `;
  },

  async findMyUploads(userId: string) {
    return prisma.songs.findMany({
      where: { uploaded_by: userId },
      orderBy: { created_at: 'desc' },
    });
  },

  async findFriendsUploads(userId: string) {
    const friendships = await prisma.friendships.findMany({
      where: {
        status: 'accepted',
        OR: [{ user_id: userId }, { friend_id: userId }],
      },
      select: { user_id: true, friend_id: true },
    });

    const friendIds = friendships.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    if (friendIds.length === 0) return [];

    // Only return uploads from friends who have show_uploads enabled
    const friendsWithUploadsVisible = await prisma.users.findMany({
      where: { id: { in: friendIds }, show_uploads: true },
      select: { id: true },
    });

    const visibleFriendIds = friendsWithUploadsVisible.map(f => f.id);
    if (visibleFriendIds.length === 0) return [];

    return prisma.songs.findMany({
      where: { uploaded_by: { in: visibleFriendIds } },
      orderBy: { created_at: 'desc' },
    });
  },

  async findMyTopSongs(userId: string) {
    const topPlays = await prisma.play_history.groupBy({
      by: ['song_id'],
      where: { user_id: userId },
      _count: { song_id: true },
      orderBy: { _count: { song_id: 'desc' } },
      take: 10,
    });

    if (topPlays.length === 0) return [];

    const songIds = topPlays.map((p) => p.song_id).filter((id): id is string => id !== null);

    const songs = await prisma.songs.findMany({
      where: { id: { in: songIds } },
    });

    // Map output safely maintaining descending play history order natively
    return songIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean);
  },
};
