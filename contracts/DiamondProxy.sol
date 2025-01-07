// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./DiamondStorage.sol";

interface IDiamondCut {
    struct FacetCut {
        address facetAddress;
        uint8 action;    // 0 = Add, 1 = Replace, 2 = Remove
        bytes4[] functionSelectors;
    }
}

contract DiamondProxy {
    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

    constructor() {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        // Initialize the owner to the deploying address
        ds.owner = msg.sender;
    }

    function diamondCut(
        IDiamondCut.FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        require(msg.sender == ds.owner, "Only owner can perform diamondCut");

        for(uint i = 0; i < _diamondCut.length; i++) {
            IDiamondCut.FacetCut memory cut = _diamondCut[i];
            for(uint j = 0; j < cut.functionSelectors.length; j++) {
                bytes4 selector = cut.functionSelectors[j];
                ds.selectorToFacet[selector] = cut.facetAddress;
            }
        }

        emit DiamondCut(_diamondCut, _init, _calldata);

        // Execute any initialization function if provided
        if(_init != address(0)) {
            (bool success, ) = _init.delegatecall(_calldata);
            require(success, "DiamondCut: _init function failed");
        }
    }

    fallback() external payable {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        address facet = ds.selectorToFacet[msg.sig];
        require(facet != address(0), "Diamond: Function does not exist");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
