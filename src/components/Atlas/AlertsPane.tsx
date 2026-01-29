"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Text, Group, Badge, ScrollArea } from "@mantine/core";
import {
    IconBell,
    IconCheck,
    IconAlertTriangle,
    IconInfoCircle,
    IconBolt,
} from "@tabler/icons-react";

interface FeedItem {
    id: string;
    type: "info" | "warning" | "success" | "error" | "activity";
    message: string;
    timestamp: string;
    source?: string;
}

export function AlertsPane() {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize with some feed items and simulate incoming items
    useEffect(() => {
        const initialFeed: FeedItem[] = [
            {
                id: "feed-1",
                type: "success",
                message: "Connected to Zeus Memory",
                timestamp: new Date().toISOString(),
                source: "system",
            },
            {
                id: "feed-2",
                type: "info",
                message: "Atlas workspace ready",
                timestamp: new Date(Date.now() - 1000).toISOString(),
                source: "system",
            },
            {
                id: "feed-3",
                type: "activity",
                message: "Session started",
                timestamp: new Date(Date.now() - 2000).toISOString(),
                source: "cce",
            },
        ];
        setFeed(initialFeed);

        // Simulate periodic feed updates (in production, this would be WebSocket/SSE)
        const interval = setInterval(() => {
            const activities = [
                { type: "activity" as const, message: "Zeus Memory synced", source: "zeus" },
                { type: "info" as const, message: "Document auto-saved", source: "atlas" },
                { type: "activity" as const, message: "CCE session active", source: "cce" },
            ];
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];

            setFeed((prev) => {
                const newItem: FeedItem = {
                    id: `feed-${Date.now()}`,
                    ...randomActivity,
                    timestamp: new Date().toISOString(),
                };
                // Keep last 50 items
                return [newItem, ...prev].slice(0, 50);
            });
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: FeedItem["type"]) => {
        switch (type) {
            case "warning":
                return <IconAlertTriangle size={12} className="text-yellow-500 flex-shrink-0" />;
            case "error":
                return <IconAlertTriangle size={12} className="text-red-500 flex-shrink-0" />;
            case "success":
                return <IconCheck size={12} className="text-green-500 flex-shrink-0" />;
            case "activity":
                return <IconBolt size={12} className="text-yellow-500 flex-shrink-0" />;
            default:
                return <IconInfoCircle size={12} className="text-blue-500 flex-shrink-0" />;
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <Box className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <Box className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <Group justify="space-between">
                    <Group gap="xs">
                        <IconBell size={14} className="text-gray-500" />
                        <Text size="xs" fw={600}>
                            CCE Feed
                        </Text>
                    </Group>
                    <Badge size="xs" variant="light" color="gray">
                        Live
                    </Badge>
                </Group>
            </Box>

            {/* Scrolling Feed */}
            <ScrollArea className="flex-1" viewportRef={scrollRef}>
                <Box className="p-2 space-y-1">
                    {feed.map((item) => (
                        <Box
                            key={item.id}
                            className="flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {getIcon(item.type)}
                            <Box className="flex-1 min-w-0">
                                <Text size="xs" lineClamp={1}>
                                    {item.message}
                                </Text>
                            </Box>
                            <Text size="xs" c="dimmed" className="flex-shrink-0">
                                {formatTime(item.timestamp)}
                            </Text>
                        </Box>
                    ))}
                    {feed.length === 0 && (
                        <Text size="xs" c="dimmed" ta="center" py="md">
                            No activity yet
                        </Text>
                    )}
                </Box>
            </ScrollArea>
        </Box>
    );
}
