import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl">Not found</h1>
      <p className="mt-3 text-ink-2">
        No page here. Player pages exist for everyone in a tracked squad and for capped internationals; use the search box to find one.
      </p>
      <p className="mt-4">
        <Link className="link" href="/">
          Back to the front page
        </Link>
      </p>
    </div>
  );
}
