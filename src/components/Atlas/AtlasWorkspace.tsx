"use client";

import { useEffect, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Modal, TextInput, Button, Group, Text, SegmentedControl, Loader } from "@mantine/core";
import { IconFolderOpen, IconNetwork, IconZoomScan, Icon3dCubeSphere } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAtlasStore } from "@/store/atlasStore";
import { TreePane } from "./TreePane";
import { DocumentPane } from "./DocumentPane";
import { AgentPane } from "./AgentPane";
import { AlertsPane } from "./AlertsPane";
import { AthenaPane } from "./AthenaPane";

// Dynamic import to prevent SSR issues with WebGL/Sigma.js
const SigmaGraph = dynamic(() => import("./SigmaGraph").then(mod => mod.SigmaGraph), {
    ssr: false,
    loading: () => (
        <Box className="h-full flex items-center justify-center bg-gray-900">
            <Box className="text-center">
                <Loader size="lg" color="blue" mb="md" />
                <Text c="dimmed">Loading Semantic Zoom...</Text>
            </Box>
        </Box>
    ),
});
import {
    fetchAtlasNodes,
    createAtlasNode,
    updateAtlasNode,
} from "@/lib/zeusApi";
import type { AtlasNode } from "@/types/atlas";

type LeftPaneView = "documents" | "knowledge-graph";

// Available knowledge graphs
const KNOWLEDGE_GRAPHS = [
    { id: "zeus-semantic", label: "Zeus Semantic Zoom", url: null, description: "50K+ memories with semantic clustering", isNative: true },
    { id: "zeus", label: "Zeus Memory (3D)", url: "https://athena.aldc.io/viz/zeus", description: "Organizational decisions & learnings" },
    { id: "fbc", label: "Food Banks Canada", url: "https://athena.aldc.io/viz/fbc", description: "Food Banks Canada knowledge" },
    { id: "gep", label: "GEP", url: "https://athena.aldc.io/viz/gep", description: "GEP client knowledge" },
    { id: "fusion92", label: "Fusion92", url: "https://athena.aldc.io/viz/f92", description: "Fusion92 client knowledge" },
    { id: "aldc", label: "ALDC Internal", url: "https://athena.aldc.io/viz/aldc", description: "ALDC internal operations" },
];

const ZEUS_API_KEY = process.env.NEXT_PUBLIC_ZEUS_API_KEY || "";

