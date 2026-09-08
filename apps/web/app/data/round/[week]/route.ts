import { getRound, getWeeks } from "@albiceleste/data";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const weeks = await getWeeks();
  return weeks.map((w) => ({ week: w.week_start }));
}

/** The whole pool for one week (the page embeds only the default scope). */
export async function GET(_req: Request, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const rows = await getRound(week);
  return Response.json(rows, { headers: { "cache-control": "public, max-age=3600" } });
}
