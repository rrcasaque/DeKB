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

export interface ContributionDetails {
  contributorAddress: string;
  timestamp: number;
  documentHash: string;
  vectorStoreId: string;
  documentTitle: string;
  ipfsHash: string;
  tags: string[];
}

@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);
  private contract: KnowledgeBaseContributor;
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;

  constructor() {
    // const rpcUrl = process.env.POLYGON_AMOY_RPC_URL
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
    await this.addContributionToVectorStore(createContributionDto.url);
    this.logger.log('Chamando addContribution no smart contract...');
    try {
      // Chamada à função do contrato com os dados tipados
      const tx = await this.contract.addContribution(
        createContributionDto.documentHash,
        createContributionDto.vectorStoreId,
        createContributionDto.documentTitle,
        createContributionDto.ipfsHash,
        createContributionDto.tags
      );

      this.logger.log(`Transação de addContribution enviada. Hash: ${tx.hash}`);

      // Espera a transação ser minerada e confirmada
      const receipt = await tx.wait();
      this.logger.log(
        `Transação de addContribution confirmada no bloco: ${receipt.blockNumber}`
      );

      // O contrato retorna o contributionId, que pode ser acessado pelo `Result` da transação
      // No ethers v6, TypedContractMethod retorna os tipos de saída diretamente.
      // Para `addContribution`, o retorno é `uint256`, que o Typechain mapeia para `bigint`.
      // O evento 'ContributionAdded' também é uma boa fonte para pegar o ID.

      // Uma maneira robusta de obter o ID é através do evento emitido.
      // Percorra os logs do recibo para encontrar o evento ContributionAdded.
      let contributionId: bigint | undefined;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'ContributionAdded') {
              // Supondo que 'contributionId' é o primeiro argumento indexado do evento
              contributionId = parsedLog.args.contributionId;
              break;
            }
          } catch (parseError) {
            // Ignorar logs que não são do nosso contrato ou eventos não reconhecidos
          }
        }
      }

      if (contributionId === undefined) {
        this.logger.warn(
          'Não foi possível encontrar o contributionId no evento da transação. Verifique o log do contrato.'
        );
        // Em casos onde o evento não é capturado, você poderia retornar 0n ou lançar um erro
        // ou até mesmo chamar getTotalContributions() para pegar o último ID, mas isso é menos robusto.
      }

      return contributionId || 0n; // Retorna o ID ou 0n se não encontrado
    } catch (error) {
      this.logger.error(
        'Erro ao adicionar contribuição no contrato:',
        error.message
      );
      // Logar o erro completo para depuração
      if (error.data) {
        // Erro de revert do EVM
        try {
          const decodedError = this.contract.interface.parseError(error.data);
          if (decodedError) {
            this.logger.error(
              `Erro de contrato: ${decodedError.name}(${decodedError.args.join(', ')})`
            );
          } else {
            this.logger.error(
              `Erro de transação com dados desconhecidos: ${error.data}`
            );
          }
        } catch (e) {
          this.logger.error(
            `Erro ao decodificar erro de contrato: ${e.message}`
          );
        }
      }
      throw new Error(
        `Falha ao registrar contribuição on-chain: ${error.message}`
      );
    }
  }

  async getContributionDetails(id: number) {
    this.logger.log(`Buscando detalhes da contribuição com ID: ${id}`);
    try {
      const contribution = await this.contract.getContribution(id);

      return {
        contributorAddress: contribution.contributorAddress,
        timestamp: Number(contribution.timestamp),
        documentHash: contribution.documentHash,
        vectorStoreId: contribution.vectorStoreId,
        documentTitle: contribution.documentTitle,
        ipfsHash: contribution.ipfsHash,
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
            documentHash: contribution.documentHash,
            vectorStoreId: contribution.vectorStoreId,
            documentTitle: contribution.documentTitle,
            ipfsHash: contribution.ipfsHash,
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

  async createVectorStore(urlContribution: string): Promise<void> {
    const url = urlContribution;
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
    let vectorStore:any;    

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

  async updateVectorStore(urlContribution: string): Promise<void> {
    const FAISS_PATH = './../vectorStore';
    const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GEMINI_API_KEY });    

    try {
      await axios.head(urlContribution);
    } catch (error) {
      throw new Error(`URL inacessível para atualização: ${urlContribution}`);
    }

    const loader = new CheerioWebBaseLoader(urlContribution);
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
      const vectorFolder = fs.readdirSync('./../vectorStore');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async addContributionToVectorStore(urlContribution: string): Promise<void> {
    if (this.validateExistenceVectorStore()) {
      return await this.updateVectorStore(urlContribution);
    } else {
      return await this.createVectorStore(urlContribution);
    }
  }
}
