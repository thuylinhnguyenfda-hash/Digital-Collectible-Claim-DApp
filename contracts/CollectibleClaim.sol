// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CollectibleClaim - Phát hành 100 vật phẩm kỷ niệm số miễn phí
/// @notice Chỉ quản lý (manager) được xác nhận thành viên; mỗi ví nhận tối đa 1 vật phẩm.
contract CollectibleClaim {
    uint256 public constant MAX_SUPPLY = 100;

    address public immutable manager;
    uint256 public totalClaimed;

    mapping(address => bool) public isAuthorized;
    mapping(address => bool) private _claimed;
    mapping(uint256 => address) public ownerOf; // tokenId (1..100) => chủ sở hữu

    event MemberAuthorized(address indexed member);
    event MemberRevoked(address indexed member);
    event CollectibleClaimed(address indexed member, uint256 indexed tokenId);

    modifier onlyManager() {
        require(msg.sender == manager, "Chi quan ly moi duoc phep");
        _;
    }

    constructor() {
        manager = msg.sender;
    }

    /// @notice Quản lý xác nhận một thành viên hợp lệ
    function authorizeMember(address member) external onlyManager {
        require(member != address(0), "Dia chi khong hop le");
        require(!isAuthorized[member], "Da duoc xac nhan");
        isAuthorized[member] = true;
        emit MemberAuthorized(member);
    }

    /// @notice Xác nhận nhiều thành viên cùng lúc (tiết kiệm giao dịch)
    function authorizeMembers(address[] calldata members) external onlyManager {
        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i];
            if (m != address(0) && !isAuthorized[m]) {
                isAuthorized[m] = true;
                emit MemberAuthorized(m);
            }
        }
    }

    /// @notice Quản lý thu hồi quyền nhận nếu thành viên chưa nhận
    function revokeMember(address member) external onlyManager {
        require(isAuthorized[member], "Chua duoc xac nhan");
        require(!_claimed[member], "Da nhan, khong the thu hoi");
        isAuthorized[member] = false;
        emit MemberRevoked(member);
    }

    /// @notice Thành viên đã xác nhận nhận 1 vật phẩm
    function claimCollectible() external {
        require(isAuthorized[msg.sender], "Chua duoc quan ly xac nhan");
        require(!_claimed[msg.sender], "Moi vi chi nhan 1 lan");
        require(totalClaimed < MAX_SUPPLY, "Da het vat pham");

        _claimed[msg.sender] = true; // cập nhật trạng thái trước (checks-effects)
        totalClaimed += 1;
        ownerOf[totalClaimed] = msg.sender;

        emit CollectibleClaimed(msg.sender, totalClaimed);
    }

    /// @notice Kiểm tra ví đã nhận chưa
    function hasClaimed(address user) external view returns (bool) {
        return _claimed[user];
    }

    /// @notice Số vật phẩm còn lại
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalClaimed;
    }
}  
