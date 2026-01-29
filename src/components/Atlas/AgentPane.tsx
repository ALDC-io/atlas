"use client";

import { useState } from "react";
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
} from "@mantine/core";
import {
    IconX,
    IconFileText,
    IconPencil,
    IconListTree,
    IconSend,
    IconRobot,
    IconUser,
} from "@tabler/icons-react";
import { useAtlasStore } from "@/store/atlasStore";
import type { AgentAction, AgentMessage } from "@/types/atlas";

interface AgentPaneProps {
    onAction: (action: AgentAction, prompt?: string) => Promise<void>;
}

export function AgentPane({ onAction }: AgentPaneProps) {
    const {
        nodes,
        selectedNodeId,
        agentOpen,
        agentProcessing,
        agentMessages,
        toggleAgent,
    } = useAtlasStore();

    const [customPrompt, setCustomPrompt] = useState("");

    const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

    const handleAction = async (action: AgentAction) => {
        await onAction(action);
    };

    const handleCustomPrompt = async () => {
        if (!customPrompt.trim()) return;
        await onAction("create_document", customPrompt);
        setCustomPrompt("");
    };

    if (!agentOpen) {
        return null;
    }

    return (
        <Box className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            {/* Header */}
            <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                <Group justify="space-between">
                    <Group gap="xs">
                        <IconRobot size={18} className="text-blue-500" />
                        <Text fw={600} size="sm">
                            Claude Agent
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
                    disabled={agentProcessing || !selectedNode}
                    justify="flex-start"
                >
                    Propose Revision
                </Button>

                <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconListTree size={16} />}
                    onClick={() => handleAction("create_subtopics")}
                    disabled={agentProcessing || !selectedNode}
                    justify="flex-start"
                >
                    Create Subtopics
                </Button>
            </Box>

            {/* Context Info */}
            {selectedNode && (
                <Box className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <Text size="xs" c="dimmed">
                        Context
                    </Text>
                    <Paper p="xs" mt="xs" withBorder>
                        <Text size="xs" fw={500} truncate>
                            {selectedNode.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                            {selectedNode.content.slice(0, 100)}
                            {selectedNode.content.length > 100 ? "..." : ""}
                        </Text>
                    </Paper>
                </Box>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
                {agentMessages.length > 0 ? (
                    <Box className="space-y-3">
                        {agentMessages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {agentProcessing && (
                            <Box className="flex items-center gap-2 text-gray-500">
                                <Loader size="xs" />
                                <Text size="xs">Claude is thinking...</Text>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Text size="sm" c="dimmed" ta="center" mt="xl">
                        Use the actions above or type a custom prompt below.
                    </Text>
                )}
            </ScrollArea>

            {/* Custom Prompt Input */}
            <Box className="p-3 border-t border-gray-200 dark:border-gray-700">
                <Group gap="xs">
                    <Textarea
                        placeholder="Custom prompt..."
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
                        color="blue"
                        onClick={handleCustomPrompt}
                        disabled={!customPrompt.trim() || agentProcessing}
                    >
                        <IconSend size={16} />
                    </ActionIcon>
                </Group>
            </Box>
        </Box>
    );
}

function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === "user";

    return (
        <Box
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        >
            <Paper
                p="xs"
                className={`max-w-[85%] ${
                    isUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800"
                }`}
                radius="md"
            >
                <Group gap="xs" mb={4}>
                    {isUser ? (
                        <IconUser size={12} />
                    ) : (
                        <IconRobot size={12} />
                    )}
                    <Text size="xs" fw={500}>
                        {isUser ? "You" : "Claude"}
                    </Text>
                </Group>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                </Text>
            </Paper>
        </Box>
    );
}
