"use client";

import { useEffect, useCallback, useState } from "react";
import { Box, Modal, TextInput, Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAtlasStore } from "@/store/atlasStore";
import { TreePane } from "./TreePane";
import { DocumentPane } from "./DocumentPane";
import { AgentPane } from "./AgentPane";
import {
    fetchAtlasNodes,
    createAtlasNode,
    updateAtlasNode,
    callClaudeAgent,
} from "@/lib/zeusApi";
import type { AgentAction, AtlasNode } from "@/types/atlas";

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
        setAgentProcessing,
        addAgentMessage,
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

Atlas is a **3-pane markdown-first workspace** with Claude integration.

## Features

- **Tree Navigation** - Organize documents hierarchically
- **Markdown Editor** - Write with live preview
- **Claude Agent** - AI-powered document generation

## Getting Started

1. Create a new document using the + button
2. Select a document to view/edit
3. Use the Claude Agent for AI assistance

---

*Built with Next.js, Mantine, and Zeus Memory*`,
                        parentId: null,
                        children: ["demo-2", "demo-3"],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    "demo-2": {
                        id: "demo-2",
                        title: "Quick Start Guide",
                        content: `# Quick Start Guide

## Creating Documents

Click the **+** button in the tree pane to create a new document.

## Editing

1. Select a document
2. Click the edit icon or press \`Cmd+Shift+E\`
3. Write markdown in the left pane
4. See live preview in the right pane
5. Click Save when done

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K | Focus search |
| Cmd+Shift+E | Toggle edit mode |
| Cmd+\\ | Toggle agent pane |
| Cmd+S | Save document |`,
                        parentId: "demo-1",
                        children: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    "demo-3": {
                        id: "demo-3",
                        title: "Using the Claude Agent",
                        content: `# Using the Claude Agent

The right pane contains the Claude Agent for AI-powered assistance.

## Available Actions

### Create Document
Generate a new document based on a topic or prompt.

### Propose Revision
Get AI suggestions to improve the current document.

### Create Subtopics
Generate child documents that expand on the current topic.

## Custom Prompts

Type any custom prompt in the input field and press Enter.`,
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

    // Agent action
    const handleAgentAction = useCallback(
        async (action: AgentAction, customPrompt?: string) => {
            const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

            setAgentProcessing(true);

            // Add user message
            const userMessage = customPrompt || getActionLabel(action);
            addAgentMessage({
                id: `msg-${Date.now()}`,
                role: "user",
                content: userMessage,
                timestamp: new Date().toISOString(),
            });

            try {
                const response = await callClaudeAgent(ZEUS_API_KEY, action, {
                    nodeTitle: selectedNode?.title,
                    nodeContent: selectedNode?.content,
                });

                addAgentMessage({
                    id: `msg-${Date.now() + 1}`,
                    role: "assistant",
                    content: response,
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                console.error("Agent action failed:", error);
                addAgentMessage({
                    id: `msg-${Date.now() + 1}`,
                    role: "assistant",
                    content:
                        "Sorry, I encountered an error. Please try again.",
                    timestamp: new Date().toISOString(),
                });
            } finally {
                setAgentProcessing(false);
            }
        },
        [selectedNodeId, nodes, setAgentProcessing, addAgentMessage]
    );

    return (
        <>
            <Box className="h-screen flex">
                {/* Tree Pane - Left */}
                <Box className="w-64 flex-shrink-0">
                    <TreePane onCreateNode={() => setCreateModalOpen(true)} />
                </Box>

                {/* Document Pane - Center */}
                <Box className="flex-1 min-w-0">
                    <DocumentPane onSave={handleSave} />
                </Box>

                {/* Agent Pane - Right */}
                {agentOpen && (
                    <Box className="w-80 flex-shrink-0">
                        <AgentPane onAction={handleAgentAction} />
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

function getActionLabel(action: AgentAction): string {
    switch (action) {
        case "create_document":
            return "Create a new document";
        case "propose_revision":
            return "Propose improvements to this document";
        case "create_subtopics":
            return "Generate subtopics for this document";
        default:
            return action;
    }
}
