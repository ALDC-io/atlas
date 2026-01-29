"use client";

import { useEffect, useCallback, useState } from "react";
import { Box, Modal, TextInput, Button, Group as MantineGroup, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    Panel,
    Group as PanelGroup,
    Separator as PanelSeparator,
} from "react-resizable-panels";
import { useAtlasStore } from "@/store/atlasStore";
import { TreePane } from "./TreePane";
import { DocumentPane } from "./DocumentPane";
import { AgentPane } from "./AgentPane";
import { AlertsPane } from "./AlertsPane";
import {
    fetchAtlasNodes,
    createAtlasNode,
    updateAtlasNode,
} from "@/lib/zeusApi";
import type { AtlasNode } from "@/types/atlas";

const ZEUS_API_KEY = process.env.NEXT_PUBLIC_ZEUS_API_KEY || "";

// Resize handle component
function ResizeHandle({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) {
    return (
        <PanelSeparator
            className={`
                ${direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
                bg-gray-200 dark:bg-gray-700
                hover:bg-blue-400 dark:hover:bg-blue-500
                active:bg-blue-500 dark:active:bg-blue-400
                transition-colors
            `}
        />
    );
}

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
            <Box className="h-screen">
                <PanelGroup orientation="horizontal" className="h-full">
                    {/* Left Sidebar - Tree + Feed */}
                    <Panel defaultSize={20} minSize={15} maxSize={40}>
                        <PanelGroup orientation="vertical" className="h-full">
                            {/* Tree Pane */}
                            <Panel defaultSize={70} minSize={30}>
                                <TreePane onCreateNode={() => setCreateModalOpen(true)} />
                            </Panel>
                            <ResizeHandle direction="vertical" />
                            {/* CCE Feed */}
                            <Panel defaultSize={30} minSize={15}>
                                <AlertsPane />
                            </Panel>
                        </PanelGroup>
                    </Panel>

                    <ResizeHandle />

                    {/* Document Pane - Center */}
                    <Panel defaultSize={agentOpen ? 55 : 80} minSize={30}>
                        <DocumentPane onSave={handleSave} />
                    </Panel>

                    {/* Zeus Console - Right */}
                    {agentOpen && (
                        <>
                            <ResizeHandle />
                            <Panel defaultSize={25} minSize={20} maxSize={50}>
                                <AgentPane />
                            </Panel>
                        </>
                    )}
                </PanelGroup>
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
                <MantineGroup justify="flex-end" mt="md">
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
                </MantineGroup>
            </Modal>
        </>
    );
}
