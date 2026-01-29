import { create } from "zustand";
import type {
    AtlasNode,
    AtlasRevision,
    AgentMessage,
    AgentAction,
} from "@/types/atlas";
import type { NextcloudFile } from "@/lib/nextcloudApi";

// Nextcloud item converted to tree-compatible format
export interface NextcloudTreeItem {
    id: string; // path as ID
    name: string;
    path: string;
    type: "file" | "directory";
    size: number;
    lastModified: string;
    mimeType?: string;
    children: string[]; // child paths
    isLoaded: boolean; // whether children have been fetched
    isNextcloud: true; // marker to identify Nextcloud items
}

interface AtlasStore {
    // Tree State
    nodes: Record<string, AtlasNode>;
    rootIds: string[];
    selectedNodeId: string | null;
    expandedIds: Set<string>;
    searchQuery: string;
    isLoading: boolean;

    // Nextcloud State
    nextcloudItems: Record<string, NextcloudTreeItem>;
    nextcloudRootIds: string[];
    nextcloudLoading: boolean;
    selectedNextcloudPath: string | null;
    nextcloudContent: string | null;

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

    // Nextcloud Actions
    setNextcloudItems: (items: NextcloudFile[], parentPath?: string) => void;
    selectNextcloudItem: (path: string | null) => void;
    setNextcloudContent: (content: string | null) => void;
    setNextcloudLoading: (loading: boolean) => void;
    loadNextcloudFolder: (path: string) => Promise<void>;
    loadNextcloudFile: (path: string) => Promise<void>;
    saveNextcloudFile: (path: string, content: string) => Promise<boolean>;
    createNextcloudFile: (parentPath: string, filename: string, content: string) => Promise<string | null>;
    refreshNextcloudFolder: (path: string) => Promise<void>;

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

    // Initial Nextcloud State
    nextcloudItems: {},
    nextcloudRootIds: [],
    nextcloudLoading: false,
    selectedNextcloudPath: null,
    nextcloudContent: null,

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

    // Nextcloud Actions
    setNextcloudItems: (items, parentPath) => {
        const state = get();
        const nextcloudItems = { ...state.nextcloudItems };

        // Helper to normalize paths (remove trailing slashes)
        const normalizePath = (p: string) => p.endsWith("/") ? p.slice(0, -1) : p;

        // Convert items to tree format
        for (const item of items) {
            const normalizedPath = normalizePath(item.path);
            const treeItem: NextcloudTreeItem = {
                id: normalizedPath,
                name: item.name,
                path: normalizedPath,
                type: item.type,
                size: item.size,
                lastModified: item.lastModified,
                mimeType: item.mimeType,
                children: [],
                isLoaded: false,
                isNextcloud: true,
            };
            nextcloudItems[normalizedPath] = treeItem;
        }

        // Update parent's children if parentPath provided
        const normalizedParent = parentPath ? normalizePath(parentPath) : null;
        if (normalizedParent && nextcloudItems[normalizedParent]) {
            nextcloudItems[normalizedParent] = {
                ...nextcloudItems[normalizedParent],
                children: items.map(i => normalizePath(i.path)),
                isLoaded: true,
            };
        }

        // If no parent, these are root items
        const nextcloudRootIds = parentPath
            ? state.nextcloudRootIds
            : items.map(i => normalizePath(i.path));

        set({ nextcloudItems, nextcloudRootIds });
    },

    selectNextcloudItem: (path) => {
        set({
            selectedNextcloudPath: path,
            selectedNodeId: null, // Deselect Zeus node
            nextcloudContent: null,
            editMode: false,
        });
    },

    setNextcloudContent: (content) => {
        set({ nextcloudContent: content, draftContent: content || "" });
    },

    setNextcloudLoading: (loading) => set({ nextcloudLoading: loading }),

    loadNextcloudFolder: async (path) => {
        const state = get();
        const item = state.nextcloudItems[path];

        // Skip if already loaded
        if (item?.isLoaded) return;

        set({ nextcloudLoading: true });
        try {
            const response = await fetch("/api/nextcloud/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path }),
            });

            if (response.ok) {
                const files = await response.json();
                get().setNextcloudItems(files, path);
            }
        } catch (error) {
            console.error("Failed to load Nextcloud folder:", error);
        } finally {
            set({ nextcloudLoading: false });
        }
    },

    loadNextcloudFile: async (path) => {
        set({ nextcloudLoading: true, nextcloudContent: null });
        try {
            const response = await fetch("/api/nextcloud/file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path }),
            });

            if (response.ok) {
                const data = await response.json();
                set({ nextcloudContent: data.content, draftContent: data.content });
            }
        } catch (error) {
            console.error("Failed to load Nextcloud file:", error);
        } finally {
            set({ nextcloudLoading: false });
        }
    },

    saveNextcloudFile: async (path, content) => {
        set({ nextcloudLoading: true });
        try {
            const response = await fetch("/api/nextcloud/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path, content }),
            });

            if (response.ok) {
                set({ nextcloudContent: content, draftContent: content });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to save Nextcloud file:", error);
            return false;
        } finally {
            set({ nextcloudLoading: false });
        }
    },

    createNextcloudFile: async (parentPath, filename, content) => {
        const state = get();
        set({ nextcloudLoading: true });
        try {
            // Ensure path ends properly
            const normalizedParent = parentPath.endsWith("/") ? parentPath.slice(0, -1) : parentPath;
            const filePath = `${normalizedParent}/${filename}`;

            const response = await fetch("/api/nextcloud/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: filePath, content }),
            });

            if (response.ok) {
                // Refresh the parent folder to show new file
                await get().refreshNextcloudFolder(normalizedParent);
                return filePath;
            }
            return null;
        } catch (error) {
            console.error("Failed to create Nextcloud file:", error);
            return null;
        } finally {
            set({ nextcloudLoading: false });
        }
    },

    refreshNextcloudFolder: async (path) => {
        const state = get();
        const normalizePath = (p: string) => p.endsWith("/") ? p.slice(0, -1) : p;
        const normalizedPath = normalizePath(path);

        // Mark folder as not loaded so it will refresh
        const nextcloudItems = { ...state.nextcloudItems };
        if (nextcloudItems[normalizedPath]) {
            nextcloudItems[normalizedPath] = {
                ...nextcloudItems[normalizedPath],
                isLoaded: false,
            };
            set({ nextcloudItems });
        }

        // Reload the folder
        await get().loadNextcloudFolder(normalizedPath);
    },

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
