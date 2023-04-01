// Improvement notes from cGPT:

// Here are some improvements you can make to ensure greater safety:

// Use the OpenZeppelin ReentrancyGuard contract: OpenZeppelin provides a contract called ReentrancyGuard, which you can inherit in your contract to add a lock to your functions. This contract is well-audited and is designed to prevent reentrancy attacks. You can find the code for the contract here: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/security/ReentrancyGuard.sol

// Use the OpenZeppelin nonReentrant modifier: OpenZeppelin also provides a modifier called nonReentrant, which you can apply to your function to prevent reentrancy attacks. This modifier is a more secure way of adding a lock to your functions, as it prevents any possible loopholes that an attacker might exploit.

// Here's an example of how you can use the nonReentrant modifier in your code:

// typescript
// Copy code
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// contract MyContract is ReentrancyGuard {
//   mapping (uint256 => string) public randomWords;

//   function fulfillRandomWords(uint256 tokenId) public nonReentrant {
//     require(randomWords[tokenId] == "", "Words already generated");

//     // Generate random words and store in randomWords mapping
//     string memory words = generateRandomWords();
//     randomWords[tokenId] = words;

//     // Mint the NFT and set its URI
//     _safeMint(msg.sender, tokenId);
//     _setTokenURI(tokenId, words);
//   }
// }
// In this code, we have imported the ReentrancyGuard contract from OpenZeppelin and inherited it in our contract using is ReentrancyGuard. We have also added the nonReentrant modifier to the fulfillRandomWords function to prevent reentrancy attacks.

// Note that it's always recommended to use well-audited and tested code for security measures. Therefore, using the OpenZeppelin contracts is a best practice for secure development.

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    error RandomIpfsNft__RangeOutOfBounds();
    error RandomIpfsNft__NeedMoreETHSent();
    error RandomIpfsNft__TransferFailed();

    // Type Declaration
    enum Breed {
        PUG,
        SHIBAINU,
        ST_BERNARD
    }

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender;

    //NFT Variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenUris;
    uint256 internal i_mintFee;

    //Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Randnom IPFS NFT", "RIN") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane; // keyHash
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenUris = dogTokenUris;
        i_mintFee = mintFee;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNft__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender; // this is creating a new Key Value Pair in the mapping
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address dogOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE; // this makes the retruned random word a number between 0 and 99
        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        s_tokenCounter++;
        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwner);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum += chanceArray[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
