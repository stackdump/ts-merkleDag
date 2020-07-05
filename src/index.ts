import { Hash, createHash } from "crypto";

enum Element {
    sink,
    source
}

type Node = {
    label: string;
    digest: Buffer;
    type: Element;
    offset?: number;
    idx?: number;
}

type Edge = {
    source: Node;
    target: Node;
}

type Graph = {
    nodes: Array<Node>;
    edges: Array<Edge>;
}

export class MerkleDag {
    md: Array<Node>
    graph: Graph
    depth: number
    hashType: string

    constructor(size: number, hashAlgorithm?: string) {
        this.graph = {
            nodes: new Array<Node>(),
            edges: new Array<Edge>(),
        };
        this.md  = new Array<Node>(size).fill(null);
        if (hashAlgorithm) {
            this.hashType = hashAlgorithm;
        } else {
            this.hashType = "sha256";
        }
    }

    private appendTree(next: Node, n: Node): Node {
        const prev: Node = next;
        next = {
            label: n.label + "+" + prev.label,
            type: Element.sink,
            digest: this.weld(n.digest, prev.digest).digest()
        };
        this.graph.edges.push({source: n, target: next});
        this.graph.edges.push({source: prev, target: next});
        return next;
    }

    append(hash: Hash, label: string): [Error, number] {
        this.depth++;
        let next: Node = {
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
                } else {
                    this.graph.nodes.push(next);
                    this.md[offset] = next;
                    next = null;
                }
            }
        });
        return [null, this.depth];
    }

    hash(): Hash {
        return createHash(this.hashType);
    }

    weld(lHash: Buffer, rHash: Buffer): Hash {
        const sum = createHash(this.hashType);
        sum.write(lHash);
        sum.write(rHash);
        return sum;
    }

    // close out the state vector returning merkle root
    truncateRoot(): Buffer {
        let next: Node = null;
        this.md.forEach((n: Node, offset) => {
            if (n) {
                if (next) {
                    this.md[offset] = null;
                    next = this.appendTree(next, n);
                    this.graph.nodes.push(next);
                } else {
                    next = n;
                }
            }
        });
        return next.digest;
    }

    printGraph(): string {
        let out = "";
        this.graph.nodes.forEach((n: Node, idx: number) => {
            n.idx = idx;
            if (n.type == Element.source) {
                out += idx+" {color: red, label: "+n.label+"}\n";
            } else {
                out += idx+" {color: blue, label: "+n.label+"}\n";
            }
        });
        this.graph.edges.forEach((e: Edge) => {
            out += e.source.idx+" -> "+e.target.idx+"\n";
        });
        return out;
    }

}
