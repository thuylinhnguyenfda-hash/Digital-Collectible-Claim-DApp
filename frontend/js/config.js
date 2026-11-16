// ============================================================
// CẤU HÌNH DAPP
// Chỉ cần sửa file này khi deploy lại contract.
// ============================================================

// Địa chỉ contract sau khi deploy (in ra bởi scripts/deploy.ts)
const CONTRACT_ADDRESS = "0xef96c69e6d97c94A370af2055d7E1310774785D3";

// Tổng số vật phẩm (khớp với MAX_SUPPLY trong contract)
const MAX_SUPPLY = 100;

// Số khối lúc deploy (xem ở Etherscan, mục Block của giao dịch Contract Creation).
// Để 0 nếu không biết; điền số khối thật sẽ đọc danh sách nhanh hơn.
const DEPLOY_BLOCK = 0;

// ABI: bảng mô tả các hàm và sự kiện của contract
// để ethers.js biết cách gọi. Viết dạng chuỗi cho dễ đọc.
const CONTRACT_ABI = [
  // --- Hàm ghi (tốn gas, cần ký bằng ví) ---
  "function authorizeMember(address member)",
  "function authorizeMembers(address[] members)",
  "function claimCollectible()",

  // --- Hàm đọc (miễn phí) ---
  "function hasClaimed(address user) view returns (bool)",
  "function getRemainingSupply() view returns (uint256)",
  "function totalClaimed() view returns (uint256)",
  "function isAuthorized(address) view returns (bool)",
  "function manager() view returns (address)",

  // --- Sự kiện ---
  "event MemberAuthorized(address indexed member)",
  "event CollectibleClaimed(address indexed member, uint256 indexed tokenId)"
];