const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

const pinataApiKey = process.env.PINATA_API_KEY
const pinataApiSecret = process.env.PINATA_API_SECRET
const pinata = new pinataSDK(pinataApiKey, pinataApiSecret)

async function storeImages(imagesFilePath) {
    // console.log(`imagesFilePath: ${imagesFilePath}`)
    const fullImagesPath = path.resolve(imagesFilePath)
    // console.log(`fullImagesPath: ${fullImagesPath}`)
    const files = fs.readdirSync(fullImagesPath).filter((file) => file.includes(".png"))
    // console.log(`files: ${files}`)
    let responses = []
    console.log("Uploading to Pinata")

    for (const fileIndex in files) {
        // console.log(`fileIndex: ${fileIndex}`)
        // console.log(`Uploading ${fileIndex}`)
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)
        // console.log(`readableStreamForFile: ${JSON.stringify(readableStreamForFile)}`)
        const options = {
            pinataMetadata: {
                name: files[fileIndex],
            },
        }
        try {
            await pinata
                .pinFileToIPFS(readableStreamForFile, options)
                .then((result) => {
                    responses.push(result)
                })
                // console.log(`response: ${response}`)
                .catch((err) => {
                    console.log(err)
                })
        } catch (error) {
            console.log(error)
        }
    }
    console.log(`responses: ${JSON.stringify(responses)} `)
    return { responses, files }
}
// console.log(`responses: ${responses}`)

async function storeTokenUriMetadata(metadata) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata)
        return response
    } catch (error) {
        console.log(error)
    }
    return null // why do we return null here? if we dont want to return anything we could just leave it out... (?) I guess we need to use the return so the other return from pinJSONToIPFS() gets through...
}
module.exports = { storeImages, storeTokenUriMetadata }
