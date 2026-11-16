// ============================================================
// LOGIC CHÍNH CỦA DAPP
// Dùng CONTRACT_ADDRESS, CONTRACT_ABI, MAX_SUPPLY từ config.js
// ============================================================


// ------------------------------------------------------------
// 1. BIẾN TRẠNG THÁI
// ------------------------------------------------------------
let provider;       // cầu nối tới MetaMask
let signer;         // đối tượng dùng để ký giao dịch
let userAddress;    // địa chỉ ví đang kết nối
let contract;       // đối tượng điều khiển smart contract


// ------------------------------------------------------------
// 2. THAM CHIẾU TỚI CÁC PHẦN TỬ TRÊN TRANG
// ------------------------------------------------------------
const el = {
  networkBadge:  document.getElementById("networkBadge"),
  connectBtn:    document.getElementById("connectBtn"),
  contractInput: document.getElementById("contractInput"),
  loadBtn:       document.getElementById("loadBtn"),
  walletText:    document.getElementById("walletText"),
  remainingText: document.getElementById("remainingText"),
  claimedText:   document.getElementById("claimedText"),
  vault:         document.getElementById("vault"),
  authBadge:     document.getElementById("authBadge"),
  claimBadge:    document.getElementById("claimBadge"),
  hintText:      document.getElementById("hintText"),
  claimBtn:      document.getElementById("claimBtn"),
  message:       document.getElementById("message"),
  adminCard:     document.getElementById("adminCard"),
  memberInput:   document.getElementById("memberInput"),
  authorizeBtn:  document.getElementById("authorizeBtn"),
  logList:       document.getElementById("logList"),
  memberList:    document.getElementById("memberList")
};


// ------------------------------------------------------------
// 3. HÀM TIỆN ÍCH
// ------------------------------------------------------------

// Rút gọn địa chỉ: 0x1234...abcd
function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

// Hiện thông báo cho người dùng (isError = true thì tô đỏ)
function showMessage(text, isError = false) {
  el.message.textContent = text;
  el.message.className = isError ? "error" : "success";
}

// Lấy nội dung lỗi dễ hiểu từ lỗi của ethers/MetaMask
function getErrorText(error) {
  return error.reason || error.shortMessage || error.message || "Có lỗi xảy ra";
}

// Thêm một dòng vào nhật ký sự kiện
function addLog(text) {
  // Xóa dòng "Chưa có sự kiện" ở lần đầu
  const first = el.logList.firstElementChild;
  if (first && first.classList.contains("muted")) {
    el.logList.innerHTML = "";
  }

  const item = document.createElement("li");
  const time = new Date().toLocaleTimeString("vi-VN");
  item.textContent = time + " – " + text;
  el.logList.prepend(item);
}


// ------------------------------------------------------------
// 4. KẾT NỐI VÍ METAMASK
// ------------------------------------------------------------
async function connectWallet() {
  if (!window.ethereum) {
    showMessage("Chưa có MetaMask. Hãy cài tiện ích ví để tiếp tục.", true);
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);

    // Luôn hiện bảng chọn tài khoản để người dùng chọn đúng ví
    try {
      await provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]);
    } catch (error) {
      if (error.code === 4001) {
        showMessage("Bạn đã hủy chọn tài khoản.", true);
        return;
      }
    }

    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    // Hiển thị tên mạng và địa chỉ ví
    const network = await provider.getNetwork();
    const networkName = network.name === "unknown" ? "chainId " + network.chainId : network.name;
    el.networkBadge.textContent = "Mạng: " + networkName;
    el.walletText.textContent = "Ví: " + shortAddress(userAddress);
    el.connectBtn.textContent = "Đã kết nối";

    // Khi đổi tài khoản hoặc đổi mạng trong MetaMask thì tải lại trang
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());

    // Nếu đã có địa chỉ contract thì tải luôn
    if (el.contractInput.value) {
      await loadContract();
    }
  } catch (error) {
    showMessage(getErrorText(error), true);
  }
}


