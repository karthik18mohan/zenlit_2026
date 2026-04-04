import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const ALLOWED_ORIGINS = [
  "https://zenlit.app",
  "https://www.zenlit.app",
  "https://zenlitnativekarthik2.vercel.app",
  "http://localhost:19006",
  "http://localhost:8081",
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
};

type NotificationType = "message";

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: "default" | "normal" | "high";
  sound?: string;
  badge?: number;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

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
    if (!functionSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfigured: FUNCTION_SECRET is not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!bearerToken || bearerToken !== functionSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

    if (!expoAccessToken) {
      throw new Error("EXPO_ACCESS_TOKEN environment variable is not set");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const requestData: NotificationRequest & { type?: NotificationType } = await req.json();
    const { userId, userIds, title, body, data, priority } = requestData;

    if (requestData.type && requestData.type !== "message") {
      return new Response(
        JSON.stringify({ success: false, error: "Only message notifications are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const notificationType: NotificationType = "message";

    let targetUserIds: string[] = [];

    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      throw new Error("Either userId or userIds must be provided");
    }

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, expo_push_token, notification_enabled, notification_preferences")
      .in("id", targetUserIds)
      .eq("notification_enabled", true)
      .not("expo_push_token", "is", null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users with valid push tokens found",
          sent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const filteredUsers = users.filter((user) => {
      const prefs = user.notification_preferences || {};
      const wantsMessages = prefs.messages !== false;

      if (!wantsMessages) return false;

      if (data?.senderId && prefs.muted_conversations) {
        const muted = prefs.muted_conversations as string[];
        if (Array.isArray(muted) && muted.includes(String(data.senderId))) {
          return false;
        }
      }

      return true;
    });

    if (filteredUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users eligible for notifications (preferences filtered)",
          sent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const messages: ExpoPushMessage[] = filteredUsers.map((user) => ({
      to: user.expo_push_token,
      title,
      body,
      data: { ...data, type: notificationType },
      priority: priority || "high",
      sound: "default",
    }));

    const chunks: { messages: ExpoPushMessage[]; users: typeof filteredUsers }[] = [];
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push({
        messages: messages.slice(i, i + chunkSize),
        users: filteredUsers.slice(i, i + chunkSize),
      });
    }

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${expoAccessToken}`,
          },
          body: JSON.stringify(chunk.messages),
        });

        if (!response.ok) {
          const errorText = await response.text();
          errors.push(`Expo API error: ${errorText}`);
          errorCount += chunk.length;
          continue;
        }

        const result = await response.json();
        const tickets = result.data || [];

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const user = chunk.users[i];

          if (ticket.status !== "ok") {
            errors.push(`Failed for user ${user.id}: ${ticket.message}`);
            errorCount++;
          } else {
            sentCount++;
          }
        }
      } catch (error) {
        errors.push(`Exception sending chunk: ${error.message}`);
        errorCount += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: errorCount,
        total: filteredUsers.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
