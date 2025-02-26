import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Configuration, OpenAIApi } from 'openai'
import type { Dao, Need, Pollen } from '../types/database.ts'

const openai = new OpenAIApi(new Configuration({
  apiKey: Deno.env.get('OPENAI_API_KEY')
}))

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, ' ')
    })
    return response.data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}

export interface DaoInput {
  name: string
  description: string
  public_address: string
}

export interface NeedInput {
  dao_id: number
  description: string
}

interface PollenMatch {
  requesting_dao_id: number
  fulfilling_dao_id: number
  need_id: number
  similarity_score: number
}

export class DaoOperations {
  private supabase: SupabaseClient
  private openai: OpenAIApi

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    this.openai = new OpenAIApi(new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    }))
  }

  async createDao(input: DaoInput): Promise<Dao> {
    const embedding = await generateEmbedding(input.description)
    
    const { data, error } = await this.supabase
      .from('daos')
      .insert({
        ...input,
        description_embedding: embedding
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateDao(id: number, input: Partial<DaoInput>): Promise<Dao> {
    const updateData: Partial<Dao> = { ...input }
    
    if (input.description) {
      updateData.description_embedding = await generateEmbedding(input.description)
    }
    
    const { data, error } = await this.supabase
      .from('daos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async createNeed(input: NeedInput): Promise<Need> {
    const embedding = await generateEmbedding(input.description)
    
    const { data, error } = await this.supabase
      .from('needs')
      .insert({
        ...input,
        embedding: embedding
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateNeed(id: number, input: Partial<NeedInput>): Promise<Need> {
    const updateData: Partial<Need> = { ...input }
    
    if (input.description) {
      updateData.embedding = await generateEmbedding(input.description)
    }
    
    const { data, error } = await this.supabase
      .from('needs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async markNeedFulfilled(id: number): Promise<Need> {
    const { data, error } = await this.supabase
      .from('needs')
      .update({
        is_fulfilled: true,
        fulfilled_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
  }

  private async generateCollaborationDescription(
    needDescription: string,
    daoDescription: string
  ): Promise<string> {
    const prompt = `Given these two descriptions:
    
    DAO Need: "${needDescription}"
    Potential Collaborator: "${daoDescription}"
    
    Provide a brief, specific explanation of how these two could collaborate. Focus on concrete actions and mutual benefits.`

    const response = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    })

    return response.data.choices[0].message?.content || 
      "These organizations might be able to collaborate based on their descriptions."
  }

  private async findPotentialMatches(needId: number): Promise<PollenMatch[]> {
    // Get the need and its embedding
    const { data: need, error: needError } = await this.supabase
      .from('needs')
      .select('*, daos!inner(*)')
      .eq('id', needId)
      .single()
    
    if (needError) throw needError

    // Find DAOs with similar description embeddings
    const { data: matches, error: matchError } = await this.supabase.rpc(
      'find_dao_matches',
      { 
        need_id: needId,
        similarity_threshold: 0.7 
      }
    )

    if (matchError) throw matchError

    return matches.map(match => ({
      requesting_dao_id: need.dao_id,
      fulfilling_dao_id: match.dao_id,
      need_id: needId,
      similarity_score: match.similarity
    }))
  }

  async updatePollenForNeed(needId: number): Promise<Pollen[]> {
    try {
      // Find potential matches
      const matches = await this.findPotentialMatches(needId)
      const results: Pollen[] = []

      // Get need and DAO details for context
      const { data: need } = await this.supabase
        .from('needs')
        .select('*, daos!inner(*)')
        .eq('id', needId)
        .single()

      for (const match of matches) {
        // Get the potential fulfilling DAO's details
        const { data: fulfillingDao } = await this.supabase
          .from('daos')
          .select('*')
          .eq('id', match.fulfilling_dao_id)
          .single()

        // Generate collaboration description
        const collaborationDescription = await this.generateCollaborationDescription(
          need.description,
          fulfillingDao.description
        )

        // Update or create pollen record
        const { data: pollen, error } = await this.supabase
          .from('pollen')
          .upsert({
            need_id: needId,
            requesting_dao_id: match.requesting_dao_id,
            fulfilling_dao_id: match.fulfilling_dao_id,
            collaboration_description: collaborationDescription,
            confidence_score: match.similarity_score
          }, {
            onConflict: 'need_id,requesting_dao_id,fulfilling_dao_id',
            returning: true
          })
          .select()
          .single()

        if (error) throw error
        results.push(pollen)
      }

      return results
    } catch (error) {
      console.error('Error updating pollen:', error)
      throw error
    }
  }

  // Update pollen when a DAO's description changes
  async updatePollenForDao(daoId: number): Promise<void> {
    try {
      // Update pollen where this DAO is the fulfiller
      const { data: relevantNeeds } = await this.supabase
        .from('pollen')
        .select('need_id')
        .eq('fulfilling_dao_id', daoId)

      // Update pollen where this DAO is the requester
      const { data: ownNeeds } = await this.supabase
        .from('needs')
        .select('id')
        .eq('dao_id', daoId)

      // Combine all needs that need updating
      const needsToUpdate = new Set([
        ...(relevantNeeds?.map(p => p.need_id) || []),
        ...(ownNeeds?.map(n => n.id) || [])
      ])

      // Update pollen for each affected need
      for (const needId of needsToUpdate) {
        await this.updatePollenForNeed(needId)
      }
    } catch (error) {
      console.error('Error updating pollen for DAO:', error)
      throw error
    }
  }

  // Override previous update methods to include pollen updates
  async updateDao(id: number, input: Partial<DaoInput>): Promise<Dao> {
    const result = await super.updateDao(id, input)
    if (input.description) {
      await this.updatePollenForDao(id)
    }
    return result
  }

  async updateNeed(id: number, input: Partial<NeedInput>): Promise<Need> {
    const result = await super.updateNeed(id, input)
    if (input.description) {
      await this.updatePollenForNeed(id)
    }
    return result
  }

  async createNeed(input: NeedInput): Promise<Need> {
    const result = await super.createNeed(input)
    await this.updatePollenForNeed(result.id)
    return result
  }
}