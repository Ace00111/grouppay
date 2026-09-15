// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GroupPay {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    struct Group {
        address creator;
        string name;
        uint256 balance;
        bool active;
    }

    uint256 public nextGroupId = 1;
    mapping(uint256 => Group) public groups;

    event GroupCreated(uint256 indexed groupId, address indexed creator, string name);
    event FundsReceived(uint256 indexed groupId, address indexed from, uint256 amount, string note);
    event FundsSent(uint256 indexed groupId, address indexed to, uint256 amount, string note);
    event GroupClosed(uint256 indexed groupId, address indexed creator);

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier onlyCreator(uint256 groupId) {
        require(groups[groupId].creator == msg.sender, "Not creator");
        _;
    }

    modifier groupActive(uint256 groupId) {
        require(groups[groupId].active, "Group not active");
        _;
    }

    modifier groupExists(uint256 groupId) {
        require(groups[groupId].creator != address(0), "Group does not exist");
        _;
    }

    function createGroup(string calldata name) external returns (uint256) {
        uint256 groupId = nextGroupId++;
        groups[groupId] = Group({
            creator: msg.sender,
            name: name,
            balance: 0,
            active: true
        });

        emit GroupCreated(groupId, msg.sender, name);
        return groupId;
    }

    function deposit(uint256 groupId, string calldata note) external payable groupExists(groupId) groupActive(groupId) {
        require(msg.value > 0, "Deposit must be greater than 0");
        groups[groupId].balance += msg.value;
        emit FundsReceived(groupId, msg.sender, msg.value, note);
    }

    function send(uint256 groupId, address payable recipient, uint256 amount, string calldata note) 
        external 
        onlyCreator(groupId) 
        groupActive(groupId) 
        nonReentrant 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(groups[groupId].balance >= amount, "Insufficient balance");

        groups[groupId].balance -= amount;
        emit FundsSent(groupId, recipient, amount, note);

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function closeGroup(uint256 groupId) external onlyCreator(groupId) groupActive(groupId) nonReentrant {
        groups[groupId].active = false;
        uint256 remainingBalance = groups[groupId].balance;
        
        emit GroupClosed(groupId, msg.sender);
        
        if (remainingBalance > 0) {
            groups[groupId].balance = 0;
            (bool success, ) = payable(msg.sender).call{value: remainingBalance}("");
            require(success, "Transfer failed");
        }
    }

    function group(uint256 groupId) external view returns (address creator, string memory name, uint256 balance, bool active) {
        Group storage g = groups[groupId];
        return (g.creator, g.name, g.balance, g.active);
    }

    function balanceOf(uint256 groupId) external view returns (uint256) {
        return groups[groupId].balance;
    }
}
