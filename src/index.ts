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
    truncateRoot(): Hash {
        return null;
    }

    printGraph(): string {
        let out = "";
        const nodeIds: Map<string, number> = new Map<string,number>();

        this.graph.nodes.forEach((n: Node, idx: number) => {
            n.idx = idx;
            nodeIds.set(n.digest.toString("hex"), idx);
            if (n.type == Element.source) {
                out += idx+" {color: red, label: "+n.label+"}\n";
            } else {
                out += idx+" {color: blue, label: "+n.label+"}\n";
            }
        });
        this.graph.edges.forEach((e: Edge, idx: number) => {
            out += e.source.idx+" -> "+e.target.idx+"\n";
        });
        return out;
    }

}
