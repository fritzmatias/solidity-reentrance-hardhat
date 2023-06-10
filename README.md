# solidity-reentrance-hardhat
    reentrance attack example using hardhat fw
    Run `npm test` to demo all.
    Run `npm run tests:attack1:success` to demo a reentrance attack on a vulnerable contract using sendValue.[success](docs/attack1.success.log)
    Run `npm run tests:attack1:fail` to demo a reverted reentrance attack on a vulnerable contract using sendValue.[fail](docs/attack1.fail.log)
    Run `npm run tests:attack2:fail` to demo a reverted reentrance attack on a contract using transfer instead of sendValue.[fail](docs/attack2.fail.log)


### hardhat commands
    ```shell
    npx hardhat help
    npx hardhat test
    REPORT_GAS=true npx hardhat test
    npx hardhat node
    npx hardhat run scripts/deploy.ts
    ```
## Doc
[package.json](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
