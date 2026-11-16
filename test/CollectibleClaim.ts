import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("CollectibleClaim", function () {
  let c: any, manager: any, a: any, b: any, outsider: any;

  beforeEach(async () => {
    [manager, a, b, outsider] = await ethers.getSigners();
    c = await ethers.deployContract("CollectibleClaim");
  });

  it("1. Chi quan ly moi duoc xac nhan thanh vien", async () => {
    await expect(c.connect(outsider).authorizeMember(a.address))
      .to.be.revertedWith("Chi quan ly moi duoc phep");
  });

  it("2. Vi chua xac nhan khong duoc nhan", async () => {
    await expect(c.connect(a).claimCollectible())
      .to.be.revertedWith("Chua duoc quan ly xac nhan");
  });

  it("3. Nhan lan dau: nguon cung giam, so da phat hanh tang", async () => {
    await c.authorizeMember(a.address);
    await c.connect(a).claimCollectible();
    expect(await c.hasClaimed(a.address)).to.equal(true);
    expect(await c.getRemainingSupply()).to.equal(99n);
    expect(await c.totalClaimed()).to.equal(1n);
  });

  it("4. Moi vi chi nhan mot lan", async () => {
    await c.authorizeMember(a.address);
    await c.connect(a).claimCollectible();
    await expect(c.connect(a).claimCollectible())
      .to.be.revertedWith("Moi vi chi nhan 1 lan");
  });

  it("5. Khong vuot qua 100 vat pham", async () => {
    for (let i = 0; i < 100; i++) {
      const w = ethers.Wallet.createRandom().connect(ethers.provider);
      await c.authorizeMember(w.address);
      await ethers.provider.send("hardhat_setBalance", [w.address, "0xDE0B6B3A7640000"]);
      await c.connect(w).claimCollectible();
    }
    expect(await c.getRemainingSupply()).to.equal(0n);
    await c.authorizeMember(b.address);
    await expect(c.connect(b).claimCollectible())
      .to.be.revertedWith("Da het vat pham");
  });

  it("6. Khong thu hoi duoc vi da nhan", async () => {
    await c.authorizeMember(a.address);
    await c.connect(a).claimCollectible();
    await expect(c.revokeMember(a.address))
      .to.be.revertedWith("Da nhan, khong the thu hoi");
  });
});