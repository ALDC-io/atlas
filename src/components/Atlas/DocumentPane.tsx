"use client";

import { useEffect } from "react";
import {
    Box,
    Text,
    Group,
    Button,
    ActionIcon,
    Tabs,
    Textarea,
    Badge,
    Paper,
    Loader,
} from "@mantine/core";
import {
    IconEdit,
    IconHistory,
    IconDeviceFloppy,
    IconX,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAtlasStore } from "@/store/atlasStore";

interface DocumentPaneProps {
    onSave: (content: string) => Promise<void>;
}

export function DocumentPane({ onSave }: DocumentPaneProps) {
    const {
        nodes,
        selectedNodeId,
        editMode,
        draftContent,
        showHistory,
        revisions,
        setEditMode,
        setDraftContent,
        toggleHistory,
        // Nextcloud state
        selectedNextcloudPath,
        nextcloudItems,
        nextcloudContent,
        nextcloudLoading,
    } = useAtlasStore();

    const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;
    const selectedNextcloudItem = selectedNextcloudPath ? nextcloudItems[selectedNextcloudPath] : null;

    // Determine what content to display
    const isNextcloudFile = selectedNextcloudPath && selectedNextcloudItem?.type === "file";
    const displayTitle = selectedNode?.title || selectedNextcloudItem?.name || "";
    const displayContent = selectedNode?.content || nextcloudContent || "";

    useEffect(() => {
        if (selectedNode) {
            setDraftContent(selectedNode.content);
        } else if (nextcloudContent) {
            setDraftContent(nextcloudContent);
        }
    }, [selectedNodeId, selectedNode, nextcloudContent, setDraftContent]);

    const handleSave = async () => {
        if (selectedNode) {
            await onSave(draftContent);
            setEditMode(false);
        } else if (selectedNextcloudPath) {
            // Save to Nextcloud
            try {
                const response = await fetch("/api/nextcloud/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        path: selectedNextcloudPath,
                        content: draftContent,
                    }),
                });
                if (response.ok) {
                    setEditMode(false);
                }
            } catch (error) {
                console.error("Failed to save to Nextcloud:", error);
            }
        }
    };

    const handleCancel = () => {
        if (selectedNode) {
            setDraftContent(selectedNode.content);
        } else if (nextcloudContent) {
            setDraftContent(nextcloudContent);
        }
        setEditMode(false);
    };

    // Show loading state for Nextcloud
    if (nextcloudLoading && selectedNextcloudPath) {
        return (
            <Box className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <Loader size="lg" />
            </Box>
        );
    }

    // Show empty state if nothing selected
    if (!selectedNode && !selectedNextcloudItem) {
        return (
            <Box className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <Text c="dimmed" ta="center">
                    Select a document from the tree
                    <br />
                    or create a new one
                </Text>
            </Box>
        );
    }

    // Show folder info for Nextcloud directories
    if (selectedNextcloudItem?.type === "directory") {
        return (
            <Box className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <Text c="dimmed" ta="center">
                    <Text fw={600} size="lg" mb="xs">
                        {selectedNextcloudItem.name}
                    </Text>
                    Folder
                </Text>
            </Box>
        );
    }

    // Check if file is viewable text
    const isTextFile = isNextcloudFile && (
        selectedNextcloudItem.mimeType?.startsWith("text/") ||
        [".md", ".txt", ".json", ".yaml", ".yml"].some(ext =>
            selectedNextcloudItem.name.toLowerCase().endsWith(ext)
        )
    );

    // Show non-text file info
    if (isNextcloudFile && !isTextFile && !nextcloudContent) {
        return (
            <Box className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <Text c="dimmed" ta="center">
                    <Text fw={600} size="lg" mb="xs">
                        {selectedNextcloudItem.name}
                    </Text>
                    {selectedNextcloudItem.mimeType || "Binary file"}
                    <br />
                    <Text size="xs" mt="xs">
                        {formatFileSize(selectedNextcloudItem.size)}
                    </Text>
                </Text>
            </Box>
        );
    }

    return (
        <Box className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                <Group justify="space-between">
                    <Group gap="xs">
                        <Text fw={600} size="lg">
                            {displayTitle}
                        </Text>
                        {editMode && (
                            <Badge color="yellow" size="sm">
                                Editing
                            </Badge>
                        )}
                    </Group>

                    <Group gap="xs">
                        {editMode ? (
                            <>
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="gray"
                                    leftSection={<IconX size={14} />}
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="xs"
                                    leftSection={<IconDeviceFloppy size={14} />}
                                    onClick={handleSave}
                                >
                                    Save
                                </Button>
                            </>
                        ) : (
                            <>
                                <ActionIcon
                                    variant="light"
                                    onClick={() => setEditMode(true)}
                                    title="Edit (Cmd+Shift+E)"
                                >
                                    <IconEdit size={16} />
                                </ActionIcon>
                                {selectedNode && (
                                    <ActionIcon
                                        variant={showHistory ? "filled" : "light"}
                                        onClick={toggleHistory}
                                        title="History"
                                    >
                                        <IconHistory size={16} />
                                    </ActionIcon>
                                )}
                            </>
                        )}
                    </Group>
                </Group>
            </Box>

            {/* Content */}
            <Box className="flex-1 overflow-hidden">
                {showHistory && selectedNode ? (
                    // History View (only for Zeus nodes)
                    <Tabs defaultValue="current" className="h-full flex flex-col">
                        <Tabs.List className="px-3">
                            <Tabs.Tab value="current">Current</Tabs.Tab>
                            <Tabs.Tab value="history">
                                History ({revisions.length})
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel
                            value="current"
                            className="flex-1 overflow-y-auto p-4"
                        >
                            <MarkdownContent content={selectedNode.content} />
                        </Tabs.Panel>

                        <Tabs.Panel
                            value="history"
                            className="flex-1 overflow-y-auto p-4"
                        >
                            {revisions.length > 0 ? (
                                <Box className="space-y-3">
                                    {revisions.map((rev) => (
                                        <Paper
                                            key={rev.id}
                                            p="sm"
                                            withBorder
                                            className="cursor-pointer hover:bg-gray-50"
                                        >
                                            <Group justify="space-between">
                                                <Text size="sm" fw={500}>
                                                    {new Date(
                                                        rev.createdAt
                                                    ).toLocaleString()}
                                                </Text>
                                                <Badge size="xs">
                                                    {rev.createdBy}
                                                </Badge>
                                            </Group>
                                            {rev.message && (
                                                <Text size="xs" c="dimmed" mt="xs">
                                                    {rev.message}
                                                </Text>
                                            )}
                                        </Paper>
                                    ))}
                                </Box>
                            ) : (
                                <Text c="dimmed" ta="center">
                                    No revision history yet
                                </Text>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                ) : editMode ? (
                    // Edit Mode - Split View
                    <Box className="h-full flex">
                        <Box className="w-1/2 h-full border-r border-gray-200 dark:border-gray-700">
                            <Textarea
                                value={draftContent}
                                onChange={(e) =>
                                    setDraftContent(e.currentTarget.value)
                                }
                                placeholder="Write markdown here..."
                                className="h-full"
                                styles={{
                                    root: { height: "100%" },
                                    wrapper: { height: "100%" },
                                    input: {
                                        height: "100%",
                                        fontFamily: "monospace",
                                        fontSize: "14px",
                                        border: "none",
                                        borderRadius: 0,
                                    },
                                }}
                            />
                        </Box>
                        <Box className="w-1/2 h-full overflow-y-auto p-4">
                            <Text size="xs" c="dimmed" mb="xs">
                                Preview
                            </Text>
                            <MarkdownContent content={draftContent} />
                        </Box>
                    </Box>
                ) : (
                    // Preview Mode
                    <Box className="h-full overflow-y-auto p-4">
                        <MarkdownContent content={displayContent} />
                    </Box>
                )}
            </Box>
        </Box>
    );
}

function MarkdownContent({ content }: { content: string }) {
    if (!content.trim()) {
        return (
            <Text c="dimmed" fs="italic">
                No content yet
            </Text>
        );
    }

    return (
        <Box className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </Box>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
