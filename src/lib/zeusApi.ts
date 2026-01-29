import type { AtlasNode, AtlasRevision } from "@/types/atlas";

const ZEUS_API_URL =
    process.env.NEXT_PUBLIC_ZEUS_API_URL || "https://zeus.aldc.io";

interface ZeusMemory {
    memory_id: string;
    content: string;
    source: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

interface ZeusSearchResult {
    results: ZeusMemory[];
    count: number;
}

export async function fetchAtlasNodes(
    apiKey: string
): Promise<Record<string, AtlasNode>> {
    const response = await fetch(`${ZEUS_API_URL}/api/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({
            query: "atlas-node",
            limit: 500,
            metadata_filter: { type: "atlas-node" },
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch nodes: ${response.statusText}`);
    }

    const data: ZeusSearchResult = await response.json();

    const nodes: Record<string, AtlasNode> = {};
    for (const memory of data.results) {
        const meta = memory.metadata as {
            title?: string;
            parentId?: string | null;
            children?: string[];
        };

        nodes[memory.memory_id] = {
            id: memory.memory_id,
            title: meta.title || "Untitled",
            content: memory.content,
            parentId: meta.parentId || null,
            children: meta.children || [],
            createdAt: memory.created_at,
            updatedAt: memory.created_at,
            metadata: memory.metadata,
        };
    }

    return nodes;
}

export async function createAtlasNode(
    apiKey: string,
    title: string,
    content: string,
    parentId: string | null
): Promise<AtlasNode> {
    const response = await fetch(`${ZEUS_API_URL}/api/store`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({
            content,
            source: "atlas",
            metadata: {
                type: "atlas-node",
                title,
                parentId,
                children: [],
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create node: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        id: data.memory_id,
        title,
        content,
        parentId,
        children: [],
        createdAt: data.created_at,
        updatedAt: data.created_at,
    };
}

export async function updateAtlasNode(
    apiKey: string,
    nodeId: string,
    content: string,
    title?: string
): Promise<void> {
    // Zeus Memory doesn't have direct update - we store a new version
    // and track revisions via metadata
    const response = await fetch(`${ZEUS_API_URL}/api/store`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({
            content,
            source: "atlas",
            metadata: {
                type: "atlas-revision",
                nodeId,
                title,
                timestamp: new Date().toISOString(),
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to update node: ${response.statusText}`);
    }
}

export async function deleteAtlasNode(
    apiKey: string,
    nodeId: string
): Promise<void> {
    const response = await fetch(`${ZEUS_API_URL}/api/memory/${nodeId}`, {
        method: "DELETE",
        headers: {
            "X-API-Key": apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to delete node: ${response.statusText}`);
    }
}

export async function fetchNodeRevisions(
    apiKey: string,
    nodeId: string
): Promise<AtlasRevision[]> {
    const response = await fetch(`${ZEUS_API_URL}/api/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({
            query: `atlas-revision nodeId:${nodeId}`,
            limit: 100,
            metadata_filter: { type: "atlas-revision", nodeId },
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch revisions: ${response.statusText}`);
    }

    const data: ZeusSearchResult = await response.json();

    return data.results.map((memory) => ({
        id: memory.memory_id,
        nodeId,
        content: memory.content,
        createdAt: memory.created_at,
        createdBy: "user",
        message: (memory.metadata as { message?: string })?.message,
    }));
}

export async function callClaudeAgent(
    apiKey: string,
    action: string,
    context: {
        nodeTitle?: string;
        nodeContent?: string;
        parentContext?: string;
    }
): Promise<string> {
    // This will call the Zeus API's Claude integration endpoint
    // For now, return a placeholder - will integrate with actual Claude API
    const response = await fetch(`${ZEUS_API_URL}/api/claude/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({
            action,
            context,
        }),
    });

    if (!response.ok) {
        // Fallback for development
        return `Generated content for action: ${action}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    }

    const data = await response.json();
    return data.content;
}
