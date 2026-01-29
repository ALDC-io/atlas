"use client";

import { useState, useRef, useEffect } from "react";
import {
    Box,
    Text,
    Button,
    Paper,
    Group,
    ActionIcon,
    Textarea,
    Loader,
    ScrollArea,
    Modal,
    TextInput,
    Select,
    Stack,
} from "@mantine/core";
import {
    IconX,
    IconFileText,
    IconPencil,
    IconListTree,
    IconSend,
    IconBolt,
    IconUser,
    IconPlus,
    IconChartBar,
    IconClock,
    IconChecklist,
    IconLayoutKanban,
    IconUsers,
    IconNotes,
    IconAlertTriangle,
    IconFileDescription,
} from "@tabler/icons-react";
import { useAtlasStore } from "@/store/atlasStore";
import { ARTIFACT_TEMPLATES, generateArtifact } from "@/lib/artifactTemplates";
import type { AgentAction, AgentMessage } from "@/types/atlas";

// Icon mapping for artifact types
const ARTIFACT_ICONS: Record<string, React.ReactNode> = {
    gantt: <IconChartBar size={16} />,
    timeline: <IconClock size={16} />,
    tasks: <IconChecklist size={16} />,
    kanban: <IconLayoutKanban size={16} />,
    raci: <IconUsers size={16} />,
    "meeting-notes": <IconNotes size={16} />,
    "risk-register": <IconAlertTriangle size={16} />,
    requirements: <IconFileDescription size={16} />,
};

