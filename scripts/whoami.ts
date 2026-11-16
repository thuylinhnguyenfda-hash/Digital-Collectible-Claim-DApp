import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia" });
const [signer] = await ethers.getSigners();
console.log("Dia chi vi:", signer.address);
console.log("So du (ETH):", ethers.formatEther(await ethers.provider.getBalance(signer.address)));