import { createClient } from "@supabase/supabase-js";

export const PHOTOS_BUCKET = "photos";

/** service role keyを使うサーバー専用クライアント。クライアントコンポーネントで使わないこと。 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
