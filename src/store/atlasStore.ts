import { create } from "zustand";
import type {
    AtlasNode,
    AtlasRevision,
    AgentMessage,
    AgentAction,
} from "@/types/atlas";

interface AtlasStore {
    // Tree State
    nodes: Record<string, AtlasNode>;
    rootIds: string[];
    selectedNodeId: string | null;
    expandedIds: Set<string>;
    searchQuery: string;
    isLoading: boolean;

    // Document State
    editMode: boolean;
    draftContent: string;
    revisions: AtlasRevision[];
    showHistory: boolean;
    compareRevisionId: string | null;

    // Agent State
    agentOpen: boolean;
    agentProcessing: boolean;
    agentMessages: AgentMessage[];

    // Tree Actions
    setNodes: (nodes: Record<string, AtlasNode>) => void;
    selectNode: (nodeId: string | null) => void;
    toggleExpanded: (nodeId: string) => void;
    setSearchQuery: (query: string) => void;
    addNode: (node: AtlasNode) => void;
    updateNode: (nodeId: string, updates: Partial<AtlasNode>) => void;
    deleteNode: (nodeId: string) => void;

    // Document Actions
    setEditMode: (mode: boolean) => void;
    setDraftContent: (content: string) => void;
    setRevisions: (revisions: AtlasRevision[]) => void;
    toggleHistory: () => void;
    setCompareRevision: (revisionId: string | null) => void;

    // Agent Actions
    toggleAgent: () => void;
    setAgentProcessing: (processing: boolean) => void;
    addAgentMessage: (message: AgentMessage) => void;
    clearAgentMessages: () => void;

    // Utility
    getSelectedNode: () => AtlasNode | null;
    getFilteredNodes: () => AtlasNode[];
}

export const useAtlasStore = create<AtlasStore>((set, get) => ({
    // Initial Tree State
    nodes: {},
    rootIds: [],
    selectedNodeId: null,
    expandedIds: new Set(),
    searchQuery: "",
    isLoading: false,

    // Initial Document State
    editMode: false,
    draftContent: "",
    revisions: [],
    showHistory: false,
    compareRevisionId: null,

    // Initial Agent State
    agentOpen: true,
    agentProcessing: false,
    agentMessages: [],

    // Tree Actions
    setNodes: (nodes) => {
        const rootIds = Object.values(nodes)
            .filter((n) => n.parentId === null)
            .map((n) => n.id);
        set({ nodes, rootIds });
    },

    selectNode: (nodeId) => {
        const state = get();
        const node = nodeId ? state.nodes[nodeId] : null;
        set({
            selectedNodeId: nodeId,
            draftContent: node?.content || "",
            editMode: false,
            showHistory: false,
            compareRevisionId: null,
        });
    },

    toggleExpanded: (nodeId) => {
        const expandedIds = new Set(get().expandedIds);
        if (expandedIds.has(nodeId)) {
            expandedIds.delete(nodeId);
        } else {
            expandedIds.add(nodeId);
        }
        set({ expandedIds });
    },

    setSearchQuery: (query) => set({ searchQuery: query }),

    addNode: (node) => {
        const state = get();
        const nodes = { ...state.nodes, [node.id]: node };

        // Update parent's children array
        if (node.parentId && nodes[node.parentId]) {
            nodes[node.parentId] = {
                ...nodes[node.parentId],
                children: [...nodes[node.parentId].children, node.id],
            };
        }

        const rootIds = node.parentId
            ? state.rootIds
            : [...state.rootIds, node.id];

        set({ nodes, rootIds });
    },

    updateNode: (nodeId, updates) => {
        const state = get();
        if (!state.nodes[nodeId]) return;

        const updatedNode = {
            ...state.nodes[nodeId],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        set({
            nodes: { ...state.nodes, [nodeId]: updatedNode },
        });
    },

    deleteNode: (nodeId) => {
        const state = get();
        const node = state.nodes[nodeId];
        if (!node) return;

        // Recursively collect all descendant IDs
        const collectDescendants = (id: string): string[] => {
            const n = state.nodes[id];
            if (!n) return [id];
            return [id, ...n.children.flatMap(collectDescendants)];
        };

        const idsToDelete = new Set(collectDescendants(nodeId));
        const nodes = { ...state.nodes };

        // Remove from parent's children
        if (node.parentId && nodes[node.parentId]) {
            nodes[node.parentId] = {
                ...nodes[node.parentId],
                children: nodes[node.parentId].children.filter(
                    (id) => id !== nodeId
                ),
            };
        }

        // Delete all nodes
        idsToDelete.forEach((id) => delete nodes[id]);

        const rootIds = state.rootIds.filter((id) => !idsToDelete.has(id));
        const selectedNodeId = idsToDelete.has(state.selectedNodeId || "")
            ? null
            : state.selectedNodeId;

        set({ nodes, rootIds, selectedNodeId });
    },

    // Document Actions
    setEditMode: (mode) => set({ editMode: mode }),

    setDraftContent: (content) => set({ draftContent: content }),

    setRevisions: (revisions) => set({ revisions }),

    toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),

    setCompareRevision: (revisionId) => set({ compareRevisionId: revisionId }),

    // Agent Actions
    toggleAgent: () => set((state) => ({ agentOpen: !state.agentOpen })),

    setAgentProcessing: (processing) => set({ agentProcessing: processing }),

    addAgentMessage: (message) =>
        set((state) => ({
            agentMessages: [...state.agentMessages, message],
        })),

    clearAgentMessages: () => set({ agentMessages: [] }),

    // Utility
    getSelectedNode: () => {
        const state = get();
        return state.selectedNodeId ? state.nodes[state.selectedNodeId] : null;
    },

    getFilteredNodes: () => {
        const state = get();
        const query = state.searchQuery.toLowerCase();
        if (!query) return Object.values(state.nodes);

        return Object.values(state.nodes).filter(
            (node) =>
                node.title.toLowerCase().includes(query) ||
                node.content.toLowerCase().includes(query)
        );
    },
}));
