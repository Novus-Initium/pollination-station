// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { DaoOperations, DaoInput } from '../utils/dao-operations.ts'

interface DaoRequest {
  action: 'create' | 'update' | 'get'
  id?: number
  publicAddress?: string
  data: Partial<DaoInput>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    // Log the raw request for debugging
    const rawBody = await req.text();
    console.log("Raw request body:", rawBody);
    
    // Parse JSON manually with error handling
    let requestData;
    try {
      requestData = JSON.parse(rawBody);
      console.log("Parsed request data:", requestData);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: `Failed to parse JSON: ${parseError.message}` }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }
    
    // Validate the request structure
    if (!requestData.action) {
      return new Response(
        JSON.stringify({ error: "Missing required field 'action'" }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }
    
    if (!requestData.data) {
      return new Response(
        JSON.stringify({ error: "Missing required field 'data'" }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 400
        }
      );
    }
    
    const daoOps = new DaoOperations();
    const { action, id, publicAddress, data } = requestData;

    console.log("DAO Request:", action, id, publicAddress, data)

    let result
    switch (action) {
      case 'create':
        result = await daoOps.createDao(data as DaoInput)
        break
      case 'update':
        if (!id) throw new Error('ID is required for updates')
        result = await daoOps.updateDao(id, data)
        break
      case 'get':
        if (!publicAddress) throw new Error('Public address is required for get')
        result = await daoOps.getDaoByPublicAddress(publicAddress)
        break
      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify({ status: 'success', data: result }),
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/dao-manager' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"action": "create", "data": {"name": "Functions", "description": "A new DAO for managing functions"}}'

*/
