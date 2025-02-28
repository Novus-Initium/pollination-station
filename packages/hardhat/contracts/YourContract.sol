//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContract {
    address public owner;

    // DAO struct
    struct DAO {
        address daoAddress; // Unique identifier (DAO's address)
        string title; // DAO title
        string description; // DAO description
        string socials; // Social media links or info
        uint256[] needIds; // Array of Need IDs associated with this DAO
    }

    // Need struct
    struct Need {
        uint256 needId; // Unique identifier
        string description; // Need description
        address dao; // DAO associated with this need
    }

    // Pollin struct (relationship between DAOs and a Need)
    struct Pollin {
        uint256 pollinId; // Unique identifier
        address daoWithNeed; // DAO that has the need
        address daoWithOffering; // DAO offering something for the need
        uint256 needId; // The specific Need being addressed
        string descriptionOfRelationship; // Description of the relationship
        uint256 confidence; // Confidence score (0-100)
    }

    // Mappings to store data
    mapping(address => DAO) public daos; // DAO address -> DAO struct
    mapping(uint256 => Need) public needs; // Need ID -> Need struct
    mapping(uint256 => Pollin) public pollins; // Pollin ID -> Pollin struct

    // Counters for unique IDs
    uint256 public needCount;
    uint256 public pollinCount;

    // Events for off-chain indexing (e.g., The Graph)
    event DAOCreated(address indexed daoAddress, string title, string description, string socials);
    event NeedCreated(uint256 indexed needId, address indexed dao, string description);
    event PollinCreated(
        uint256 indexed pollinId,
        address indexed daoWithNeed,
        address indexed daoWithOffering,
        uint256 needId,
        string descriptionOfRelationship,
        uint256 confidence
    );

    constructor(address _owner) {
        owner = _owner;
    }

    // Function 1: Add a new DAO
    function addDAO(string memory _title, string memory _description, string memory _socials) public {
        address daoAddress = msg.sender;
        require(daos[daoAddress].daoAddress == address(0), "DAO already exists");

        daos[daoAddress] = DAO({
            daoAddress: daoAddress,
            title: _title,
            description: _description,
            socials: _socials,
            needIds: new uint256[](0) // Initialize empty array
        });

        emit DAOCreated(daoAddress, _title, _description, _socials);
    }

    // Function 2: Add a Need associated with a DAO
    function addNeed(string memory _description) public returns (uint256) {
        address daoAddress = msg.sender;
        require(daos[daoAddress].daoAddress != address(0), "DAO does not exist");

        needCount++;
        uint256 newNeedId = needCount;

        needs[newNeedId] = Need({ needId: newNeedId, description: _description, dao: daoAddress });

        // Link the Need to its DAO
        daos[daoAddress].needIds.push(newNeedId);

        emit NeedCreated(newNeedId, daoAddress, _description);
        return newNeedId;
    }

    // Function 3: Add a Pollin (by AI agent)
    function addPollin(
        address _daoWithNeed,
        address _daoWithOffering,
        uint256 _needId,
        string memory _descriptionOfRelationship,
        uint256 _confidence
    ) public returns (uint256) {
        // Validate existence and ownership
        require(daos[_daoWithNeed].daoAddress != address(0), "DAO with need does not exist");
        require(daos[_daoWithOffering].daoAddress != address(0), "DAO with offering does not exist");
        require(needs[_needId].needId != 0, "Need does not exist");
        require(needs[_needId].dao == _daoWithNeed, "Need does not belong to specified DAO");
        require(_confidence <= 100, "Confidence must be 0-100");

        pollinCount++;
        uint256 newPollinId = pollinCount;

        pollins[newPollinId] = Pollin({
            pollinId: newPollinId,
            daoWithNeed: _daoWithNeed,
            daoWithOffering: _daoWithOffering,
            needId: _needId,
            descriptionOfRelationship: _descriptionOfRelationship,
            confidence: _confidence
        });

        emit PollinCreated(
            newPollinId,
            _daoWithNeed,
            _daoWithOffering,
            _needId,
            _descriptionOfRelationship,
            _confidence
        );

        return newPollinId;
    }

    // Getter functions for front-end display
    function getDAO(
        address _daoAddress
    )
        public
        view
        returns (string memory title, string memory description, string memory socials, uint256[] memory needIds)
    {
        DAO memory d = daos[_daoAddress];
        require(d.daoAddress != address(0), "DAO does not exist");
        return (d.title, d.description, d.socials, d.needIds);
    }

    function getNeed(uint256 _needId) public view returns (string memory description, address dao) {
        Need memory n = needs[_needId];
        require(n.needId != 0, "Need does not exist");
        return (n.description, n.dao);
    }

    function getPollin(
        uint256 _pollinId
    )
        public
        view
        returns (
            address daoWithNeed,
            address daoWithOffering,
            uint256 needId,
            string memory descriptionOfRelationship,
            uint256 confidence
        )
    {
        Pollin memory p = pollins[_pollinId];
        require(p.pollinId != 0, "Pollin does not exist");
        return (p.daoWithNeed, p.daoWithOffering, p.needId, p.descriptionOfRelationship, p.confidence);
    }
}
