import batchedAdd from '@/libs/batchedAdd';

describe('batchedAdd.vue', () => {
    const outOfTickItems = (batchFn, itemCount, endFn) => {
        // Chain out of tick items so not to interfere
        // with the timeout within batchedAdd.js
        let count = 0;
        const nextTimeout = () => {
            count++;
            if (count > itemCount) {
                if (endFn) {
                    endFn();
                }
                return;
            }
            setTimeout(() => {
                batchFn('item' + count);
                nextTimeout();
            }, 10);
        };
        nextTimeout();
    };

    it('should return a batching function', () => {
        let batch = batchedAdd();
        expect(batch).toBeInstanceOf(Function);
    });

    it('should expose its queue', () => {
        let batch = batchedAdd();
        expect(batch.queue).toBeInstanceOf(Function);
        expect(batch.queue()).toEqual([]);
    });

    it('should process three items without a batch', () => {
        let itemCount = 0;
        let batchCalled = false;
        let singleItem = () => {
            itemCount++;
        };
        let batchItems = () => {
            batchCalled = true;
        };

        let batch = batchedAdd(singleItem, batchItems);
        batch('item1');
        batch('item2');
        batch('item3');

        expect(itemCount).toBe(3);
        expect(batchCalled).toBe(false);
    });

    it('should process 100 items on the same js tick without a batch', () => {
        let itemCount = 0;
        let batchCalled = false;
        let singleItem = () => {
            itemCount++;
        };
        let batchItems = () => {
            batchCalled = true;
        };

        let batch = batchedAdd(singleItem, batchItems);
        for (let i = 0; i < 100; i++) {
            batch('item' + i);
        }

        expect(itemCount).toBe(100);
        expect(batchCalled).toBe(false);
    });

    it('should process 102 single items, then a batch of 3', () => new Promise((resolve) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
        };
        let batchItems = (items) => {
            expect(singleCount).toBe(102);
            expect(items.length).toBeGreaterThan(1);
            resolve();
        };

        let batch = batchedAdd(singleItem, batchItems);
        for (let i = 0; i < 100; i++) {
            batch('item' + i);
        }
        outOfTickItems(batch, 5);
    }));

    it('should process a batched item after three single items on different js ticks', () => new Promise((resolve) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
            expect(singleCount).toBeLessThanOrEqual(3);
        };
        let batchItems = () => {
            expect(singleCount).toBe(3);
            resolve();
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 4);
    }));

    it('should process 3 items in a batch', () => new Promise((resolve) => {
        let singleItem = () => {};
        let batchItems = (items) => {
            expect(items.length).toBe(3);
            resolve();
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 6);
    }));

    it('should process a single item after a batch has finished', () => new Promise((resolve) => {
        let singleCount = 0;
        let batchCount = 0;
        let singleItem = () => {
            if (singleCount === 3 && batchCount === 1) {
                resolve();
            }
            singleCount++;
        };
        let batchItems = () => {
            expect(batchCount).toBe(0);
            batchCount++;
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 6, () => {
            setTimeout(() => {
                // Should revert back to being a single item
                batch('item7');
            }, 1200);
        });
    }));

    it('should process 4 single items', () => new Promise((resolve) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
            if (singleCount === 4) {
                expect(singleCount).toBe(4);
                resolve();
            }
        };
        let batchItems = () => {
            expect.unreachable('Items should not be batched');
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 3, () => {
            setTimeout(() => {
                // Should revert back to being a single item
                batch('item4');
            }, 1200);
        });
    }), 3000);
});
