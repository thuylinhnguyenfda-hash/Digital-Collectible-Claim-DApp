import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia" });

const c = await ethers.deployContract("CollectibleClaim");
await c.waitForDeployment();
console.log("Dia chi contract:", await c.getAddress());