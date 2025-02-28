// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { DaoOperations, NeedInput } from '../utils/dao-operations.ts'

interface NeedRequest {
  action: 'create' | 'update' | 'fulfill' | 'updateContractId'
  id?: number
  data?: Partial<NeedInput>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const daoOps = new DaoOperations()
    const { action, id, data }: NeedRequest = await req.json()

    let result
    switch (action) {
      case 'create':
        if (!data) throw new Error('Data is required for creation')
        result = await daoOps.createNeed(data as NeedInput)
        break
      case 'update':
        if (!id || !data) throw new Error('ID and data are required for updates')
        result = await daoOps.updateNeed(id, data)
        break
      case 'fulfill':
        if (!id) throw new Error('ID is required for fulfillment')
        result = await daoOps.markNeedFulfilled(id)
        break
      case 'updateContractId':
        if (!id || !data?.contract_need_id) throw new Error('ID and contract_need_id are required')
        result = await daoOps.updateNeed(id, { contract_need_id: data.contract_need_id })
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/NEEDoperation' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