export function AtlasWorkspace() {
    const {
        setNodes,
        addNode,
        updateNode,
        selectedNodeId,
        nodes,
        agentOpen,
        toggleAgent,
        setEditMode,
    } = useAtlasStore();

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newNodeTitle, setNewNodeTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [leftPaneView, setLeftPaneView] = useState<LeftPaneView>("documents");
    const [selectedGraphId, setSelectedGraphId] = useState<string>(KNOWLEDGE_GRAPHS[0].id);

    const selectedGraph = KNOWLEDGE_GRAPHS.find(g => g.id === selectedGraphId) || KNOWLEDGE_GRAPHS[0];

    // Load nodes on mount
    useEffect(() => {
        const loadNodes = async () => {
            try {
                // For demo, create some sample nodes if empty
                const demoNodes: Record<string, AtlasNode> = {
                    "demo-1": {
                        id: "demo-1",
                        title: "Welcome to Atlas",
                        content: `# Welcome to Atlas

Atlas is a document workspace powered by **Zeus Memory** with integrated AI assistance.

## Features

- **Document Tree** - Organize and navigate documents hierarchically
- **Markdown Editor** - Write with live preview
- **Zeus Console** - AI-powered document generation and editing

## Getting Started

1. Create a new document using the **+** button
2. Select a document to view or edit
3. Use **Zeus Console** (right panel) for AI assistance

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K | Focus search |
| Cmd+Shift+E | Toggle edit mode |
| Cmd+\\ | Toggle Zeus Console |`,
                        parentId: null,
                        children: ["demo-2", "demo-3"],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    "demo-2": {
                        id: "demo-2",
                        title: "Using Zeus Console",
                        content: `# Using Zeus Console

Zeus Console is your AI assistant for document creation and editing.

## Quick Actions

- **Create Document** - Generate a new document on any topic
- **Propose Revision** - Get AI suggestions to improve the current document
- **Create Subtopics** - Generate related child documents

## Custom Prompts

Type any question or request in the input field and press Enter. Zeus has context of your current document and can help with research, writing, and editing.`,
                        parentId: "demo-1",
                        children: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    "demo-3": {
                        id: "demo-3",
                        title: "CCE Projects",
                        content: `# CCE Projects

Your Claude Code Enhanced projects are stored in Nextcloud and synced with Zeus Memory.

## Project Files

Access your CCE project files at:
[ALDC Nextcloud - CCE Projects](https://cloud.aldc.io/apps/files/files/2689785?dir=/ALDC%20Management/CCE_projects)

## Integration

Atlas connects to Zeus Memory to provide persistent storage and AI-assisted document management across all your CCE work.`,
                        parentId: "demo-1",
                        children: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                };

                if (ZEUS_API_KEY) {
                    try {
                        const zeusNodes = await fetchAtlasNodes(ZEUS_API_KEY);
                        if (Object.keys(zeusNodes).length > 0) {
                            setNodes(zeusNodes);
                            return;
                        }
                    } catch (e) {
                        console.warn("Failed to fetch from Zeus, using demo data:", e);
                    }
                }

                setNodes(demoNodes);
            } catch (error) {
                console.error("Failed to load nodes:", error);
                notifications.show({
                    title: "Error",
                    message: "Failed to load documents",
                    color: "red",
                });
            }
        };

        loadNodes();
    }, [setNodes]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K - Focus search
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                const searchInput = document.querySelector(
                    'input[placeholder*="Search"]'
                ) as HTMLInputElement;
                searchInput?.focus();
            }

            // Cmd+Shift+E - Toggle edit mode
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "e") {
                e.preventDefault();
                if (selectedNodeId) {
                    setEditMode(true);
                }
            }

            // Cmd+\ - Toggle agent pane
            if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
                e.preventDefault();
                toggleAgent();
            }

            // Escape - Close modals
            if (e.key === "Escape") {
                setCreateModalOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedNodeId, toggleAgent, setEditMode]);

    // Create new node
    const handleCreateNode = useCallback(async () => {
        if (!newNodeTitle.trim()) return;

        setIsCreating(true);
        try {
            const newNode: AtlasNode = {
                id: `node-${Date.now()}`,
                title: newNodeTitle.trim(),
                content: `# ${newNodeTitle.trim()}\n\nStart writing here...`,
                parentId: selectedNodeId,
                children: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (ZEUS_API_KEY) {
                try {
                    const created = await createAtlasNode(
                        ZEUS_API_KEY,
                        newNode.title,
                        newNode.content,
                        newNode.parentId
                    );
                    newNode.id = created.id;
                } catch (e) {
                    console.warn("Failed to save to Zeus:", e);
                }
            }

            addNode(newNode);
            setCreateModalOpen(false);
            setNewNodeTitle("");

            notifications.show({
                title: "Created",
                message: `Document "${newNode.title}" created`,
                color: "green",
            });
        } catch (error) {
            console.error("Failed to create node:", error);
            notifications.show({
                title: "Error",
                message: "Failed to create document",
                color: "red",
            });
        } finally {
            setIsCreating(false);
        }
    }, [newNodeTitle, selectedNodeId, addNode]);

    // Save document
    const handleSave = useCallback(
        async (content: string) => {
            if (!selectedNodeId) return;

            try {
                updateNode(selectedNodeId, { content });

                if (ZEUS_API_KEY) {
                    try {
                        await updateAtlasNode(ZEUS_API_KEY, selectedNodeId, content);
                    } catch (e) {
                        console.warn("Failed to save to Zeus:", e);
                    }
                }

                notifications.show({
                    title: "Saved",
                    message: "Document saved successfully",
                    color: "green",
                });
            } catch (error) {
                console.error("Failed to save:", error);
                notifications.show({
                    title: "Error",
                    message: "Failed to save document",
                    color: "red",
                });
            }
        },
        [selectedNodeId, updateNode]
    );

    return (
        <>
            <Box className="h-screen flex">
                {/* Left Sidebar */}
                <Box className="w-64 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700">
                    {/* View Switcher */}
                    <Box className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <SegmentedControl
                            fullWidth
                            size="xs"
                            value={leftPaneView}
                            onChange={(value) => setLeftPaneView(value as LeftPaneView)}
                            data={[
                                {
                                    value: "documents",
                                    label: (
                                        <Group gap={4} justify="center">
                                            <IconFolderOpen size={14} />
                                            <span>Documents</span>
                                        </Group>
                                    ),
                                },
                                {
                                    value: "knowledge-graph",
                                    label: (
                                        <Group gap={4} justify="center">
                                            <IconNetwork size={14} />
                                            <span>Knowledge Graph</span>
                                        </Group>
                                    ),
                                },
                            ]}
                        />
                    </Box>

                    {leftPaneView === "documents" ? (
                        <>
                            {/* Tree Pane */}
                            <Box className="flex-1 overflow-hidden">
                                <TreePane onCreateNode={() => setCreateModalOpen(true)} />
                            </Box>
                            {/* CCE Feed */}
                            <Box className="h-48 border-t border-gray-200 dark:border-gray-700">
                                <AlertsPane />
                            </Box>
                        </>
                    ) : (
                        /* Knowledge Graph List + Zeus Console */
                        <>
                            <Box className="flex-1 overflow-hidden flex flex-col">
                                <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                                    <Text fw={600} size="sm">Knowledge Graphs</Text>
                                </Box>
                                <Box className="flex-1 overflow-y-auto p-2">
                                    {KNOWLEDGE_GRAPHS.map((graph) => {
                                        const IconComponent = graph.id === "zeus-semantic" ? IconZoomScan :
                                                             graph.id.includes("zeus") || graph.id === "fbc" || graph.id === "gep" || graph.id === "fusion92" || graph.id === "aldc" ? Icon3dCubeSphere : IconNetwork;
                                        return (
                                            <Box
                                                key={graph.id}
                                                className={`
                                                    p-2 rounded cursor-pointer mb-1 transition-colors
                                                    ${selectedGraphId === graph.id
                                                        ? "bg-blue-100 dark:bg-blue-900"
                                                        : "hover:bg-gray-100 dark:hover:bg-gray-800"}
                                                `}
                                                onClick={() => setSelectedGraphId(graph.id)}
                                            >
                                                <Group gap="xs">
                                                    <IconComponent size={16} className={selectedGraphId === graph.id ? "text-blue-500" : "text-gray-500"} />
                                                    <Box>
                                                        <Text size="sm" fw={500}>{graph.label}</Text>
                                                        <Text size="xs" c="dimmed">{graph.description}</Text>
                                                    </Box>
                                                </Group>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                            {/* Zeus Console in bottom half */}
                            {agentOpen && (
                                <Box className="h-1/2 border-t border-gray-200 dark:border-gray-700">
                                    <AgentPane />
                                </Box>
                            )}
                        </>
                    )}
                </Box>

                {/* Center Pane - Document or Knowledge Graph */}
                <Box className="flex-1 overflow-hidden">
                    {leftPaneView === "documents" ? (
                        <DocumentPane onSave={handleSave} />
                    ) : selectedGraph.id === "zeus-semantic" ? (
                        <SigmaGraph />
                    ) : (
                        <AthenaPane graphUrl={selectedGraph.url || ""} graphName={selectedGraph.label} />
                    )}
                </Box>

                {/* Zeus Console - Right (only show in Documents view) */}
                {agentOpen && leftPaneView === "documents" && (
                    <Box className="w-80 flex-shrink-0">
                        <AgentPane />
                    </Box>
                )}
            </Box>

            {/* Create Document Modal */}
            <Modal
                opened={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Create New Document"
                centered
            >
                <TextInput
                    label="Document Title"
                    placeholder="Enter document title..."
                    value={newNodeTitle}
                    onChange={(e) => setNewNodeTitle(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleCreateNode();
                        }
                    }}
                    data-autofocus
                />
                {selectedNodeId && (
                    <Text size="xs" c="dimmed" mt="xs">
                        Will be created as a child of the selected document
                    </Text>
                )}
                <Group justify="flex-end" mt="md">
                    <Button
                        variant="light"
                        onClick={() => setCreateModalOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateNode}
                        loading={isCreating}
                        disabled={!newNodeTitle.trim()}
                    >
                        Create
                    </Button>
                </Group>
            </Modal>
        </>
    );
}
