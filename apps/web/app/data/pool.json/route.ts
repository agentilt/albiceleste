import { getPoolJson, manifest } from "@albiceleste/data";

export const dynamic = "force-static";

/** The compact per-player record behind the follow list and Mi tablero. */
export async function GET() {
  const rows = await getPoolJson();
  return Response.json({ as_of: manifest().data_as_of, rows }, { headers: { "cache-control": "public, max-age=3600" } });
}
