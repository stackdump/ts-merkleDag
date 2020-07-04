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

export class MerkelDag {
    md: Array<Node>
    graph: Graph
    ledger: Array<Node>

    constructor(size: number) {
        this.graph = {
            nodes: new Array<Node>(),
            edges: new Array<Edge>(),
        };
        this.md  = new Array<Node>(size).fill(null);
        this.ledger  = new Array<Node>();
    }

    append(hash: Hash, label: string): [Error, number] {
        const id: number = this.ledger.length+1;
        let next: Node = {
            idx: 0,
            offset: id,
            type: Element.source,
            digest: hash.digest(),
            label: label,
        };
        this.ledger.push(next);
        this.md.forEach((n, offset) => {
            if (next) {
                if (n) {
                    const prev: Node = next;
                    next = {
                        label: n.label+"+"+prev.label,
                        type: Element.sink,
                        digest: this.weld(n.digest,prev.digest).digest()
                    };
                    this.md[offset] = null;
                    this.graph.nodes.push(prev);
                    this.graph.edges.push({source: n, target: next});
                    this.graph.edges.push({source: prev, target: next});
                } else {
                    this.graph.nodes.push(next);
                    this.md[offset] = next;
                    next = null;
                }
            }
        });

        return [null, id];
    }

    hash(): Hash {
        return createHash("sha256");
    }

    weld(lHash: Buffer, rHash: Buffer): Hash {
        const sum = createHash("sha256");
        sum.write(lHash);
        sum.write(rHash);
        return sum;
    }

    // close out the merkel state vector
    // return the root
    truncateRoot(): Buffer {
        let next: Node = null;
        let prev: Node = null;
        this.md.forEach((n: Node, offset) => {
            if (!n) {
                return;
            }
            if (n && !next) {
                next = n;
                return;
            }
            if (next && n) {
                prev = next;
                next = {
                    label: n.label+"+"+prev.label,
                    type: Element.sink,
                    digest: this.weld(n.digest,prev.digest).digest()
                };
                this.md[offset] = null;
                this.graph.nodes.push(next);
                this.graph.edges.push({source: n, target: next});
                this.graph.edges.push({source: prev, target: next});
                return;
            }
            throw Error("unexpected");
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
