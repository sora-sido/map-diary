import { MapView } from "@/components/map-view";

export default function MapPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          今日のルート(ダミーデータ)
        </h1>
        <p className="text-sm text-muted-foreground">
          自宅 → 東京大学 → ランチ → 打ち合わせ → 常総アカデミー → 帰宅
        </p>
      </div>
      <MapView apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} />
    </div>
  );
}
