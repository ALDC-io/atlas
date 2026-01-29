export interface AtlasNode {
    id: string;
    title: string;
    content: string;
    parentId: string | null;
    children: string[];
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}

export interface AtlasRevision {
    id: string;
    nodeId: string;
    content: string;
    createdAt: string;
    createdBy: string;
    message?: string;
}

export interface AtlasTreeState {
    nodes: Record<string, AtlasNode>;
    rootIds: string[];
    selectedNodeId: string | null;
    expandedIds: Set<string>;
    searchQuery: string;
    isLoading: boolean;
}

export interface AtlasDocumentState {
    editMode: boolean;
    draftContent: string;
    revisions: AtlasRevision[];
    showHistory: boolean;
    compareRevisionId: string | null;
}

export interface AtlasAgentState {
    isOpen: boolean;
    isProcessing: boolean;
    messages: AgentMessage[];
}

export interface AgentMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export type AgentAction = "create_document" | "propose_revision" | "create_subtopics";
