// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from '@supabase/supabase-js'
import type { Pollen } from '../types/database.ts'

interface PollenQueryParams {
  dao_id?: number
  need_id?: number
  min_confidence?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const dao_id = url.searchParams.get('dao_id')
    const need_id = url.searchParams.get('need_id')
    const min_confidence = url.searchParams.get('min_confidence')

    let query = supabase
      .from('pollen')
      .select(`
        *,
        requesting_dao:daos!requesting_dao_id(*),
        fulfilling_dao:daos!fulfilling_dao_id(*),
        need:needs(*)
      `)
      .order('confidence_score', { ascending: false })

    if (dao_id) {
      query = query.or(
        `requesting_dao_id.eq.${dao_id},fulfilling_dao_id.eq.${dao_id}`
      )
    }

    if (need_id) {
      query = query.eq('need_id', need_id)
    }

    if (min_confidence) {
      query = query.gte('confidence_score', parseFloat(min_confidence))
    }

    const { data, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        data 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500 
      }
    )
  }
})
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/POLLENoperation' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