export function AgentPane() {
    const {
        nodes,
        selectedNodeId,
        agentOpen,
        agentProcessing,
        agentMessages,
        toggleAgent,
        setAgentProcessing,
        addAgentMessage,
        // Nextcloud state
        selectedNextcloudPath,
        nextcloudItems,
        nextcloudContent,
        createNextcloudFile,
        selectNextcloudItem,
        loadNextcloudFile,
    } = useAtlasStore();

    const [customPrompt, setCustomPrompt] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Artifact creation state
    const [createArtifactOpen, setCreateArtifactOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [projectName, setProjectName] = useState("");
    const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);

    const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;
    const selectedNextcloudItem = selectedNextcloudPath ? nextcloudItems[selectedNextcloudPath] : null;

    // Determine current document context (Zeus node or Nextcloud file)
    const hasContext = selectedNode || (selectedNextcloudItem?.type === "file" && nextcloudContent);
    const contextTitle = selectedNode?.title || selectedNextcloudItem?.name || "";
    const contextContent = selectedNode?.content || nextcloudContent || "";

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [agentMessages]);

    const sendMessage = async (content: string) => {
        if (!content.trim() || agentProcessing) return;

        // Add user message
        const userMessage: AgentMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: content.trim(),
            timestamp: new Date().toISOString(),
        };
        addAgentMessage(userMessage);
        setAgentProcessing(true);

        try {
            // Build messages for API
            const apiMessages = [
                ...agentMessages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                { role: "user", content: content.trim() },
            ];

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: apiMessages,
                    context: hasContext
                        ? {
                              nodeTitle: contextTitle,
                              nodeContent: contextContent,
                          }
                        : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            // Add assistant message
            const assistantMessage: AgentMessage = {
                id: `msg-${Date.now() + 1}`,
                role: "assistant",
                content: data.content,
                timestamp: new Date().toISOString(),
            };
            addAgentMessage(assistantMessage);
        } catch (error) {
            console.error("Chat error:", error);
            addAgentMessage({
                id: `msg-${Date.now() + 1}`,
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date().toISOString(),
            });
        } finally {
            setAgentProcessing(false);
        }
    };

    const handleAction = async (action: AgentAction) => {
        let prompt = "";
        switch (action) {
            case "create_document":
                prompt = "Create a new document. What topic would you like me to write about?";
                break;
            case "propose_revision":
                prompt = hasContext
                    ? `Please review the current document "${contextTitle}" and suggest improvements. Focus on clarity, structure, and completeness.`
                    : "Please select a document first to propose revisions.";
                break;
            case "create_subtopics":
                prompt = hasContext
                    ? `Based on the document "${contextTitle}", suggest 3-5 subtopics that could be created as child documents to expand on this content.`
                    : "Please select a document first to generate subtopics.";
                break;
        }
        await sendMessage(prompt);
    };

    const handleCustomPrompt = async () => {
        if (!customPrompt.trim()) return;
        await sendMessage(customPrompt);
        setCustomPrompt("");
    };

    // Get the current folder path for artifact creation
    const getCurrentFolderPath = (): string | null => {
        if (!selectedNextcloudPath) return null;
        const item = nextcloudItems[selectedNextcloudPath];
        if (!item) return null;
        // If it's a directory, use it; otherwise use parent directory
        if (item.type === "directory") {
            return item.path;
        }
        // Extract parent path from file path
        const lastSlash = item.path.lastIndexOf("/");
        return lastSlash > 0 ? item.path.substring(0, lastSlash) : null;
    };

    const handleCreateArtifact = async () => {
        if (!selectedTemplate || !projectName.trim()) return;

        const folderPath = getCurrentFolderPath();
        if (!folderPath) {
            addAgentMessage({
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: "Please select a folder in the Projects tree to create the artifact in.",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        setIsCreatingArtifact(true);
        try {
            const template = ARTIFACT_TEMPLATES.find(t => t.id === selectedTemplate);
            if (!template) return;

            const content = generateArtifact(selectedTemplate, projectName.trim());
            if (!content) return;

            const filename = `${projectName.trim().toLowerCase().replace(/\s+/g, "-")}-${template.defaultFilename}`;
            const newPath = await createNextcloudFile(folderPath, filename, content);

            if (newPath) {
                // Select and load the new file
                selectNextcloudItem(newPath);
                await loadNextcloudFile(newPath);

                addAgentMessage({
                    id: `msg-${Date.now()}`,
                    role: "assistant",
                    content: `Created "${filename}" in ${folderPath}. The ${template.name} is ready for you to customize.`,
                    timestamp: new Date().toISOString(),
                });

                setCreateArtifactOpen(false);
                setSelectedTemplate(null);
                setProjectName("");
            } else {
                addAgentMessage({
                    id: `msg-${Date.now()}`,
                    role: "assistant",
                    content: "Failed to create the artifact. Please check folder permissions and try again.",
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error("Failed to create artifact:", error);
            addAgentMessage({
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: "An error occurred while creating the artifact.",
                timestamp: new Date().toISOString(),
            });
        } finally {
            setIsCreatingArtifact(false);
        }
    };

    const canCreateArtifact = !!getCurrentFolderPath();

    if (!agentOpen) {
        return null;
    }

    return (
        <Box className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            {/* Header */}
            <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                <Group justify="space-between">
                    <Group gap="xs">
                        <IconBolt size={18} className="text-yellow-500" />
                        <Text fw={600} size="sm">
                            Zeus Console
                        </Text>
                    </Group>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={toggleAgent}
                        title="Close (Cmd+\)"
                    >
                        <IconX size={16} />
                    </ActionIcon>
                </Group>
            </Box>

            {/* Action Buttons */}
            <Box className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                <Text size="xs" c="dimmed" mb="xs">
                    Quick Actions
                </Text>

                <Button
                    fullWidth
                    variant="filled"
                    color="green"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setCreateArtifactOpen(true)}
                    disabled={agentProcessing || !canCreateArtifact}
                    justify="flex-start"
                >
                    Create Artifact
                </Button>

                <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconFileText size={16} />}
                    onClick={() => handleAction("create_document")}
                    disabled={agentProcessing}
                    justify="flex-start"
                >
                    Create Document
                </Button>

                <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconPencil size={16} />}
                    onClick={() => handleAction("propose_revision")}
                    disabled={agentProcessing || !hasContext}
                    justify="flex-start"
                >
                    Propose Revision
                </Button>

                <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconListTree size={16} />}
                    onClick={() => handleAction("create_subtopics")}
                    disabled={agentProcessing || !hasContext}
                    justify="flex-start"
                >
                    Create Subtopics
                </Button>
            </Box>

            {/* Context Info */}
            {hasContext && (
                <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <Text size="xs" c="dimmed">
                        Context
                    </Text>
                    <Paper p="xs" mt="xs" withBorder>
                        <Text size="xs" fw={500} truncate>
                            {contextTitle}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                            {contextContent.slice(0, 100)}
                            {contextContent.length > 100 ? "..." : ""}
                        </Text>
                    </Paper>
                </Box>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-3" viewportRef={scrollRef}>
                {agentMessages.length > 0 ? (
                    <Box className="space-y-3">
                        {agentMessages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {agentProcessing && (
                            <Box className="flex items-center gap-2 text-gray-500">
                                <Loader size="xs" />
                                <Text size="xs">Zeus is thinking...</Text>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Text size="sm" c="dimmed" ta="center" mt="xl">
                        Ask Zeus anything or use the quick actions above.
                    </Text>
                )}
            </ScrollArea>

            {/* Custom Prompt Input */}
            <Box className="p-3 border-t border-gray-200 dark:border-gray-700">
                <Group gap="xs" align="flex-end">
                    <Textarea
                        placeholder="Ask Zeus..."
                        size="xs"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleCustomPrompt();
                            }
                        }}
                        className="flex-1"
                        minRows={1}
                        maxRows={3}
                        autosize
                        disabled={agentProcessing}
                    />
                    <ActionIcon
                        variant="filled"
                        color="yellow"
                        onClick={handleCustomPrompt}
                        disabled={!customPrompt.trim() || agentProcessing}
                    >
                        <IconSend size={16} />
                    </ActionIcon>
                </Group>
            </Box>

            {/* Create Artifact Modal */}
            <Modal
                opened={createArtifactOpen}
                onClose={() => setCreateArtifactOpen(false)}
                title="Create Project Artifact"
                centered
                size="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Project Name"
                        placeholder="Enter project name..."
                        value={projectName}
                        onChange={(e) => setProjectName(e.currentTarget.value)}
                        data-autofocus
                    />

                    <Box>
                        <Text size="sm" fw={500} mb="xs">
                            Select Artifact Type
                        </Text>
                        <Stack gap="xs">
                            {ARTIFACT_TEMPLATES.map((template) => (
                                <Paper
                                    key={template.id}
                                    p="sm"
                                    withBorder
                                    className={`cursor-pointer transition-colors ${
                                        selectedTemplate === template.id
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                    onClick={() => setSelectedTemplate(template.id)}
                                >
                                    <Group gap="sm">
                                        <Box className={selectedTemplate === template.id ? "text-blue-500" : "text-gray-500"}>
                                            {ARTIFACT_ICONS[template.id] || <IconFileText size={16} />}
                                        </Box>
                                        <Box>
                                            <Text size="sm" fw={500}>
                                                {template.name}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {template.description}
                                            </Text>
                                        </Box>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>

                    {getCurrentFolderPath() && (
                        <Text size="xs" c="dimmed">
                            Will be created in: {getCurrentFolderPath()}
                        </Text>
                    )}

                    <Group justify="flex-end" mt="sm">
                        <Button
                            variant="light"
                            onClick={() => setCreateArtifactOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="green"
                            onClick={handleCreateArtifact}
                            loading={isCreatingArtifact}
                            disabled={!selectedTemplate || !projectName.trim()}
                        >
                            Create Artifact
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === "user";

    return (
        <Box className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <Paper
                p="xs"
                radius="md"
                style={{
                    maxWidth: "85%",
                    backgroundColor: isUser ? "#3b82f6" : "#f3f4f6",
                }}
            >
                <Group gap="xs" mb={4}>
                    {isUser ? (
                        <IconUser size={12} style={{ color: "#ffffff" }} />
                    ) : (
                        <IconBolt size={12} style={{ color: "#eab308" }} />
                    )}
                    <Text size="xs" fw={500} style={{ color: isUser ? "#ffffff" : "#111827" }}>
                        {isUser ? "You" : "Zeus"}
                    </Text>
                </Group>
                <Text size="sm" style={{ whiteSpace: "pre-wrap", color: isUser ? "#ffffff" : "#111827" }}>
                    {message.content}
                </Text>
            </Paper>
        </Box>
    );
}
