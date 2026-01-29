"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Box,
    TextInput,
    ActionIcon,
    Text,
    Group,
    UnstyledButton,
    Collapse,
    Menu,
    Loader,
} from "@mantine/core";
import {
    IconSearch,
    IconPlus,
    IconChevronRight,
    IconChevronDown,
    IconFile,
    IconFolder,
    IconDots,
    IconTrash,
    IconEdit,
    IconFileText,
    IconUpload,
} from "@tabler/icons-react";
import { useAtlasStore, type NextcloudTreeItem } from "@/store/atlasStore";
import type { AtlasNode } from "@/types/atlas";

interface TreeNodeProps {
    node: AtlasNode;
    level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
    const {
        nodes,
        selectedNodeId,
        expandedIds,
        selectNode,
        toggleExpanded,
        deleteNode,
        selectNextcloudItem,
    } = useAtlasStore();

    const isSelected = selectedNodeId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    const childNodes = node.children
        .map((id) => nodes[id])
        .filter(Boolean)
        .sort((a, b) => a.title.localeCompare(b.title));

    const handleSelect = () => {
        selectNextcloudItem(null); // Deselect any Nextcloud item
        selectNode(node.id);
    };

    return (
        <Box>
            <Group
                gap={0}
                className={`
                    py-1 px-2 rounded cursor-pointer transition-colors
                    ${isSelected ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-800"}
                `}
                style={{ paddingLeft: level * 16 }}
            >
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) toggleExpanded(node.id);
                    }}
                    className={hasChildren ? "" : "invisible"}
                >
                    {isExpanded ? (
                        <IconChevronDown size={14} />
                    ) : (
                        <IconChevronRight size={14} />
                    )}
                </ActionIcon>

                <UnstyledButton
                    onClick={handleSelect}
                    className="flex-1 flex items-center gap-2"
                >
                    {hasChildren ? (
                        <IconFolder size={16} className="text-yellow-600" />
                    ) : (
                        <IconFile size={16} className="text-gray-500" />
                    )}
                    <Text size="sm" truncate className="flex-1">
                        {node.title}
                    </Text>
                </UnstyledButton>

                <Menu position="right-start" withArrow>
                    <Menu.Target>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconDots size={14} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={handleSelect}
                        >
                            Edit
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => deleteNode(node.id)}
                        >
                            Delete
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>

            <Collapse in={isExpanded}>
                {childNodes.map((child) => (
                    <TreeNode key={child.id} node={child} level={level + 1} />
                ))}
            </Collapse>
        </Box>
    );
}

interface NextcloudNodeProps {
    item: NextcloudTreeItem;
    level: number;
}

function NextcloudNode({ item, level }: NextcloudNodeProps) {
    const {
        nextcloudItems,
        selectedNextcloudPath,
        expandedIds,
        toggleExpanded,
        selectNextcloudItem,
        selectNode,
        loadNextcloudFolder,
        loadNextcloudFile,
    } = useAtlasStore();

    const isSelected = selectedNextcloudPath === item.path;
    const isExpanded = expandedIds.has(item.path);
    const isDirectory = item.type === "directory";
    const hasChildren = item.children.length > 0 || (isDirectory && !item.isLoaded);

    // Get child items
    const childItems = item.children
        .map((path) => nextcloudItems[path])
        .filter(Boolean)
        .sort((a, b) => {
            // Directories first
            if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDirectory) {
            toggleExpanded(item.path);
            if (!item.isLoaded) {
                await loadNextcloudFolder(item.path);
            }
        }
    };

    const handleSelect = async () => {
        selectNode(null); // Deselect any Zeus node
        selectNextcloudItem(item.path);

        if (item.type === "file") {
            // Check if it's a text file we can display
            const textExtensions = [".md", ".txt", ".json", ".yaml", ".yml", ".xml", ".html", ".css", ".js", ".ts"];
            const ext = item.name.toLowerCase().substring(item.name.lastIndexOf("."));
            if (textExtensions.includes(ext) || item.mimeType?.startsWith("text/")) {
                await loadNextcloudFile(item.path);
            }
        }
    };

    // Determine icon based on file type
    const getIcon = () => {
        if (isDirectory) {
            return <IconFolder size={16} className="text-yellow-600" />;
        }
        const ext = item.name.toLowerCase().substring(item.name.lastIndexOf("."));
        if (ext === ".md") {
            return <IconFileText size={16} className="text-blue-500" />;
        }
        return <IconFile size={16} className="text-gray-500" />;
    };

    return (
        <Box>
            <Group
                gap={0}
                className={`
                    py-1 px-2 rounded cursor-pointer transition-colors
                    ${isSelected ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-800"}
                `}
                style={{ paddingLeft: level * 16 }}
            >
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={handleToggle}
                    className={isDirectory ? "" : "invisible"}
                >
                    {isExpanded ? (
                        <IconChevronDown size={14} />
                    ) : (
                        <IconChevronRight size={14} />
                    )}
                </ActionIcon>

                <UnstyledButton
                    onClick={handleSelect}
                    className="flex-1 flex items-center gap-2"
                >
                    {getIcon()}
                    <Text size="sm" truncate className="flex-1">
                        {item.name}
                    </Text>
                </UnstyledButton>
            </Group>

            <Collapse in={isExpanded}>
                {childItems.map((child) => (
                    <NextcloudNode key={child.path} item={child} level={level + 1} />
                ))}
            </Collapse>
        </Box>
    );
}

