

- more efficient proofs

- two tree model -> one tree for storing (commitments to) data 
                 -> another tree for signalling if data is stale (nullifier tree)
      - consuming data emits a nullifier
      - nullifier has a deterministic derivation from original state

- legacy approach: sparse merkle trees
  - updatable merkle tree with as many leaves as values
  - membership proofs for null values
  - tree blows up in size (2**254) (lots of hashing)

-  use a linked list of nodes to prove what is missing

Node 1 -- next higher value --> Node 2
1 -> 10 (then 2-9 doesn't exist)

- we extend append only trees
  - at each leaf we store 3 values
  - Val
  - Next index
  - Next Value
- Val -> nextVal will have nothing in it
- we have a proof of non-inclusion of a value $x$ by a proof of inclusion of a node where val < $x$ < nextVal
