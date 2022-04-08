// TODO:
// Contract call to change _revealCid
require("dotenv").config();

const { NFTStorage, File } = require('nft.storage')
const { getFilesFromPath } = require('files-from-path')
const fs = require('fs')
const Path = require('path')
const { ethers } = require("hardhat");
const keccak256 = require('keccak256');

const NFT_STORAGE_TOKEN = process.env.NFT_STORAGE

async function main() {

  const args = process.argv.slice(2)
    if (args.length !== 2) {
    console.error(`usage: ${process.argv[0]} ${process.argv[1]} <dir-path> <reveal-addr>`)
    process.exit(1)
  }

  const [path, revealAddress] = args

  let traits = []

  // Check to ensure traits are included.
  fs.stat(Path.join(path, 'traits.json'), function(err, stat) {
    if(!stat) {
        console.error(`can't read traits.json, ensure it exists.`)
        process.exit(1)
    } else {
        traits = JSON.parse(fs.readFileSync(Path.join(path, 'traits.json'), 'utf-8'))
    }
  });

  // Note: this fails when passed via storage, so we pass directly here to remove the dir.
  const files = await getFilesFromPath(path, { pathPrefix: path })
  
  // Compare the files with traits to ensure that we have the correct files.
  for (var key in traits["nft"]) {
    let value = traits["nft"][key];
    var pngMatch = files.find(o => o.name === "/" + value.filename + ".png");
    // var mp4Match = files.find(o => o.name === "/" + value.name + ".mp4");

    if (pngMatch) {
        console.log(`match is json: ${value.filename}`)
    } else {
        console.log(`missing file for ${value.filename}, ensure it exists.`)
        process.exit(1)
    }

  }

  const storage = new NFTStorage({ token: NFT_STORAGE_TOKEN })

  console.log(`storing ${files.length} file(s) from ${path}`)
  const cid = await storage.storeDirectory(files, {
      hidden: false
  })
  console.log({ cid })

  const status = await storage.status(cid)
  console.log(status)

  // Update the CID of the contract.
//   const revealNft = await new ethers.Contract(
//     revealAddress,
//     ["function updateRevealCid(string memory newCid) public onlyOwner"],
//     await ethers.getSigner()
//   );
//   await revealNft.updateRevealCid(cid);
}

main()
  .catch(err => {
      console.error(err)
      process.exit(1)
  })
