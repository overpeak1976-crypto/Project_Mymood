import prisma from '../config/prisma';

export const searchRepository = {
  /** Standard text search — case-insensitive OR across title, artist, genre */
  async textSearch(query: string, limit = 20) {
    return prisma.songs.findMany({
      where: {
        OR: [
          { title:  { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } },
          { genre:  { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { play_count: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        artist: true,
        genre: true,
        cover_image_url: true,
        audio_file_url: true,
        duration_seconds: true,
        play_count: true,
      },
    });
  },

  /** Vector / semantic search backed by the match_songs Postgres function */
  async vectorSearch(embeddingArray: number[], threshold = 0.3, limit = 10) {
    const embeddingStr = `[${embeddingArray.join(',')}]`;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM match_songs(
        ${embeddingStr}::vector,
        ${threshold}::float,
        ${limit}::int
      )
    `;
    return rows;
  },
};
