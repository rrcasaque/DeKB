// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KnowledgeBaseContributor {
    struct Contribution {
        address contributorAddress;
        uint256 timestamp;        
        string contributionURL;
        string[] tags;
    }

    mapping(uint256 => Contribution) public contributions;
    mapping(address => uint256[]) public contributorContributions;

    uint256 private _nextContributionId;

    event ContributionAdded(
        uint256 indexed contributionId,
        address indexed contributor,        
        string contributionURL
    );

    function addContribution(
        string calldata _contributionURL,
        string[] calldata _tags
    ) external returns (uint256) {
        require(bytes(_contributionURL).length > 0, "Contribution URL cannot be empty");

        uint256 currentId = _nextContributionId;

        contributions[currentId] = Contribution({
            contributorAddress: msg.sender,
            timestamp: block.timestamp,            
            contributionURL: _contributionURL,
            tags: _tags
        });

        contributorContributions[msg.sender].push(currentId);

        _nextContributionId++;

        emit ContributionAdded(currentId, msg.sender, _contributionURL);

        return currentId;
    }

    function getContribution(uint256 _contributionId)
        external
        view
        returns (
            address contributorAddress,
            uint256 timestamp,            
            string memory contributionURL,
            string[] memory tags
        )
    {
        Contribution storage c = contributions[_contributionId];
        return (
            c.contributorAddress,
            c.timestamp,            
            c.contributionURL,
            c.tags
        );
    }

    function getTotalContributions() external view returns (uint256) {
        return _nextContributionId;
    }

    function getContributionsByContributor(address _contributor)
        external
        view
        returns (uint256[] memory)
    {
        return contributorContributions[_contributor];
    }    

    function getAllContributions()
    external
    view
    returns (Contribution[] memory)
{
    uint256 total = _nextContributionId;
    Contribution[] memory allContributions = new Contribution[](total);

    for (uint256 i = 0; i < total; i++) {
        allContributions[i] = contributions[i];
    }

    return allContributions;
}
}