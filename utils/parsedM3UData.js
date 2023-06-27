class ParsedM3UData {
    constructor() {
        this.data = {};
    }

    get() {
        return this.data;
    }

    set(data) {
        this.data = data;
        return this.data;
    }
}

module.exports = new ParsedM3UData();
