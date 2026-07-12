import { redirect } from "next/navigation";

export default async function MapRedirect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  redirect(date ? `/?date=${date}` : "/");
}
