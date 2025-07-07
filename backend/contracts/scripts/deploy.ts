import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log("Iniciando o deploy do contrato KnowledgeBaseContributor...");

  const KnowledgeBaseContributor = await ethers.getContractFactory("KnowledgeBaseContributor");

  const knowledgeBaseContributor = await KnowledgeBaseContributor.deploy();

  await knowledgeBaseContributor.waitForDeployment();

  const contractAddress = knowledgeBaseContributor.target;
  console.log(`KnowledgeBaseContributor implantado em: ${contractAddress}`);

  const deploymentsPath = path.join(__dirname, '../deployments');

  if (!fs.existsSync(deploymentsPath)) {
    console.log(`Criando pasta: ${deploymentsPath}`);
    fs.mkdirSync(deploymentsPath);
  }

  const networkName = (await ethers.provider.getNetwork()).name;
  const deploymentFilePath = path.join(deploymentsPath, `${networkName}.json`);

  let deployments = {};
  if (fs.existsSync(deploymentFilePath)) {
    try {
      deployments = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf-8'));
      console.log(`Arquivo de deploy existente encontrado para ${networkName}. Carregando...`);
    } catch (e) {
      console.warn(`Erro ao ler ${deploymentFilePath}. Criando um novo arquivo.`, e);
      deployments = {}; // Se o arquivo estiver corrompido, comece do zero
    }
  }

  deployments = { ...deployments, KnowledgeBaseContributor: contractAddress };

  fs.writeFileSync(deploymentFilePath, JSON.stringify(deployments, null, 2));
  console.log(`Endereço do contrato salvo em ${deploymentFilePath}`);
}

main().catch((error) => {
  console.error("Erro durante o deploy:", error);
  process.exitCode = 1;
});