// ------------------------------------------------------------
// 5. TẢI HỢP ĐỒNG
// ------------------------------------------------------------
async function loadContract() {
  if (!signer) {
    showMessage("Hãy kết nối ví trước.", true);
    return;
  }

  const address = el.contractInput.value.trim();
  if (!ethers.isAddress(address)) {
    showMessage("Địa chỉ hợp đồng không hợp lệ.", true);
    return;
  }

  try {
    // Gỡ listener của contract cũ để nhật ký không bị ghi lặp
    if (contract) {
      await contract.removeAllListeners();
    }

    contract = new ethers.Contract(address, CONTRACT_ABI, signer);

    // Gọi thử một hàm đọc để chắc chắn đúng contract, đúng mạng
    await contract.manager();

    listenToEvents();
    await refreshUI();
    showMessage("Đã tải hợp đồng.");
  } catch (error) {
    contract = null;
    showMessage("Không đọc được hợp đồng. Kiểm tra địa chỉ và mạng Sepolia.", true);
  }
}


// ------------------------------------------------------------
// 6. CẬP NHẬT GIAO DIỆN TỪ DỮ LIỆU TRÊN BLOCKCHAIN
// ------------------------------------------------------------
async function refreshUI() {
  // Đọc đồng thời các giá trị cần thiết (hàm đọc, không tốn gas)
  const [remaining, claimed, isAuthorized, hasClaimed, managerAddress] = await Promise.all([
    contract.getRemainingSupply(),
    contract.totalClaimed(),
    contract.isAuthorized(userAddress),
    contract.hasClaimed(userAddress),
    contract.manager()
  ]);

  // --- Nguồn cung ---
  el.remainingText.textContent = remaining;
  el.claimedText.textContent = claimed;
  drawVault(Number(claimed));

  // --- Quyền nhận ---
  el.authBadge.textContent = "Quyền: " + (isAuthorized ? "đã được xác nhận" : "chưa được xác nhận");
  el.authBadge.className = "badge " + (isAuthorized ? "ok" : "bad");

  el.claimBadge.textContent = "Trạng thái: " + (hasClaimed ? "đã nhận" : "chưa nhận");
  el.claimBadge.className = "badge " + (hasClaimed ? "ok" : "");

  // --- Nút nhận: chỉ bật khi đủ cả 3 điều kiện ---
  const soldOut = remaining === 0n;
  el.claimBtn.disabled = !(isAuthorized && !hasClaimed && !soldOut);

  // --- Dòng gợi ý ---
  if (soldOut) {
    el.hintText.textContent = "Đã hết vật phẩm.";
  } else if (hasClaimed) {
    el.hintText.textContent = "Bạn đã nhận vật phẩm của mình.";
  } else if (isAuthorized) {
    el.hintText.textContent = "Bạn đủ điều kiện, hãy nhận ngay.";
  } else {
    el.hintText.textContent = "Hãy nhờ quản lý xác nhận ví này.";
  }

  // --- Khung quản lý: chỉ hiện khi ví hiện tại là quản lý ---
  const isManager = managerAddress.toLowerCase() === userAddress.toLowerCase();
  el.adminCard.hidden = !isManager;
}

// Liệt kê các ví đã được xác nhận bằng cách đọc lại sự kiện MemberAuthorized
async function loadMembers() {
  try {
    const events = await contract.queryFilter(contract.filters.MemberAuthorized(), DEPLOY_BLOCK, "latest");

    // Lấy danh sách địa chỉ không trùng lặp
    const addresses = [...new Set(events.map((e) => e.args.member))];

    el.memberList.innerHTML = "";
    let count = 0;

    for (const address of addresses) {
      // Bỏ qua ví đã bị thu hồi quyền
      if (!(await contract.isAuthorized(address))) continue;

      const claimed = await contract.hasClaimed(address);
      const isMe = address.toLowerCase() === userAddress.toLowerCase();

      const item = document.createElement("li");
      item.textContent = address + (isMe ? " (ví của bạn)" : "") + " – " + (claimed ? "đã nhận" : "chưa nhận");
      el.memberList.appendChild(item);
      count++;
    }

    if (count === 0) {
      el.memberList.innerHTML = '<li class="muted">Chưa có ví nào được xác nhận.</li>';
    }
  } catch (error) {
    el.memberList.innerHTML = '<li class="muted">Không đọc được danh sách thành viên.</li>';
  }
}

