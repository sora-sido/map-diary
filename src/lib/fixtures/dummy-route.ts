// Step5用のダミーデータ。実際のGPS保存はStep6以降で実装するため、
// ここでは地図表示の確認用に「東大→ランチ→打ち合わせ→常総アカデミー→帰宅」の
// 一日の移動を模したデータを静的に用意する。

export interface DummyStay {
  id: string;
  name: string;
  arrivedAt: string;
  departedAt: string;
  lat: number;
  lng: number;
  note: string;
  meetingSummary?: string;
  photoCount: number;
}

export interface DummyTrackPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

const DAY = "2026-07-07";

export const dummyStays: DummyStay[] = [
  {
    id: "home-morning",
    name: "自宅",
    arrivedAt: `${DAY}T00:00:00+09:00`,
    departedAt: `${DAY}T07:30:00+09:00`,
    lat: 35.6465,
    lng: 139.6425,
    note: "身支度をして出発。",
    photoCount: 0,
  },
  {
    id: "utokyo",
    name: "東京大学(本郷キャンパス)",
    arrivedAt: `${DAY}T08:20:00+09:00`,
    departedAt: `${DAY}T12:00:00+09:00`,
    lat: 35.7128,
    lng: 139.7621,
    note: "研究室ミーティングに参加。",
    meetingSummary:
      "研究室ミーティング: 今月の進捗共有と来月のスケジュール調整について議論。",
    photoCount: 3,
  },
  {
    id: "lunch",
    name: "根津のカフェ(ランチ)",
    arrivedAt: `${DAY}T12:00:00+09:00`,
    departedAt: `${DAY}T13:00:00+09:00`,
    lat: 35.7203,
    lng: 139.7665,
    note: "研究室メンバーとランチ。",
    photoCount: 2,
  },
  {
    id: "shibuya-meeting",
    name: "渋谷(打ち合わせ)",
    arrivedAt: `${DAY}T14:00:00+09:00`,
    departedAt: `${DAY}T17:00:00+09:00`,
    lat: 35.6595,
    lng: 139.7005,
    note: "教育事業についての打ち合わせ。",
    meetingSummary:
      "○○さんと教育事業の新プロジェクトについて議論。次回までにプランのたたき台を用意する。",
    photoCount: 1,
  },
  {
    id: "joso-academy",
    name: "常総アカデミー",
    arrivedAt: `${DAY}T18:00:00+09:00`,
    departedAt: `${DAY}T21:30:00+09:00`,
    lat: 36.0087,
    lng: 139.9945,
    note: "夜の授業を担当。",
    meetingSummary: "生徒との個別面談を3件実施。",
    photoCount: 4,
  },
  {
    id: "home-night",
    name: "自宅",
    arrivedAt: `${DAY}T22:00:00+09:00`,
    departedAt: `${DAY}T23:59:00+09:00`,
    lat: 35.6465,
    lng: 139.6425,
    note: "帰宅。一日の振り返りを日記に記録。",
    photoCount: 0,
  },
];

function interpolateSegment(
  from: DummyStay,
  to: DummyStay,
  steps: number,
): DummyTrackPoint[] {
  const fromTime = new Date(from.departedAt).getTime();
  const toTime = new Date(to.arrivedAt).getTime();
  const points: DummyTrackPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    points.push({
      lat: from.lat + (to.lat - from.lat) * ratio,
      lng: from.lng + (to.lng - from.lng) * ratio,
      recordedAt: new Date(
        fromTime + (toTime - fromTime) * ratio,
      ).toISOString(),
    });
  }
  return points;
}

/** 滞在地点をつないだダミーの移動軌跡(ポリライン用の座標列)。 */
export const dummyTrackPoints: DummyTrackPoint[] = dummyStays
  .slice(0, -1)
  .flatMap((stay, i) => interpolateSegment(stay, dummyStays[i + 1], 8));
