export default class SortedArray {
    constructor(array, compare) {
        this.array = [];
        this.compare = compare;

        if (!array) {
            return;
        }
        array.forEach((val) => this.insert(val));
    }

    insert(val) {
        const items = (Array.isArray(val)) ? val : [val];
        const array = (items.length > 1) ? this.array.slice() : this.array;

        items.forEach((item) => {
            const pos = this.search(item);
            array.splice(pos, 0, item);
        });

        if (items.length > 1) {
            this.array = array;
        }
    }

    remove(val) {
        const pos = this.array.indexOf(val);
        if (pos > -1) {
            this.array.splice(pos, 1);
        }
    }

    search(val, _min, _max) {
        const len = this.array.length;
        const min = typeof _min !== 'undefined' ? _min : 0;
        const max = typeof _max !== 'undefined' ? _max : len - 1;
        const mid = min + Math.floor((max - min) / 2);

        if (len === 0) {
            return -1;
        }

        const com = this.compare(val, this.array[mid]);
        if (com === 0) {
            return mid;
        }

        if (mid === min && com === -1) {
            return mid;
        }

        if (mid === max && com === 1) {
            return mid + 1;
        }

        if (com === 1) {
            return this.search(val, mid + 1, max);
        }

        return this.search(val, min, mid - 1);
    }

    sort() {
        const array = this.array.slice();
        array.sort(this.compare);
        this.array = array;
    }

    get length() {
        return this.array.length;
    }
}