// Vẽ bản đồ 100 ô: ô sáng là vật phẩm đã được phát hành
function drawVault(claimedCount) {
  el.vault.innerHTML = "";
  for (let i = 1; i <= MAX_SUPPLY; i++) {
    const cell = document.createElement("i");
    if (i <= claimedCount) {
      cell.className = "taken";
    }
    cell.title = "Vật phẩm #" + i;
    el.vault.appendChild(cell);
  }
}


// ------------------------------------------------------------
// 7. HÀNH ĐỘNG: NHẬN VẬT PHẨM (thành viên)
// ------------------------------------------------------------
async function claimCollectible() {
  try {
    el.claimBtn.disabled = true;
    showMessage("Đang chờ xác nhận trong ví...");

    const tx = await contract.claimCollectible();   // MetaMask hiện popup ký
    showMessage("Đang ghi lên blockchain...");
    await tx.wait();                                // đợi giao dịch được đưa vào khối

    showMessage("Đã nhận vật phẩm.");
    addLog("Giao dịch nhận: " + shortAddress(tx.hash));
    await refreshUI();
  } catch (error) {
    showMessage(getErrorText(error), true);
    await refreshUI();
  }
}


// ------------------------------------------------------------
// 8. HÀNH ĐỘNG: XÁC NHẬN THÀNH VIÊN (quản lý)
// ------------------------------------------------------------
async function authorizeMembers() {
  // Tách danh sách địa chỉ theo dấu phẩy
  const addresses = el.memberInput.value
    .split(",")
    .map((text) => text.trim())
    .filter((text) => text !== "");

  if (addresses.length === 0 || !addresses.every(ethers.isAddress)) {
    showMessage("Có địa chỉ ví không hợp lệ.", true);
    return;
  }

  try {
    showMessage("Đang gửi giao dịch xác nhận...");

    // 1 ví: gọi authorizeMember; nhiều ví: gọi authorizeMembers
    const tx = addresses.length === 1
      ? await contract.authorizeMember(addresses[0])
      : await contract.authorizeMembers(addresses);

    await tx.wait();
    showMessage("Đã xác nhận " + addresses.length + " thành viên.");
    el.memberInput.value = "";
    await refreshUI();
  } catch (error) {
    showMessage(getErrorText(error), true);
  }
}


// ------------------------------------------------------------
// 9. LẮNG NGHE SỰ KIỆN TỪ CONTRACT (cập nhật theo thời gian thực)
// ------------------------------------------------------------
function listenToEvents() {
  // Gỡ listener cũ để không bị lặp khi bấm "Tải hợp đồng" nhiều lần
  contract.removeAllListeners();

  contract.on("CollectibleClaimed", (member, tokenId) => {
    addLog("Vật phẩm #" + tokenId + " được nhận bởi " + shortAddress(member));
    refreshUI();
  });

  contract.on("MemberAuthorized", (member) => {
    addLog("Đã xác nhận thành viên " + shortAddress(member));
    refreshUI();
  });
}


// ------------------------------------------------------------
// 10. GẮN SỰ KIỆN CHO CÁC NÚT VÀ KHỞI TẠO
// ------------------------------------------------------------
el.contractInput.value = CONTRACT_ADDRESS;   // điền sẵn địa chỉ từ config.js

el.connectBtn.addEventListener("click", connectWallet);
el.loadBtn.addEventListener("click", loadContract);
el.claimBtn.addEventListener("click", claimCollectible);
el.authorizeBtn.addEventListener("click", authorizeMembers);

drawVault(0);   // vẽ bản đồ trống ban đầu