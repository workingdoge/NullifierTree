import { Field, MerkleTree, Struct, Poseidon, ZkProgram, MerkleWitness, SelfProof, Empty } from "o1js";

export class NullifierLeaf extends Struct({
  value: Field, // Assuming the value is of type Field
  nextIndex: Field, // Index of the next leaf
  nextValue: Field, // Value of the next leaf
}) {
  static empty() {
    return new NullifierLeaf({
      value: Field(0),
      nextIndex: Field(0),
      nextValue: Field(0),
    })
  }

  hash(): Field {
    return Poseidon.hash(NullifierLeaf.toFields(this));
  }

  toJSON() {
    return {
      value: this.value.toJSON(),
      nextIdx: this.nextIndex.toJSON(),
      nextValue: this.nextValue.toJSON()
    }
  }
}

type NullifierTreeIdx = bigint
export type NullifierLeafWithIdx = { leaf_idx: NullifierTreeIdx, leaf: NullifierLeaf }

export class NullifierLeavesWithIdxs {
  // The unhashed leaves of the MerkleTree sorted by values
  // needed to track off-chain state
  leaves: NullifierLeafWithIdx[]
  constructor() {
    // this.last_merkle_leaf_idx = 0n
    this.leaves = [{ leaf_idx: 0n, leaf: NullifierLeaf.empty() }]
  }
  value_exists(value: Field): boolean {
    return this.leaves.some(leafWithIdx => leafWithIdx.leaf.value.equals(value).toBoolean());
  }

  find_range(value: Field): { lowerNullifier: NullifierLeafWithIdx, upperNullifier?: NullifierLeafWithIdx } {
    let low = 0;
    let high = this.leaves.length - 1;

    if (this.value_exists(value)) {
      throw new Error("Values must be unique: duplicate value found.");
    }

    let lowerNullifier = this.leaves[low];
    let upperNullifier = this.leaves[high];


    if (value.greaterThan(upperNullifier.leaf.value).toBoolean()) {
      return { lowerNullifier: upperNullifier }
    }

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const currentLeaf = this.leaves[mid];

      // Break if lowerNullifier and upperNullifier are next to each other
      if (lowerNullifier.leaf.nextIndex.equals(Field(upperNullifier.leaf_idx)).toBoolean()) {
        break;
      }

      if (value.greaterThan(currentLeaf.leaf.value).toBoolean()) {
        lowerNullifier = this.leaves[mid]; // Update upper nullifier
        low = mid + 1;
      } else {
        upperNullifier = this.leaves[mid]; // Update lower nullifier
        high = mid - 1;
      }
    }

    return { lowerNullifier, upperNullifier };

  }


  insert(value: Field): { lowerNullifier: NullifierLeafWithIdx, newNullifier: NullifierLeafWithIdx } {
    const range = this.find_range(value);

    const lowerNullifier = range.lowerNullifier;
    const upperNullifier = range.upperNullifier;

    // If the value is the highest, it will only have a lowerNullifier
    const insertPosition = upperNullifier ? this.leaves.indexOf(upperNullifier) : this.leaves.length;
    const newLeafIdx = insertPosition; // Use the insert position as the new index

    // Prepare the new leaf
    const newLeaf = new NullifierLeaf({
      value: value,
      nextIndex: upperNullifier ? Field(upperNullifier.leaf_idx) : Field(0n),
      nextValue: upperNullifier ? upperNullifier.leaf.value : Field(0),
    });

    // Insert the new nullifier at the determined position
    const newLeafWithIdx: NullifierLeafWithIdx = { leaf_idx: BigInt(this.leaves.length), leaf: newLeaf };
    this.leaves.splice(insertPosition, 0, newLeafWithIdx);

    // updated lowerNullifier
    this.leaves[insertPosition - 1].leaf.nextIndex = Field(this.leaves[insertPosition].leaf_idx)
    this.leaves[insertPosition - 1].leaf.nextValue = value


    return {
      lowerNullifier: lowerNullifier,
      newNullifier: this.leaves[newLeafIdx]
    };
  }


}

export class NullifierTree {
  tree: InstanceType<typeof MerkleTree>;
  leavesWithIdxs: NullifierLeavesWithIdxs;

  // ------------------------------------------------

  /**
   * Create a new, empty Indexed Merkle Tree
   * @returns a new IndexedMerkleTree
   */
  constructor() {
    this.tree = new MerkleTree(32)
    this.tree.setLeaf(
      0n,
      NullifierLeaf.empty().hash()
    )
    this.leavesWithIdxs = new NullifierLeavesWithIdxs()
  }

  // ------------------------------------------------

  insert(lowerNullifier: NullifierLeafWithIdx, newNullifier: NullifierLeafWithIdx): void {
    // Logic to update the tree at the given index with the new leaf.
    this.tree.setLeaf(lowerNullifier.leaf_idx, lowerNullifier.leaf.hash())
    this.tree.setLeaf(newNullifier.leaf_idx, newNullifier.leaf.hash())
  }
}

export class NullifierWitness extends MerkleWitness(32) { }

export const Test = ZkProgram({
  name: 'Test Nullifier Tree',
  publicInput: Field,

  methods: {
    init: {
      privateInputs: [],
      method(root: Field) {
        root.assertEquals(new NullifierTree().tree.getRoot())
      }
    },
    validNullifier: {
      privateInputs: [Field, Field, NullifierLeaf, NullifierWitness, SelfProof],
      method(root: Field, value: Field, leafHash: Field, leaf: NullifierLeaf, witness: NullifierWitness, nt_proof: SelfProof<Field, Empty>) {
        nt_proof.verify()

        // not sure this constraint is needed
        // root.assertEquals(nt_proof.publicInput)

        // check nullifier is located in nullifier tree
        witness.calculateRoot(leafHash).assertEquals(root)

        // check value is in range of nullifier
        // Proof.if leaf.value.equals(0) 
        // leaf.value.assertLessThan(value).or(leaf.value.assertEquals(Field(0)))
        // nt = new NullifierTree()
        value.assertLessThan(leaf.nextValue)

      }
    },
    insert: {
      privateInputs: [NullifierLeaf, NullifierWitness, SelfProof, SelfProof],
      method(updatedRoot: Field, newNullifier: NullifierLeaf, witness: NullifierWitness, validNullifierProof: SelfProof<Field, Empty>, nt_proof: SelfProof<Field, Empty>) {

        nt_proof.verify();
        validNullifierProof.verify();
        validNullifierProof.publicInput.assertEquals(nt_proof.publicInput)

      }

    }
  }
})


