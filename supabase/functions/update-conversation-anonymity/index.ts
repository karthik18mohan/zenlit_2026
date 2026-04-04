import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const functionSecret = Deno.env.get("FUNCTION_SECRET");

    if (!functionSecret || bearerToken !== functionSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const thresholdParam = url.searchParams.get("thresholdSeconds");
    let thresholdSeconds = Number(thresholdParam ?? "180");
    if (!Number.isFinite(thresholdSeconds) || thresholdSeconds < 60 || thresholdSeconds > 600) {
      thresholdSeconds = 180;
    }
    const cutoffIso = new Date(Date.now() - thresholdSeconds * 1000).toISOString();

    const { data: staleRows, error: staleError } = await supabase
      .from("locations")
      .select("id")
      .lt("updated_at", cutoffIso)
      .not("lat_short", "is", null)
      .not("long_short", "is", null);

    if (staleError) {
      throw staleError;
    }

    let nullCount = 0;
    if (staleRows && staleRows.length > 0) {
      const staleIds = staleRows.map((r: any) => r.id);
      const { error: nullErr } = await supabase
        .from("locations")
        .update({
          lat_full: null,
          long_full: null,
          lat_short: null,
          long_short: null,
          updated_at: new Date().toISOString(),
        })
        .in("id", staleIds);

      if (nullErr) {
        throw nullErr;
      }
      nullCount = staleIds.length;
    }

    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("*");

    if (convError) {
      throw convError;
    }

    let updatedCount = 0;

    for (const conv of conversations || []) {
      const { data: loc1, error: error1 } = await supabase
        .from("locations")
        .select("lat_short, long_short")
        .eq("id", conv.user_a_id)
        .maybeSingle();

      const { data: loc2, error: error2 } = await supabase
        .from("locations")
        .select("lat_short, long_short")
        .eq("id", conv.user_b_id)
        .maybeSingle();

      if (error1 || error2) {
        continue;
      }

      const hasLocationA = loc1 && loc1.lat_short !== null && loc1.long_short !== null;
      const hasLocationB = loc2 && loc2.lat_short !== null && loc2.long_short !== null;

      let shouldBeAnonymous = true;

      if (hasLocationA && hasLocationB) {
        const latDiff = Math.abs(loc1.lat_short - loc2.lat_short);
        const longDiff = Math.abs(loc1.long_short - loc2.long_short);
        const isNearby = latDiff <= 0.01 && longDiff <= 0.01;

        if (isNearby) {
          shouldBeAnonymous = false;
        }
      }

      const needsUpdate = 
        conv.is_anonymous_for_a !== shouldBeAnonymous ||
        conv.is_anonymous_for_b !== shouldBeAnonymous;

      if (needsUpdate) {
        await supabase
          .from("conversations")
          .update({
            is_anonymous_for_a: shouldBeAnonymous,
            is_anonymous_for_b: shouldBeAnonymous,
          })
          .eq("id", conv.id);

        updatedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, updatedCount, nullCount, thresholdSeconds }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error updating conversation anonymity:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
