import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const ALLOWED_ORIGINS = [
  'https://zenlit.app',
  'https://www.zenlit.app',
  'https://zenlitnativekarthik2.vercel.app',
  'http://localhost:19006',
  'http://localhost:8081',
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  };
};

const STORAGE_BUCKETS = ['profile-images', 'post-images', 'feedback-images'];

type DeletionResponse = {
  success: boolean;
  warnings?: string[];
  requiresReauth?: boolean;
  error?: string;
};

const listAllPaths = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> => {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      if (!item.name) {
        continue;
      }
      if (item.id === null) {
        const nested = await listAllPaths(supabaseAdmin, bucket, `${prefix}/${item.name}`);
        nested.forEach((nestedPath) => paths.push(nestedPath));
      } else {
        paths.push(`${prefix}/${item.name}`);
      }
    }

    if (data.length < 100) {
      break;
    }

    offset += 100;
  }

  return paths;
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt) {
      return new Response(JSON.stringify({ success: false, requiresReauth: true, error: 'Missing auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ success: false, requiresReauth: true, error: 'Session expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const warnings: string[] = [];

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    for (const bucket of STORAGE_BUCKETS) {
      try {
        const paths = await listAllPaths(supabaseAdmin, bucket, userId);
        if (paths.length > 0) {
          const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
          if (removeError) {
            warnings.push(`Failed to remove some files from ${bucket}: ${removeError.message}`);
          }
        }
      } catch (error: any) {
        warnings.push(`Storage cleanup warning (${bucket}): ${error?.message || 'unknown error'}`);
      }
    }

    const { error: feedbackDeleteError } = await supabaseAdmin
      .from('feedback')
      .delete()
      .eq('user_id', userId);

    if (feedbackDeleteError) {
      warnings.push(`Feedback cleanup warning: ${feedbackDeleteError.message}`);
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      return new Response(
        JSON.stringify({ success: false, warnings, error: `Profile deletion failed: ${profileDeleteError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      return new Response(
        JSON.stringify({ success: false, warnings, error: `Auth deletion failed: ${authDeleteError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body: DeletionResponse = { success: true, warnings };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
