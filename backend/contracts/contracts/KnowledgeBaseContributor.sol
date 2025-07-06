// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title KnowledgeBaseContributor
/// @notice Um contrato para gerenciar metadados de contribuições para uma base de conhecimento RAG.
///         Permite que usuários registrem suas contribuições e que esses metadados sejam consultados.
contract KnowledgeBaseContributor {

    // --- Estrutura de Dados ---
    // Define a estrutura para cada metadado de contribuição
    struct Contribution {
        address contributorAddress;
        uint256 timestamp;
        string documentHash;     // Hash criptográfico do PDF original (ex: SHA256)
        string vectorStoreId;    // ID de referência para o vetor no sistema off-chain (FAISS, etc.)
        string documentTitle;
        string ipfsHash;         // Hash do IPFS/Arweave do PDF original (se armazenado lá)
        string[] tags;           // Tags/categorias para o documento
    }

    // --- Armazenamento de Dados ---
    // Mapeamento de um ID único (gerado por contador) para cada Contribuição
    mapping(uint256 => Contribution) public contributions;
    // Mapeamento do endereço do contribuidor para um array de IDs de suas contribuições
    mapping(address => uint256[]) public contributorContributions;

    // Contador para gerar IDs únicos para cada nova contribuição
    uint256 private _nextContributionId;

    // --- Eventos ---
    // Evento emitido quando uma nova contribuição é registrada
    event ContributionAdded(
        uint256 indexed contributionId,
        address indexed contributor,
        string documentTitle,
        string vectorStoreId,
        string ipfsHash
    );

    // --- Funções de Escrita (CREATE) ---

    /// @notice Permite que um usuário registre os metadados de uma nova contribuição.
    /// @param _documentHash Hash criptográfico do conteúdo do documento PDF.
    /// @param _vectorStoreId ID único gerado pelo seu vector store off-chain para este documento.
    /// @param _documentTitle Título descritivo do documento.
    /// @param _ipfsHash Hash do IPFS/Arweave onde o PDF original está armazenado (pode ser vazio se não usar).
    /// @param _tags Array de strings para tags ou categorias do documento.
    /// @return contributionId O ID único da contribuição recém-adicionada.
    function addContribution(
        string calldata _documentHash,
        string calldata _vectorStoreId,
        string calldata _documentTitle,
        string calldata _ipfsHash,
        string[] calldata _tags
    ) external returns (uint256) {
        require(bytes(_documentHash).length > 0, "Document hash cannot be empty");
        require(bytes(_vectorStoreId).length > 0, "Vector store ID cannot be empty");
        require(bytes(_documentTitle).length > 0, "Document title cannot be empty");

        uint256 currentId = _nextContributionId;

        // Armazena a nova contribuição
        contributions[currentId] = Contribution({
            contributorAddress: msg.sender,
            timestamp: block.timestamp,
            documentHash: _documentHash,
            vectorStoreId: _vectorStoreId,
            documentTitle: _documentTitle,
            ipfsHash: _ipfsHash,
            tags: _tags
        });

        // Adiciona o ID da contribuição à lista do contribuidor
        contributorContributions[msg.sender].push(currentId);

        _nextContributionId++; // Incrementa o contador para o próximo ID

        // Emite o evento para que dApps possam escutar e reagir
        emit ContributionAdded(currentId, msg.sender, _documentTitle, _vectorStoreId, _ipfsHash);

        return currentId;
    }

    // --- Funções de Leitura (READ) ---

    /// @notice Retorna os metadados de uma contribuição específica.
    /// @param _contributionId O ID único da contribuição.
    /// @return contributorAddress Endereço da carteira do contribuidor.
    /// @return timestamp Carimbo de data/hora da contribuição.
    /// @return documentHash Hash criptográfico do documento.
    /// @return vectorStoreId ID do vetor no storage off-chain.
    /// @return documentTitle Título do documento.
    /// @return ipfsHash Hash do IPFS/Arweave do documento original.
    /// @return tags Array de tags associadas ao documento.
    function getContribution(uint256 _contributionId)
        external
        view
        returns (
            address contributorAddress,
            uint256 timestamp,
            string memory documentHash,
            string memory vectorStoreId,
            string memory documentTitle,
            string memory ipfsHash,
            string[] memory tags
        )
    {
        Contribution storage c = contributions[_contributionId];
        // Retorna os valores da struct. Se o ID não existir, retornará valores padrão (zeros/vazios).
        return (
            c.contributorAddress,
            c.timestamp,
            c.documentHash,
            c.vectorStoreId,
            c.documentTitle,
            c.ipfsHash,
            c.tags
        );
    }

    /// @notice Retorna o número total de contribuições registradas.
    /// @return O número total de IDs de contribuição gerados.
    function getTotalContributions() external view returns (uint256) {
        return _nextContributionId;
    }

    /// @notice Retorna todos os IDs de contribuições feitas por um endereço específico.
    /// @param _contributor O endereço do contribuidor.
    /// @return Um array de IDs de contribuições.
    function getContributionsByContributor(address _contributor)
        external
        view
        returns (uint256[] memory)
    {
        return contributorContributions[_contributor];
    }
}