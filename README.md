# DeKB - Descentralized Knowledge Base

## 🚀 Como Rodar o Projeto

Siga os passos abaixo para configurar e executar o projeto localmente:

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/rrcasaque/DeKB.git
    ```

2.  **Instale as dependências:**

    Navegue até os diretórios especificados e execute `npm i` em cada um:

      * No diretório `/backend`:
        ```bash
        cd backend
        npm i
        ```
      * No diretório `/LLM`:
        ```bash
        cd LLM
        npm i
        ```
      * No diretório `/backend/contracts`:
        ```bash
        cd backend/contracts
        npm i
        ```

3.  **Crie os arquivos `.env` e configure suas chaves:**

      * Crie `/LLM/.env` e adicione sua chave de API do Google:
        ```env
        GOOGLE_API_KEY=SUA_CHAVE_AQUI
        ```
      * Crie `/backend/.env` e configure suas chaves:
        ```env
        GEMINI_API_KEY=SUA_CHAVE_AQUI
        PRIVATE_KEY=USE_UMA_CHAVE_PRIVADA_DO_HARDHAT
        ```
        > **Dica:** Para `PRIVATE_KEY`, use uma chave privada gerada pelo Hardhat para desenvolvimento.

4.  **Execute o Hardhat e faça o deploy do Smart Contract:**

      * No diretório `/backend/contracts`, inicie o node do Hardhat:
        ```bash
        npx hardhat node
        ```
      * Em outro terminal, no mesmo diretório `/backend/contracts`, faça o deploy do contrato:
        ```bash
        npx hardhat run scripts/deploy.ts --network localhost
        ```

5.  **Inicie o projeto NestJS:**

      * No diretório `/backend`:
        ```bash
        npm run start:dev
        ```

-----

## 💡 Utilizando a API

### Adicionando uma Nova Contribuição

  * **Endpoint:** `POST http://localhost:3000/contribution`

  * **Detalhes:** Utilize uma **chave privada do Hardhat** para autenticação.

### Obtendo Todas as Contribuições

  * **Endpoint:** `GET http://localhost:3000/contribution`

### Obtendo Contribuições por Contribuidor

  * **Endpoint:** `GET http://localhost:3000/contribution/getContributionsByContributor/:id`

-----

## 🤖 Base de Conhecimento com LLM

Para interagir com a base de conhecimento gerada usando o modelo de linguagem:

  * No diretório `/LLM`, execute:

    ```bash
    node .\chat.js
    ```

  * Após a execução, você poderá **inserir suas perguntas** no terminal.
