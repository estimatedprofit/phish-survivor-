#!/usr/bin/env ts-node
import "dotenv/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
(async () => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("", {});
})(); 