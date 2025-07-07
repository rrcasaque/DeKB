import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import * as fs from "node:fs/promises";
import readline from "node:readline";

async function runRAGFromPersistedVectors() {
  const apiKey = process.env.GOOGLE_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const llm = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const FAISS_PATH = "../vectorStore";

  const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: apiKey });
  let vectorStore;
  
  try {
    await fs.access(FAISS_PATH);
    vectorStore = await FaissStore.load(FAISS_PATH, embeddings);
  } catch (error) {
    console.error(`Erro: Não foi possível carregar o índice FAISS de "${FAISS_PATH}".`);
    console.error("Certifique-se de que o script anterior foi executado para criar os vetores.");
    console.error(`Erro original: ${error.message}`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const askQuestion = () => {
    return new Promise((resolve) => {
      rl.question("Faça sua pergunta: ", (answer) => {
        resolve(answer);
      });
    });
  };

  const prompt = await askQuestion();
  rl.close();

  const relevantDocs = await vectorStore.similaritySearch(prompt, 2);
  const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

  const finalPrompt = `
    Com base no seguinte contexto, responda à pergunta:

    Contexto:
    ${context}

    Pergunta: "${prompt}"
    Resposta:
    `;

  const generationConfig = {
    maxOutputTokens: 1000000,
    responseMimeType: "text/plain",
    temperature: 0.5,
    topK: 20,
    topP: 0.8,
  };

  const chatSession = llm.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(finalPrompt);
  const response = result.response.text();
  console.log("\n--- Resposta do LLM ---");
  console.log(response);
  console.log("------------------------");
}

runRAGFromPersistedVectors().catch(console.error);