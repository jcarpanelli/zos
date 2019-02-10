pragma solidity ^0.5.0;

contract MockContract {

  string public foo;
  function setFoo(string memory _foo) public returns (string memory) {
    foo = _foo;
    return foo;
  }
}
