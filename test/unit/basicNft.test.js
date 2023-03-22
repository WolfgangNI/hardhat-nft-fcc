const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("BasicNft", () => {
    let basicNft

    beforeEach(async () => {
        const BasicNft = await ethers.getContractFactory("BasicNft")
        basicNft = await BasicNft.deploy()
        await basicNft.deployed()
    })

    it("should set the token URI", async () => {
        expect(await basicNft.tokenURI(0)).to.equal(
            "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json"
        )
    })

    it("should return the token counter", async () => {
        expect(await basicNft.getTokenCounter()).to.equal(0)
    })

    it("should increment the token counter on mint", async () => {
        await basicNft.mintNft()
        expect(await basicNft.getTokenCounter()).to.equal(1)
    })

    it("should mint a token to the sender", async () => {
        await basicNft.mintNft()
        const owner = await basicNft.ownerOf(0)
        expect(owner).to.equal(await ethers.provider.getSigner(0).getAddress())
    })
})
