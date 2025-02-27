import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Configuration, OpenAIApi } from 'npm:openai@3.3.0'
import type { Dao, Need, Pollen } from '../types/database.ts'
import { ethers } from "https://esm.sh/ethers@6.13.5"

export interface DaoInput {
  name: string
  description: string
  public_address: string
}

export interface NeedInput {
  dao_id: number
  description: string
}


export class ethContractOperations {
  private provider: any;
  private signer: any;
  private contract: any;

  constructor() {
    const privateKey = Deno.env.get('ETH_PRIVATE_KEY');
    const contractAddress = Deno.env.get('ETH_CONTRACT_ADDRESS');
    const rpcUrl = Deno.env.get('ETH_RPC_URL');
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    const networkName = Deno.env.get('ETH_NETWORK');
    const contractABI = require(Deno.env.get('ETH_CONTRACT_ABI')).abi

    
    if (!privateKey || !contractAddress) {
      throw new Error('Missing required environment variables ETH_PRIVATE_KEY or ETH_CONTRACT_ADDRESS');
    }

    if (isProduction && !networkName) {
      throw new Error('Missing required environment variable ETH_NETWORK for production');
    }

    // In production, use default provider (automatically selects optimal RPC)
    // For local development, use specified RPC URL
    if (isProduction) {
      this.provider = ethers.getDefaultProvider(networkName);
    } else {
      if (!rpcUrl) {
        throw new Error('Missing required environment variable ETH_RPC_URL for local development');
      }
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
  }

  async updatePollenContract(enrichedPollen: any) {
    try {
      // Call contract function with pollen data
      const tx = await this.contract.updatePollen(
        enrichedPollen.need_id,
        enrichedPollen.requesting_dao.public_address,
        enrichedPollen.fulfilling_dao.public_address,
        enrichedPollen.confidence_score
      );

      // Wait for transaction to be mined
      await tx.wait();
      
      console.log("Successfully updated pollen contract for need:", enrichedPollen.need_id);
      
      return tx;

    } catch (error) {
      console.error("Error updating pollen contract:", error);
      throw error;
    }
  }
}

export class DaoOperations {
  private supabase: SupabaseClient
  private openai: OpenAIApi

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    if (!openaiKey) {
      throw new Error('Missing required environment variable OPENAI_API_KEY')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)

    this.openai = new OpenAIApi(new Configuration({
      apiKey: openaiKey
    }))
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: text.replace(/\n/g, ' ')
      })
      return response.data.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  async createDao(input: DaoInput): Promise<Dao> {
    const embedding = await this.generateEmbedding(input.description)
    
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
      updateData.description_embedding = await this.generateEmbedding(input.description)
    }
    
    const { data, error } = await this.supabase
      .from('daos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    // Update pollen if description changed
    if (input.description) {
      await this.updatePollenForDao(id)
    }
    
    return data
  }

  async createNeed(input: NeedInput): Promise<Need> {
    const embedding = await this.generateEmbedding(input.description)
    
    const { data, error } = await this.supabase
      .from('needs')
      .insert({
        ...input,
        embedding: embedding
      })
      .select()
      .single()

    if (error) throw error
    
    // Generate initial pollen
    await this.updatePollenForNeed(data.id)
    
    return data
  }

  async updateNeed(id: number, input: Partial<NeedInput>): Promise<Need> {
    const updateData: Partial<Need> = { ...input }
    
    if (input.description) {
      updateData.embedding = await this.generateEmbedding(input.description)
    }
    
    const { data, error } = await this.supabase
      .from('needs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    // Update pollen if description changed
    if (input.description) {
      await this.updatePollenForNeed(id)
    }
    
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
    return data
  }

  private async findPotentialMatches(needId: number): Promise<PollenMatch[]> {
    const { data: need, error: needError } = await this.supabase
      .from('needs')
      .select('*, daos!inner(*)')
      .eq('id', needId)
      .single()
    
    if (needError) throw needError

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

  private async generateCollaborationDescription(
    needDescription: string,
    daoDescription: string,
    requestingDaoName: string,
    fulfillingDaoName: string
  ): Promise<string> {
    const prompt = `Given these two organizations:
    
    "${requestingDaoName}" has this need: "${needDescription}"
    
    "${fulfillingDaoName}" describes themselves as: "${daoDescription}"
    
    Provide a brief, specific explanation of how these two organizations could collaborate. Focus on concrete actions and mutual benefits. Start with mentioning both organizations by name.`

    const response = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    })

    return response.data.choices[0].message?.content || 
      `${requestingDaoName} and ${fulfillingDaoName} might be able to collaborate based on their descriptions.`
  }

  async updatePollenForNeed(needId: number): Promise<Pollen[]> {
    try {
      const matches = await this.findPotentialMatches(needId)
      const results: Pollen[] = []

      const { data: need } = await this.supabase
        .from('needs')
        .select('*, daos!inner(*)')
        .eq('id', needId)
        .single()

      for (const match of matches) {
        const { data: fulfillingDao } = await this.supabase
          .from('daos')
          .select('*')
          .eq('id', match.fulfilling_dao_id)
          .single()

        const collaborationDescription = await this.generateCollaborationDescription(
          need.description,
          fulfillingDao.description,
          need.daos.name,
          fulfillingDao.name
        )

        const { data: pollen, error } = await this.supabase
          .from('pollen')
          .upsert({
            need_id: needId,
            requesting_dao_id: match.requesting_dao_id,
            fulfilling_dao_id: match.fulfilling_dao_id,
            collaboration_description: collaborationDescription,
            confidence_score: match.similarity_score
          }, {
            onConflict: 'need_id,fulfilling_dao_id',
            returning: 'minimal'
          })
          .select()
          .single()

        if (error) throw error
        results.push(pollen)
      }

      // Fetch the complete pollen data with DAO public addresses
      const { data: enrichedPollen, error: enrichmentError } = await this.supabase
        .from('pollen')
        .select(`
          *,
          requesting_dao:requesting_dao_id(id, name, public_address),
          fulfilling_dao:fulfilling_dao_id(id, name, public_address),
          need:need_id(id, description)
        `)
        .eq('need_id', needId)
      
      if (enrichmentError) throw enrichmentError
      
      return enrichedPollen || []
    } catch (error) {
      console.error('Error updating pollen:', error)
      throw error
    }
  }

  async updatePollenForDao(daoId: number): Promise<void> {
    try {
      const { data: relevantNeeds } = await this.supabase
        .from('pollen')
        .select('need_id')
        .eq('fulfilling_dao_id', daoId)

      const { data: ownNeeds } = await this.supabase
        .from('needs')
        .select('id')
        .eq('dao_id', daoId)

      const needsToUpdate = new Set([
        ...(relevantNeeds?.map(p => p.need_id) || []),
        ...(ownNeeds?.map(n => n.id) || [])
      ])

      for (const needId of needsToUpdate) {
        await this.updatePollenForNeed(needId)
      }
    } catch (error) {
      console.error('Error updating pollen for DAO:', error)
      throw error
    }
  }

  async updatePollen(pollenData: PollenData) {
    const { data, error } = await this.supabase
      .from('pollen')
      .upsert(pollenData, {
        onConflict: 'need_id,fulfilling_dao_id',
        returning: 'minimal'
      })

    if (error) {
      console.error('Error updating pollen:', error)
      throw error
    }
    return data
  }
}

// Export the class only, create instance in the function
export default DaoOperations