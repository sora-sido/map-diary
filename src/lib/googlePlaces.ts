const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * 座標の近くにある実在の施設名を1件取得する。
 * GOOGLE_PLACES_API_KEY未設定、または該当施設が見つからない場合はnull。
 */
export async function findNearbyPlaceName(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (!PLACES_API_KEY) return null;

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "150");
  url.searchParams.set("language", "ja");
  url.searchParams.set("key", PLACES_API_KEY);

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status: string;
      results?: { name: string }[];
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    return data.results[0].name;
  } catch {
    return null;
  }
}
