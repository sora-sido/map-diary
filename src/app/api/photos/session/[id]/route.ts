import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPickerSession, importPickedPhotos } from "@/lib/googlePhotosPicker";
import { parseDateParam } from "@/lib/dateParam";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetDate = parseDateParam(searchParams.get("date") ?? undefined);

  try {
    const pickerSession = await getPickerSession(session.user.id, id);
    if (!pickerSession.mediaItemsSet) {
      return NextResponse.json({ done: false });
    }

    const photos = await importPickedPhotos(session.user.id, id, targetDate);
    return NextResponse.json({ done: true, count: photos.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
