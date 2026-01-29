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
} from "@mantine/core";
import {
    IconX,
    IconFileText,
    IconPencil,
    IconListTree,
    IconSend,
    IconBolt,
    IconUser,
} from "@tabler/icons-react";
import { useAtlasStore } from "@/store/atlasStore";
import type { AgentAction, AgentMessage } from "@/types/atlas";

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
    } = useAtlasStore();

    const [customPrompt, setCustomPrompt] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

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
                    context: selectedNode
                        ? {
                              nodeTitle: selectedNode.title,
                              nodeContent: selectedNode.content,
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
                prompt = selectedNode
                    ? `Please review the current document "${selectedNode.title}" and suggest improvements. Focus on clarity, structure, and completeness.`
                    : "Please select a document first to propose revisions.";
                break;
            case "create_subtopics":
                prompt = selectedNode
                    ? `Based on the document "${selectedNode.title}", suggest 3-5 subtopics that could be created as child documents to expand on this content.`
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
        </Box>
    );
}

function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === "user";

    return (
        <Box className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <Paper
                p="xs"
                className={`max-w-[85%] ${
                    isUser
                        ? "bg-blue-500"
                        : "bg-gray-100 dark:bg-gray-800"
                }`}
                radius="md"
            >
                <Group gap="xs" mb={4}>
                    {isUser ? (
                        <IconUser size={12} className="text-white" />
                    ) : (
                        <IconBolt size={12} className="text-yellow-500" />
                    )}
                    <Text size="xs" fw={500} c={isUser ? "white" : "dark"}>
                        {isUser ? "You" : "Zeus"}
                    </Text>
                </Group>
                <Text size="sm" c={isUser ? "white" : "dark"} style={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                </Text>
            </Paper>
        </Box>
    );
}
