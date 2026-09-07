import { getPlayerIndex, getPool } from "@albiceleste/data";

export const dynamic = "force-static";

/** Search index: every player with a page, plus the position group for pool players (Compare filters by it). */
export async function GET() {
  const [index, pool] = await Promise.all([getPlayerIndex(), getPool()]);
  const groups = new Map(pool.map((p) => [p.player_key, p.pos_group]));
  return Response.json(
    index.map((e) => ({ ...e, pos_group: groups.get(e.key) ?? null })),
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
