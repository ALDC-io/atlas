"use client";

import { Box, Text, Loader, ActionIcon, Tooltip } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface AthenaPaneProps {
    graphUrl: string;
    graphName: string;
}

export function AthenaPane({ graphUrl, graphName }: AthenaPaneProps) {
    const [isLoading, setIsLoading] = useState(true);

    // Reset loading state when graph changes
    useEffect(() => {
        setIsLoading(true);
    }, [graphUrl]);

    return (
        <Box className="h-full flex flex-col bg-white dark:bg-gray-900">
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
                {/* Open in new tab button */}
                <Tooltip label="Open in new tab for full interactivity">
                    <ActionIcon
                        variant="filled"
                        color="blue"
                        size="lg"
                        className="absolute top-3 right-3 z-20"
                        onClick={() => window.open(graphUrl, '_blank')}
                    >
                        <IconExternalLink size={18} />
                    </ActionIcon>
                </Tooltip>
                <iframe
                    src={graphUrl}
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    title={graphName}
                    allow="fullscreen"
                    key={graphUrl}
                />
            </Box>
        </Box>
    );
}
