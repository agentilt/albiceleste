import { getPlayerIndex } from "@albiceleste/data";

export const dynamic = "force-static";

export async function GET() {
  const index = await getPlayerIndex();
  return Response.json(index, { headers: { "cache-control": "public, max-age=3600" } });
}