interface TreePaneProps {
    onCreateNode: () => void;
}

export function TreePane({ onCreateNode }: TreePaneProps) {
    const {
        nodes,
        rootIds,
        searchQuery,
        setSearchQuery,
        getFilteredNodes,
        nextcloudItems,
        nextcloudRootIds,
        nextcloudLoading,
        setNextcloudItems,
    } = useAtlasStore();

    const [localSearch, setLocalSearch] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    // Load Nextcloud root on mount
    useEffect(() => {
        const loadNextcloudRoot = async () => {
            if (nextcloudRootIds.length > 0) return; // Already loaded

            try {
                const response = await fetch("/api/nextcloud/list", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: "/" }),
                });

                if (response.ok) {
                    const files = await response.json();
                    // Filter to only show directories at root level for cleaner UI
                    const directories = files.filter((f: { type: string }) => f.type === "directory");
                    setNextcloudItems(directories);
                }
            } catch (error) {
                console.error("Failed to load Nextcloud root:", error);
            }
        };

        loadNextcloudRoot();
    }, [nextcloudRootIds.length, setNextcloudItems]);

    const handleSearch = (value: string) => {
        setLocalSearch(value);
        setSearchQuery(value);
    };

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);

        for (const file of files) {
            // Only handle markdown and text files
            if (file.name.endsWith(".md") || file.name.endsWith(".txt") || file.type.startsWith("text/")) {
                const content = await file.text();
                const fileName = file.name;
                const path = `/${fileName}`;

                try {
                    // Upload to Nextcloud
                    const response = await fetch("/api/nextcloud/save", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path, content }),
                    });

                    if (response.ok) {
                        // Refresh the root listing
                        const listResponse = await fetch("/api/nextcloud/list", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ path: "/" }),
                        });

                        if (listResponse.ok) {
                            const newFiles = await listResponse.json();
                            const directories = newFiles.filter((f: { type: string }) => f.type === "directory");
                            setNextcloudItems(directories);
                        }
                    }
                } catch (error) {
                    console.error("Failed to upload file:", error);
                }
            }
        }
    }, [setNextcloudItems]);

    const rootNodes = rootIds
        .map((id) => nodes[id])
        .filter(Boolean)
        .sort((a, b) => a.title.localeCompare(b.title));

    const rootNextcloudItems = nextcloudRootIds
        .map((path) => nextcloudItems[path])
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

    const filteredNodes = searchQuery ? getFilteredNodes() : [];

    return (
        <Box
            className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${
                isDragging ? "ring-2 ring-blue-400 ring-inset" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header */}
            <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">
                        Documents
                    </Text>
                    <Group gap="xs">
                        {nextcloudLoading && <Loader size="xs" />}
                        <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={onCreateNode}
                            title="Create new document"
                        >
                            <IconPlus size={16} />
                        </ActionIcon>
                    </Group>
                </Group>

                <TextInput
                    placeholder="Search... (Cmd+K)"
                    size="xs"
                    leftSection={<IconSearch size={14} />}
                    value={localSearch}
                    onChange={(e) => handleSearch(e.currentTarget.value)}
                />
            </Box>

            {/* Tree Content */}
            <Box className="flex-1 overflow-y-auto p-2">
                {searchQuery ? (
                    // Search Results
                    filteredNodes.length > 0 ? (
                        <Box>
                            <Text size="xs" c="dimmed" mb="xs">
                                {filteredNodes.length} result
                                {filteredNodes.length !== 1 ? "s" : ""}
                            </Text>
                            {filteredNodes.map((node) => (
                                <TreeNode key={node.id} node={node} level={0} />
                            ))}
                        </Box>
                    ) : (
                        <Text size="sm" c="dimmed" ta="center" mt="xl">
                            No results found
                        </Text>
                    )
                ) : (
                    // Regular Tree - Nextcloud folders first, then Zeus nodes
                    <Box>
                        {/* Nextcloud Folders */}
                        {rootNextcloudItems.map((item) => (
                            <NextcloudNode key={item.path} item={item} level={0} />
                        ))}

                        {/* Zeus Memory Nodes */}
                        {rootNodes.map((node) => (
                            <TreeNode key={node.id} node={node} level={0} />
                        ))}

                        {/* Empty state */}
                        {rootNextcloudItems.length === 0 && rootNodes.length === 0 && (
                            <Text size="sm" c="dimmed" ta="center" mt="xl">
                                No documents yet.
                                <br />
                                Click + to create one.
                            </Text>
                        )}

                        {/* Drop hint when dragging */}
                        {isDragging && (
                            <Box className="mt-4 p-4 border-2 border-dashed border-blue-400 rounded-lg text-center">
                                <IconUpload size={24} className="mx-auto mb-2 text-blue-500" />
                                <Text size="sm" c="blue">
                                    Drop .md files here
                                </Text>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
