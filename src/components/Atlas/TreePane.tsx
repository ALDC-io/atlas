"use client";

import { useState } from "react";
import {
    Box,
    TextInput,
    ActionIcon,
    Text,
    Group,
    UnstyledButton,
    Collapse,
    Menu,
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
} from "@tabler/icons-react";
import { useAtlasStore } from "@/store/atlasStore";
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
    } = useAtlasStore();

    const isSelected = selectedNodeId === node.id;
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    const childNodes = node.children
        .map((id) => nodes[id])
        .filter(Boolean)
        .sort((a, b) => a.title.localeCompare(b.title));

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
                    onClick={() => selectNode(node.id)}
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
                            onClick={() => selectNode(node.id)}
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

interface TreePaneProps {
    onCreateNode: () => void;
}

export function TreePane({ onCreateNode }: TreePaneProps) {
    const { nodes, rootIds, searchQuery, setSearchQuery, getFilteredNodes } =
        useAtlasStore();

    const [localSearch, setLocalSearch] = useState("");

    const handleSearch = (value: string) => {
        setLocalSearch(value);
        setSearchQuery(value);
    };

    const rootNodes = rootIds
        .map((id) => nodes[id])
        .filter(Boolean)
        .sort((a, b) => a.title.localeCompare(b.title));

    const filteredNodes = searchQuery ? getFilteredNodes() : [];

    return (
        <Box className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            {/* Header */}
            <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">
                        Documents
                    </Text>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={onCreateNode}
                        title="Create new document"
                    >
                        <IconPlus size={16} />
                    </ActionIcon>
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
                ) : // Regular Tree
                rootNodes.length > 0 ? (
                    rootNodes.map((node) => (
                        <TreeNode key={node.id} node={node} level={0} />
                    ))
                ) : (
                    <Text size="sm" c="dimmed" ta="center" mt="xl">
                        No documents yet.
                        <br />
                        Click + to create one.
                    </Text>
                )}
            </Box>
        </Box>
    );
}
