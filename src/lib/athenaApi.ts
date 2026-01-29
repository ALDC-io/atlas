/**
 * Athena Knowledge Graph API Client
 *
 * Provides progressive loading of Zeus memories using semantic zoom:
 * - L2 clusters (domain-level, ~385 clusters)
 * - L1 clusters (topic-level, ~3,264 clusters)
 * - Individual memories (50K+ with pagination)
 */

const ATHENA_API_URL = process.env.NEXT_PUBLIC_ATHENA_API_URL || "https://athena.aldc.io";

export interface ClusterInfo {
    id: string;
    x: number;
    y: number;
    size: number;
    label: string;
    color?: string;
}

export interface MemoryInfo {
    id: string;
    x: number;
    y: number;
    content_preview: string;
    category: string;
    cluster_l1: string;
    cluster_l2: string;
}

export interface L2OverviewResponse {
    total_clusters: number;
    total_memories: number;
    clusters: ClusterInfo[];
}

export interface L2DetailResponse {
    cluster_id: string;
    cluster_label: string;
    l1_clusters: ClusterInfo[];
}

export interface L1DetailResponse {
    cluster_id: string;
    cluster_label: string;
    total_memories: number;
    memories: MemoryInfo[];
    has_more: boolean;
}

export interface MemoryDetailResponse {
    id: string;
    content: string;
    category: string;
    source: string;
    created_at: string;
    cluster_l1: string;
    cluster_l2: string;
    metadata: Record<string, unknown>;
}

export interface StatsResponse {
    total_memories: number;
    total_l1_clusters: number;
    total_l2_clusters: number;
    data_loaded: boolean;
}

export interface SearchResult {
    id: string;
    content_preview: string;
    category: string;
    cluster_l1: string;
    cluster_l1_label: string;
    cluster_l2: string;
    cluster_l2_label: string;
    x: number;
    y: number;
}

export interface SearchResponse {
    query: string;
    total_results: number;
    results: SearchResult[];
}

/**
 * Get overview of all L2 (domain) clusters
 * Use for initial zoomed-out view
 */
export async function getOverview(): Promise<L2OverviewResponse> {
    const response = await fetch(`${ATHENA_API_URL}/api/overview`);
    if (!response.ok) {
        throw new Error(`Failed to fetch overview: ${response.status}`);
    }
    return response.json();
}

/**
 * Get L1 clusters within a specific L2 cluster
 * Use when user clicks/zooms into an L2 cluster
 */
export async function getL2Detail(clusterId: string): Promise<L2DetailResponse> {
    const response = await fetch(`${ATHENA_API_URL}/api/l2/${clusterId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch L2 detail: ${response.status}`);
    }
    return response.json();
}

/**
 * Get memories within a specific L1 cluster
 * Use when user clicks/zooms into an L1 cluster
 */
export async function getL1Detail(
    clusterId: string,
    limit: number = 100,
    offset: number = 0
): Promise<L1DetailResponse> {
    const response = await fetch(
        `${ATHENA_API_URL}/api/l1/${clusterId}?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch L1 detail: ${response.status}`);
    }
    return response.json();
}

/**
 * Get full details of a specific memory
 * Use when user clicks on an individual memory node
 */
export async function getMemoryDetail(memoryId: string): Promise<MemoryDetailResponse> {
    const response = await fetch(`${ATHENA_API_URL}/api/memory/${memoryId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch memory detail: ${response.status}`);
    }
    return response.json();
}

/**
 * Get statistics about loaded data
 */
export async function getStats(): Promise<StatsResponse> {
    const response = await fetch(`${ATHENA_API_URL}/api/stats`);
    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    return response.json();
}

/**
 * Search memories by content
 * Returns matching memories with their cluster hierarchy info
 */
export async function searchMemories(query: string, limit: number = 20): Promise<SearchResponse> {
    const response = await fetch(
        `${ATHENA_API_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!response.ok) {
        throw new Error(`Failed to search: ${response.status}`);
    }
    return response.json();
}

// Color palette for cluster visualization
export const CLUSTER_COLORS: Record<string, string> = {
    decision: "#1a365d",
    cce_decision_log: "#2f855a",
    cce_research: "#3182ce",
    cce_failed_approach: "#e53e3e",
    cce_success_log: "#38a169",
    cce_system: "#805ad5",
    cce: "#d69e2e",
    architecture: "#dd6b20",
    default: "#718096",
};

export function getCategoryColor(category: string): string {
    return CLUSTER_COLORS[category] || CLUSTER_COLORS.default;
}
