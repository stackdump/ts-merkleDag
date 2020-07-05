"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleDag = void 0;
const crypto_1 = require("crypto");
var Element;
(function (Element) {
    Element[Element["sink"] = 0] = "sink";
    Element[Element["source"] = 1] = "source";
})(Element || (Element = {}));
class MerkleDag {
    constructor(size, hashAlgorithm) {
        this.graph = {
            nodes: new Array(),
            edges: new Array(),
        };
        this.md = new Array(size).fill(null);
        if (hashAlgorithm) {
            this.hashType = hashAlgorithm;
        }
        else {
            this.hashType = "sha256";
        }
    }
    appendTree(next, n) {
        const prev = next;
        next = {
            label: n.label + "+" + prev.label,
            type: Element.sink,
            digest: this.weld(n.digest, prev.digest).digest()
        };
        this.graph.edges.push({ source: n, target: next });
        this.graph.edges.push({ source: prev, target: next });
        return next;
    }
    append(hash, label) {
        this.depth++;
        let next = {
            idx: 0,
            offset: this.depth,
            type: Element.source,
            digest: hash.digest(),
            label: label,
        };
        this.md.forEach((n, offset) => {
            if (next) {
                if (n) {
                    this.md[offset] = null;
                    this.graph.nodes.push(next);
                    next = this.appendTree(next, n);
                }
                else {
                    this.graph.nodes.push(next);
                    this.md[offset] = next;
                    next = null;
                }
            }
        });
        return [null, this.depth];
    }
    hash() {
        return crypto_1.createHash(this.hashType);
    }
    weld(lHash, rHash) {
        const sum = crypto_1.createHash(this.hashType);
        sum.write(lHash);
        sum.write(rHash);
        return sum;
    }
    // close out the state vector returning merkle root
    truncateRoot() {
        let next = null;
        this.md.forEach((n, offset) => {
            if (n) {
                if (next) {
                    this.md[offset] = null;
                    next = this.appendTree(next, n);
                    this.graph.nodes.push(next);
                }
                else {
                    next = n;
                }
            }
        });
        return next.digest;
    }
    printGraph() {
        let out = "";
        this.graph.nodes.forEach((n, idx) => {
            n.idx = idx;
            if (n.type == Element.source) {
                out += idx + " {color: red, label: " + n.label + "}\n";
            }
            else {
                out += idx + " {color: blue, label: " + n.label + "}\n";
            }
        });
        this.graph.edges.forEach((e) => {
            out += e.source.idx + " -> " + e.target.idx + "\n";
        });
        return out;
    }
}
exports.MerkleDag = MerkleDag;
//# sourceMappingURL=index.js.map