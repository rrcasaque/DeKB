// backend/contracts/hardhat.config.ts
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox'; // Inclui ethers, verify, etc.
import '@typechain/hardhat'; // Importa o plugin Typechain

// Import dotenv para gerenciar variáveis de ambiente de forma segura
import * as dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.20', // Use a versão do Solidity que você está usando no seu contrato
  networks: {
    amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || '', // Certifique-se de definir esta variável de ambiente
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [], // Sua chave privada (NUNCA NO CÓDIGO!)
    },
    // Adicione outras redes conforme necessário (polygon mainnet, etc.)
  },
  // Configuração do Typechain para gerar os tipos
  typechain: {
    outDir: 'types', // Onde os tipos serão gerados (backend/contracts/types)
    target: 'ethers-v6', // Escolha a versão do ethers que você usa no NestJS (ethers v6 é o mais recente)
    alwaysGenerateOverloads: true, // Útil para funções com o mesmo nome e diferentes parâmetros
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || '', // Chave API para verificar contratos
    },
  },
};

export default config;
