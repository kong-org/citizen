# $CITIZEN

## Alpha

Contracts used for 500 KONG Land Alpha $CITIZEN ERC-20 tokens deployed at 0x77f0cc420dea0ae726db6bef1460a4b69176a8ea and KONG Land ERC-721 tokens deployed at 0x355929193308e157760824ba860390924d77fab9. Minting for the ERC-721 by burning the ERC-20 via BurnMintCitizen.sol. 

Learn more at https://kong.land/.

## Test

1. `npm i`
2. `npx hardhat test`

### Note

If you encounter the error `Error: error:0308010C:digital envelope routines::unsupported`, you many need to set a Node flag: `export SET NODE_OPTIONS=--openssl-legacy-provider`.