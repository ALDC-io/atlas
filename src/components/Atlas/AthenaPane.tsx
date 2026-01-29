"use client";

import { Box, Text, Loader, Button, Group, Paper, Badge, ScrollArea } from "@mantine/core";
import { IconExternalLink, IconNetwork, IconInfoCircle } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";

interface NodeData {
    id: string;
    name: string;
    description: string;
    group: string;
    groupLabel: string;
    tier: number;
    color: string;
    logo?: string;
}

interface AthenaPaneProps {
    graphUrl: string;
    graphName: string;
}

export function AthenaPane({ graphUrl, graphName }: AthenaPaneProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Reset loading state when graph changes
    useEffect(() => {
        setIsLoading(true);
        setSelectedNode(null);
    }, [graphUrl]);

    // Listen for postMessage from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Only accept messages from athena
            if (!event.origin.includes('athena.aldc.io')) return;

            if (event.data?.type === 'nodeSelected') {
                setSelectedNode(event.data.node);
            } else if (event.data?.type === 'nodeDeselected') {
                setSelectedNode(null);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Embed URL hides sidebar
    const embedUrl = `${graphUrl}${graphUrl.includes('?') ? '&' : '?'}embed=true`;

    return (
        <Box className="h-full flex bg-white dark:bg-gray-900">
            {/* Main graph area */}
            <Box className="flex-1 flex flex-col">
                {/* Header with open button */}
                <Box className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Group justify="space-between" align="center">
                        <Group gap="xs">
                            <IconNetwork size={16} className="text-blue-500" />
                            <Text size="sm" fw={500}>{graphName}</Text>
                        </Group>
                        <Button
                            size="xs"
                            variant="filled"
                            color="blue"
                            leftSection={<IconExternalLink size={14} />}
                            onClick={() => window.open(graphUrl, '_blank')}
                        >
                            Open Full View
                        </Button>
                    </Group>
                </Box>

                {/* Knowledge Graph iframe */}
                <Box className="flex-1 relative">
                    {isLoading && (
                        <Box className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 z-10">
                            <Box className="text-center">
                                <Loader size="md" mb="sm" />
                                <Text size="sm" c="dimmed">
                                    Loading {graphName}...
                                </Text>
                            </Box>
                        </Box>
                    )}
                    <iframe
                        ref={iframeRef}
                        src={embedUrl}
                        className="w-full h-full border-0"
                        onLoad={() => setIsLoading(false)}
                        title={graphName}
                        allow="fullscreen"
                        key={graphUrl}
                    />
                </Box>
            </Box>

            {/* Node Details Sidebar */}
            <Box className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
                <Box className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Group gap="xs">
                        <IconInfoCircle size={16} className="text-gray-500" />
                        <Text size="sm" fw={500}>Node Details</Text>
                    </Group>
                </Box>

                <ScrollArea className="flex-1 p-3">
                    {selectedNode ? (
                        <Box>
                            <Group gap="xs" mb="sm">
                                <Badge
                                    size="sm"
                                    style={{ backgroundColor: selectedNode.color }}
                                >
                                    {selectedNode.groupLabel}
                                </Badge>
                                {selectedNode.tier > 0 && (
                                    <Badge size="sm" variant="outline">
                                        Tier {selectedNode.tier}
                                    </Badge>
                                )}
                            </Group>

                            <Text fw={600} size="md" mb="xs">
                                {selectedNode.name}
                            </Text>

                            <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                                {selectedNode.description}
                            </Text>
                        </Box>
                    ) : (
                        <Box className="text-center py-8">
                            <IconNetwork size={32} className="mx-auto mb-2 text-gray-300" />
                            <Text size="sm" c="dimmed">
                                Click on a node in the graph to view its details
                            </Text>
                            <Text size="xs" c="dimmed" mt="xs">
                                Or use "Open Full View" for full interactivity
                            </Text>
                        </Box>
                    )}
                </ScrollArea>
            </Box>
        </Box>
    );
}
