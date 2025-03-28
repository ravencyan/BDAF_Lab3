//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

// interface IERC20 {
//     function transfer(address receiver, uint amount) external returns (bool);
//     function balanceOf(address account) external view returns (uint256);
// }

contract ERC20Token is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply);
    }
}

contract WithdrawContract {
    address owner;

    event ERC20TokenWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address _owner) {
        owner = _owner;
    }

    modifier ownerOnly() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    function withdraw(address _token, uint256 _amount) external ownerOnly {
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _amount, "Not enough token");
        require(token.transfer(msg.sender, _amount), "Transfer failed");
        emit ERC20TokenWithdrawn(_token, msg.sender, _amount);
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}

contract Factory {
    event ContractDeployed(address indexed contractAddress);

    function deploy(bytes32 salt, address _owner) external {
        // Deploy the contract using CREATE2
        address deployedAddress;
        bytes memory bytecode = abi.encodePacked(
            type(WithdrawContract).creationCode,
            abi.encode(_owner)
        );

        deployedAddress = Create2.deploy(0, salt, bytecode);

        require(deployedAddress != address(0), "Deployment failed");
        emit ContractDeployed(deployedAddress);
    }

    function computeAddress(bytes32 salt, address _owner) external view returns (address) { //bytes memory bytecode
        bytes memory bytecode = abi.encodePacked(
            type(WithdrawContract).creationCode,
            abi.encode(_owner)
        );
        return Create2.computeAddress(salt, keccak256(bytecode));
    }
}