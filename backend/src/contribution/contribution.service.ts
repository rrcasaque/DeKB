import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import * as path from 'path';
import * as fs from 'fs';
import {
  KnowledgeBaseContributor__factory,
  KnowledgeBaseContributor,
} from 'contracts/types';
import { CreateContributionDto } from './dto/create-contribution.dto';
import axios from 'axios';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// Interface atualizada para refletir a nova estrutura da Contribution
export interface ContributionDetails {
  contributorAddress: string;
  timestamp: number;  
  contributionURL: string; // Campo atualizado
  tags: string[];
}

@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);
  private contract: KnowledgeBaseContributor;
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;

  constructor() {
    const rpcUrl = 'http://127.0.0.1:8545/';
    const privateKey = process.env.PRIVATE_KEY;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    const deploymentsPath = path.join(
      __dirname,
      '../../../contracts/deployments/localhost.json'
    );
    let contractAddress: string;
    try {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
      contractAddress = deployments.KnowledgeBaseContributor;
    } catch (e) {
      this.logger.error(`Erro ao carregar endereço do contrato: ${e.message}`);
    }

    this.contract = KnowledgeBaseContributor__factory.connect(
      contractAddress,
      this.wallet
    );
  }

  async addContribution(
    createContributionDto: CreateContributionDto
  ): Promise<bigint> {
    await this.addContributionToVectorStore(createContributionDto.contributionURL);
    this.logger.log('Chamando addContribution no smart contract...');
  
    try {      
      const dynamicWallet = new ethers.Wallet(createContributionDto.privateKey, this.provider);
      const dynamicContract = this.contract.connect(dynamicWallet);
  
      const tx = await dynamicContract.addContribution(
        createContributionDto.contributionURL,
        createContributionDto.tags
      );
  
      this.logger.log(`Transação enviada. Hash: ${tx.hash}`);
  
      const receipt = await tx.wait();
      this.logger.log(`Transação confirmada no bloco: ${receipt.blockNumber}`);
  
      let contributionId: bigint | undefined;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = dynamicContract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'ContributionAdded') {
              contributionId = parsedLog.args.contributionId;
              break;
            }
          } catch {}
        }
      }
  
      if (contributionId === undefined) {
        this.logger.warn('Não foi possível encontrar o contributionId no evento.');
      }
  
      return contributionId || 0n;
    } catch (error) {
      this.logger.error('Erro ao adicionar contribuição no contrato:', error.message);
      throw new Error(`Falha ao registrar contribuição on-chain: ${error.message}`);
    }
  }
  

  async getContributionDetails(id: number): Promise<ContributionDetails> {
    this.logger.log(`Buscando detalhes da contribuição com ID: ${id}`);
    try {
      const contribution = await this.contract.getContribution(id);

      return {
        contributorAddress: contribution.contributorAddress,
        timestamp: Number(contribution.timestamp),        
        contributionURL: contribution.contributionURL, // Campo atualizado
        tags: contribution.tags,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar contribuição ${id} no contrato:`,
        error.message
      );
      throw new Error(
        `Falha ao buscar contribuição on-chain: ${error.message}`
      );
    }
  }

  async getTotalContributions(): Promise<bigint> {
    try {
      const total = await this.contract.getTotalContributions();
      return total;
    } catch (error) {
      this.logger.error('Erro ao obter total de contribuições:', error.message);
      throw new Error('Falha ao obter total de contribuições on-chain.');
    }
  }

  async getContributionsByContributor(
    contributorAddress: string
  ): Promise<ContributionDetails[]> {
    this.logger.log(
      `Buscando todas as contribuições para o contribuidor: ${contributorAddress}`
    );
    try {
      const contributionIds: bigint[] =
        await this.contract.getContributionsByContributor(contributorAddress);
      this.logger.log(
        `Encontrados ${contributionIds.length} IDs de contribuição para ${contributorAddress}.`
      );

      const allContributionsDetails: ContributionDetails[] = [];
      for (const id of contributionIds) {
        try {
          const contribution = await this.contract.getContribution(id);
          allContributionsDetails.push({
            contributorAddress: contribution.contributorAddress,
            timestamp: Number(contribution.timestamp),
            contributionURL: contribution.contributionURL, // Campo atualizado
            tags: contribution.tags,
          });
        } catch (innerError) {
          this.logger.warn(
            `Não foi possível buscar detalhes para o ID ${id.toString()}: ${innerError.message}`
          );
        }
      }

      this.logger.log(
        `Retornando ${allContributionsDetails.length} objetos de contribuição para ${contributorAddress}.`
      );
      return JSON.parse(JSON.stringify(allContributionsDetails));
    } catch (error) {
      this.logger.error(
        `Erro geral ao obter contribuições para ${contributorAddress}:`,
        error.message
      );
      throw new Error('Falha ao obter contribuições do contribuidor on-chain.');
    }
  }

  async getAllContributions(): Promise<ContributionDetails[]> {
    this.logger.log('Buscando todas as contribuições registradas no contrato.');
    try {      

      const totalContributions = await this.getTotalContributions();
      this.logger.log(`Total de contribuições encontradas: ${totalContributions}`);

      const allContributions: ContributionDetails[] = [];

      const contribution = await this.contract.getAllContributions();

      contribution.map((contribution) => {
        allContributions.push({
          contributorAddress: contribution.contributorAddress,
          timestamp: Number(contribution.timestamp),
          contributionURL: contribution.contributionURL, // Campo atualizado
          tags: contribution.tags,
        });
      });
      
      this.logger.log(`Retornando ${allContributions.length} objetos de todas as contribuições.`);
      return allContributions;
    } catch (error) {
      this.logger.error('Erro ao obter todas as contribuições:', error.message);
      throw new Error('Falha ao buscar todas as contribuições on-chain.');
    }
  }
  async createVectorStore(contributionURL: string): Promise<void> {
    const url = contributionURL;
    const FAISS_PATH = './../vectorStore';

    try {
      await axios.head(url);
    } catch (error) {
      console.error(`Erro ao acessar a URL ${url}: ${error.message}`);
      console.error(
        'Verifique se a URL está correta e é acessível publicamente.'
      );
      process.exit(1);
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GEMINI_API_KEY });
    let vectorStore: any;

    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splits = await textSplitter.splitDocuments(docs);

    vectorStore = await FaissStore.fromDocuments(splits, embeddings);
    await vectorStore.save(FAISS_PATH);
  }

  async updateVectorStore(contributionURL: string): Promise<void> {
    const FAISS_PATH = './../vectorStore';
    const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GEMINI_API_KEY });

    try {
      await axios.head(contributionURL);
    } catch (error) {
      throw new Error(`URL inacessível para atualização: ${contributionURL}`);
    }

    const loader = new CheerioWebBaseLoader(contributionURL);
    const docs = await loader.load();

    if (docs.length === 0) {
      return;
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splits = await textSplitter.splitDocuments(docs);

    let vectorStore: FaissStore;
    try {
      vectorStore = await FaissStore.load(FAISS_PATH, embeddings);
      const newVectorStore = await FaissStore.fromDocuments(splits, embeddings);
      await vectorStore.mergeFrom(newVectorStore);
    } catch (error) {
      vectorStore = await FaissStore.fromDocuments(splits, embeddings);
    }

    await vectorStore.save(FAISS_PATH);
  }

  validateExistenceVectorStore(): boolean {
    try {
      // Recomendo verificar a existência de um arquivo específico dentro da pasta
      // ao invés de apenas a pasta, para ter certeza que o vector store está 'válido'.
      // Ex: fs.existsSync(path.join('./../vectorStore', 'some_expected_file.faiss'))
      const vectorFolder = fs.readdirSync('./../vectorStore');
      return vectorFolder.length > 0; // Verifica se a pasta não está vazia
    } catch (error) {
      return false;
    }
  }

  async addContributionToVectorStore(contributionURL: string): Promise<void> {
    if (this.validateExistenceVectorStore()) {
      return await this.updateVectorStore(contributionURL);
    } else {
      return await this.createVectorStore(contributionURL);
    }
  }
}
