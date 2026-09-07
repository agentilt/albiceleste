import { getComparePlayer, getPool } from "@albiceleste/data";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const pool = await getPool();
  return pool.map((p) => ({ key: p.player_key }));
}

/** Per-player record for Compare: percentile axes, season line, sparkline, call-ups. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const p = await getComparePlayer(decodeURIComponent(key));
  if (!p) return new Response("not found", { status: 404 });
  return Response.json(p, { headers: { "cache-control": "public, max-age=3600" } });
}
