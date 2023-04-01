const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const FUND_AMOUNT = "1000000000000000000000"
const imagesLocation = "./images/randomNft"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: {
        trait_type: "",
        value: "",
    },
}

let tokenUris = [
    "ipfs://QmQ83Df3mKGdLBmdaRCTv4Mzf2Q89uckKDYPo8ScNjknXJ",
    "ipfs://QmQofyqXai6puB3rxTeMFp3ZX6AeF2EZvrH7rFYeT4KFFX",
    "ipfs://QmdjsWDyvhYwN2frmM5aqPoFKadWfyJaKdns3rqdk256n9",
]

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    //get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handletokenUris()
    }

    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock
    // console.log("network.name" + network.name)
    if (developmentChains.includes(network.name)) {
        // console.log("it chose that it is a developent chain")
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        // console.log("Log: subscriptionId before event call is " + subscriptionId) // this was for debugging
        subscriptionId = transactionReceipt.events[0].args.subId
        // console.log("Log: subscriptionId from events is " + subscriptionId) // this was for debugging
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        // console.log("it chose that it isnt a developent chain")
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    log("-----------------------------------")

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations,
    })

    log("-----------------------------------")

    if (developmentChains.includes(network.name)) {
        // console.log("randomIpfsNft.address: " + randomIpfsNft.address)
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address)
    }

    async function handletokenUris() {
        tokenUris = []

        const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
        for (const imageUploadResponseIndex in imageUploadResponses) {
            let tokenUriMetadata = { ...metadataTemplate } // ... is JS syntactic sugar, which basically means its unpacking my metadatTemplate and sticking it into tokenUriMetadata
            tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
            tokenUriMetadata.description = `A sketch of the Head of ${tokenUriMetadata.name}.`
            tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
            console.log(`Uploading ${tokenUriMetadata.name}...`)
            const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
            tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
        }
        console.log("Token URIs Uploaded! They are:")
        console.log(tokenUris)
        return tokenUris
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    } else {
        if (developmentChains.includes(network.name)) {
            console.log("didn't verify because it's a development Chain")
        }
        if (!process.env.ETHERSCAN_API_KEY) {
            console.log("didn't verify because no Etherscan API Key provided")
        }
    }

    log("----------------------------------------------------")
}

module.exports.tags = ["all", "randomipfs", "main"]
