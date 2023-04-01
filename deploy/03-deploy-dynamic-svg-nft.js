const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let ethUsdpriceFeedAddress
    // console.log("network.name" + network.name)
    if (developmentChains.includes(network.name)) {
        // console.log("it chose that it is a developent chain")
        const ethUsdAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdpriceFeedAddress = ethUsdAggregator.address
    } else {
        // console.log("it chose that it isnt a developent chain")
        ethUsdpriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    log("----------------------------------------------------")

    const lowSvg = await fs.readFileSync("./images/dynamicNft/frown.svg", { encoding: "utf-8" })

    const highSvg = await fs.readFileSync("./images/dynamicNft/happy.svg", { encoding: "utf-8" })

    const args = [ethUsdpriceFeedAddress, lowSvg, highSvg]

    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(dynamicSvgNft.address, args)
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

module.exports.tags = ["all", "dynamicsvg", "main"]
