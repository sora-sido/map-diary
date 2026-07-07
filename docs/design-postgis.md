# PostGIS 空間クエリ・GPSログ運用方針

## なぜPostGISか
「この場所に過去何回来たか」「半径○mの滞在をまとめる」といった空間クエリを
緯度経度の単純な範囲比較ではなく正確な距離計算(測地系)で行うため、
Supabase PostgresにPostGIS拡張を有効化して使う。

## 拡張の有効化
Prismaの`schema.prisma`はdatasourceに`url`/`extensions`を持たないシンプルな
バージョン(Prisma 7)を使っているため、PostGIS拡張の有効化とgeographyカラムへの
GiSTインデックス付与は、Prisma Migrateが生成するSQLファイルに手動で追記する
raw SQLとして管理する(`prisma/migrations/<timestamp>_init/migration.sql`)。

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX locations_geog_gist_idx    ON locations    USING GIST (geog);
CREATE INDEX gps_logs_geog_gist_idx     ON gps_logs      USING GIST (geog);
CREATE INDEX place_visits_geog_gist_idx ON place_visits  USING GIST (geog);
```

## geographyカラムの同期
`lat`/`lng`(Float)を正として保存し、`geog`(`geography(Point,4326)`)は
アプリ側のINSERT/UPDATE時に`ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`
で同時に書き込む(PrismaはUnsupported型を直接書き込めないため、
`prisma.$executeRaw`でINSERT/UPDATEするか、`AFTER INSERT/UPDATE`トリガーで
`lat`/`lng`から自動生成する方式のどちらかをStep6実装時に選ぶ)。

## 想定する空間クエリの例
- 半径N m圏内の既存Locationを探して重複統合:
  `WHERE ST_DWithin(geog, ST_MakePoint($lng,$lat)::geography, 100)`
- ある場所の訪問回数・累計滞在時間: `place_visits`を`locationId`で集計
- 特定エリアを通過した日の一覧: `gps_logs`を`ST_DWithin`+`recordedAt`範囲で絞り込み

## gps_logsのデータ量対策
- 保存頻度は移動中30秒〜1分、停止中は省電力化(間隔を伸ばす)想定のため、
  1日あたり数百〜千件規模。数年運用でも数百万行程度に収まる見込みだが、
  時系列で追記されるだけの特性上、以下の方針で運用する。
- **インデックス**: `recordedAt`にBRINインデックス(`@@index([recordedAt], type: Brin)`)。
  追記型の時系列データに対してB-Treeより大幅に小さいサイズで範囲検索が効く。
  `userId`には通常のB-Treeインデックスを別途付与。
- **間引き/集約方針(将来のバッチジョブ、Step6以降で実装)**:
  - 直近90日: 生ログをそのまま保持(タイムライン再生の精度を優先)
  - 90日超: 5分間隔にダウンサンプリングして`gps_logs`を圧縮、
    滞在が確定した区間は`place_visits`に集約してから元の生ログは削除候補とする
  - 集約バッチは日次のcronで実行し、当日分には手を付けない(集計中のデータ破損を避ける)
