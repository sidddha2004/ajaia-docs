import Link from "next/link";

export default function DocNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900">Document not found</h1>
        <p className="mt-2 text-slate-500">
          It may have been deleted, or it hasn&apos;t been shared with you.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Back to documents
        </Link>
      </div>
    </main>
  );
}
