import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-xl">Nothing here</h1>
      <p className="mt-2 text-muted">This address does not match any page. It may have moved, or the link was cut short.</p>
      <Link to="/" className="mt-6 inline-block font-medium text-relay underline-offset-4 hover:underline">
        Go to the overview
      </Link>
    </div>
  );
}
