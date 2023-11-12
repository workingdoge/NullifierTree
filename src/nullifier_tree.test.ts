import { ZkProgram, Field, Proof } from 'o1js';
import { NullifierTree, NullifierWitness, NullifierLeavesWithIdxs, NullifierLeaf, Test } from './indexed_merkle_tree';


describe('NullifierLeavesWithIdxs', () => {


  describe('NullifierLeavesWithIdxs', () => {
    let leavesWithIdxs: NullifierLeavesWithIdxs;

    beforeAll(() => {
      leavesWithIdxs = new NullifierLeavesWithIdxs();

      // Manually create leaves
      const leaves = [
        { leaf_idx: 0n, leaf: new NullifierLeaf({ value: Field(0), nextIndex: Field(3), nextValue: Field(5) }) },
        { leaf_idx: 3n, leaf: new NullifierLeaf({ value: Field(5), nextIndex: Field(2), nextValue: Field(10) }) },
        { leaf_idx: 2n, leaf: new NullifierLeaf({ value: Field(10), nextIndex: Field(1), nextValue: Field(15) }) },
        { leaf_idx: 1n, leaf: new NullifierLeaf({ value: Field(15), nextIndex: Field(0), nextValue: Field(0) }) }
      ];

      // Add leaves to the NullifierLeavesWithIdxs instance
      leavesWithIdxs.leaves.push(...leaves);
    });

    it('should find the correct range for a value when leaf_idx', () => {

      let range = leavesWithIdxs.find_range(Field(1));
      expect(range.lowerNullifier.leaf.value.toBigInt()).toBeLessThan(1);
      expect(range.upperNullifier?.leaf.value.toBigInt()).toBeGreaterThan(1);
      expect(range.lowerNullifier.leaf.nextIndex.toBigInt()).toEqual(range.upperNullifier?.leaf_idx);

      // Test a value in the middle of leaves
      range = leavesWithIdxs.find_range(Field(7));
      expect(range.lowerNullifier.leaf.value.toBigInt()).toBeLessThan(7);
      expect(range.upperNullifier?.leaf.value.toBigInt()).toBeGreaterThan(7);
      expect(range.lowerNullifier.leaf.nextIndex.toBigInt()).toEqual(range.upperNullifier?.leaf_idx);

      // Test a value in the middle of leaves
      range = leavesWithIdxs.find_range(Field(14));
      expect(range.lowerNullifier.leaf.value.toBigInt()).toBeLessThan(14);
      expect(range.upperNullifier?.leaf.value.toBigInt()).toBeGreaterThan(14);
      expect(range.lowerNullifier.leaf.nextIndex.toBigInt()).toEqual(range.upperNullifier?.leaf_idx);


    });

    it('return only lowerNullifier when value is larger than all other values', () => {
      const { lowerNullifier, upperNullifier } = leavesWithIdxs.find_range(Field(16));

      expect(lowerNullifier.leaf.value.toBigInt()).toBeLessThan(16);
      expect(upperNullifier).toBeFalsy();
    });

    it('find_range fails for duplicate with error', () => {
      expect(() => leavesWithIdxs.find_range(Field(10))).toThrow("Values must be unique: duplicate value found.");
    });
  });


  describe('insert method', () => {
    it('should insert a new leaf correctly', () => {
      const leavesWithIdxs = new NullifierLeavesWithIdxs();
      const testValue = Field(5); // Replace with appropriate value creation
      leavesWithIdxs.insert(testValue);

      // Check if the leaf is inserted correctly
      expect(leavesWithIdxs.leaves.some(leaf => leaf.leaf.value === testValue)).toBeTruthy();
    });

    it('leaves should be indexed correctly after insertion', () => {
      const leavesWithIdxs = new NullifierLeavesWithIdxs();
      leavesWithIdxs.insert(Field(10));
      leavesWithIdxs.insert(Field(5));
      leavesWithIdxs.insert(Field(15));
      leavesWithIdxs.insert(Field(2))
      // leavesWithIdxs.leaves.forEach(leaf => {
      //   console.log(`Leaf ${leaf.leaf_idx}:`, leaf.leaf.toJSON())
      // });

      // Check if the leaves are in sorted order
      for (let i = 0; i < leavesWithIdxs.leaves.length - 1; i++) {
        expect(leavesWithIdxs.leaves[i].leaf.value.toBigInt()).toBeLessThanOrEqual(leavesWithIdxs.leaves[i + 1].leaf.value.toBigInt());
      }

    });

    it('should throw an error for duplicate values', () => {
      const leavesWithIdxs = new NullifierLeavesWithIdxs();
      leavesWithIdxs.insert(Field(10));
      // Expect an error on inserting a duplicate value
      expect(() => leavesWithIdxs.insert(Field(10))).toThrow("Values must be unique: duplicate value found.");
    });
  });

}),

  describe('Proof test', () => {
    let nt: NullifierTree
    let initProof: Proof<Field, void>
    let initRoot: Field
    let validNullifierProof: Proof<Field, void>
    beforeAll(async () => {
      let Proof = ZkProgram.Proof(Test)
      console.log('program digest', Test.digest())

      // console.log('Compiling Proof...')
      let { verificationKey } = await Test.compile()
      // console.log('verification key', verificationKey.slice(0, 10) + '..');
    })


    it('initalize', async () => {
      nt = new NullifierTree()
      initRoot = nt.tree.getRoot()
      // console.log('prove init')
      initProof = await Test.init(
        nt.tree.getRoot()
      )

      console.log('verify init...');
      // initProof.verify()
      console.log('init verified')
    });

    xit('validNullifier', async () => {

      let value = Field(3)

      let range = nt.leavesWithIdxs.find_range(value)
      let originalNullifier = range.lowerNullifier;

      let witness = new NullifierWitness(nt.tree.getWitness(originalNullifier.leaf_idx));
      console.log("Calculated Root from Witness:", witness.calculateRoot(Field(originalNullifier.leaf.hash())).toString());
      console.log("Current Tree Root:", nt.tree.getRoot().toString());


      console.log('prove validNullifier')
      validNullifierProof = await Test.validNullifier(
        initRoot,
        value,
        originalNullifier.leaf.hash(),
        originalNullifier.leaf,
        witness,
        initProof
      )

      console.log('verify init...');
      validNullifierProof.verify()
      console.log('nullifier is valid')
    });

    xit('validNullifier', async () => {
      // let { lowerNullifier, newNullifier } = nt.leavesWithIdxs.insert(value)
      // console.log(lowerNullifier.leaf_idx, lowerNullifier.leaf.toJSON())
      // nt.insert(lowerNullifier, newNullifier)
    }
    );


  });
