"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Text,
    Paper,
    Group,
    Badge,
    ActionIcon,
    ScrollArea,
    Tooltip,
} from "@mantine/core";
import {
    IconBell,
    IconCheck,
    IconAlertTriangle,
    IconInfoCircle,
    IconX,
    IconRefresh,
} from "@tabler/icons-react";

interface Alert {
    id: string;
    type: "info" | "warning" | "success" | "error";
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
}

export function AlertsPane() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch alerts from Zeus Memory (placeholder for now)
    const fetchAlerts = async () => {
        setLoading(true);
        try {
            // TODO: Integrate with Zeus Memory to fetch actual CCE alerts
            // For now, show demo alerts
            const demoAlerts: Alert[] = [
                {
                    id: "alert-1",
                    type: "info",
                    title: "Zeus Console Ready",
                    message: "Connected to Zeus Memory. Ready for commands.",
                    timestamp: new Date().toISOString(),
                    read: false,
                },
                {
                    id: "alert-2",
                    type: "success",
                    title: "Documents Synced",
                    message: "All documents are up to date with Zeus Memory.",
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    read: true,
                },
            ];
            setAlerts(demoAlerts);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const dismissAlert = (id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    };

    const markAsRead = (id: string) => {
        setAlerts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, read: true } : a))
        );
    };

    const unreadCount = alerts.filter((a) => !a.read).length;

    const getAlertIcon = (type: Alert["type"]) => {
        switch (type) {
            case "warning":
                return <IconAlertTriangle size={14} className="text-yellow-500" />;
            case "error":
                return <IconAlertTriangle size={14} className="text-red-500" />;
            case "success":
                return <IconCheck size={14} className="text-green-500" />;
            default:
                return <IconInfoCircle size={14} className="text-blue-500" />;
        }
    };

    const getAlertColor = (type: Alert["type"]) => {
        switch (type) {
            case "warning":
                return "yellow";
            case "error":
                return "red";
            case "success":
                return "green";
            default:
                return "blue";
        }
    };

    return (
        <Box className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            {/* Header */}
            <Box className="p-2 border-b border-gray-200 dark:border-gray-700">
                <Group justify="space-between">
                    <Group gap="xs">
                        <IconBell size={14} className="text-gray-500" />
                        <Text size="xs" fw={600}>
                            CCE Alerts
                        </Text>
                        {unreadCount > 0 && (
                            <Badge size="xs" color="red" variant="filled">
                                {unreadCount}
                            </Badge>
                        )}
                    </Group>
                    <Tooltip label="Refresh">
                        <ActionIcon
                            variant="subtle"
                            size="xs"
                            onClick={fetchAlerts}
                            loading={loading}
                        >
                            <IconRefresh size={12} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Box>

            {/* Alerts List */}
            <ScrollArea className="flex-1">
                {alerts.length > 0 ? (
                    <Box className="p-2 space-y-2">
                        {alerts.map((alert) => (
                            <Paper
                                key={alert.id}
                                p="xs"
                                withBorder
                                className={`cursor-pointer transition-opacity ${
                                    alert.read ? "opacity-60" : ""
                                }`}
                                onClick={() => markAsRead(alert.id)}
                            >
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="xs" wrap="nowrap">
                                        {getAlertIcon(alert.type)}
                                        <Box>
                                            <Text size="xs" fw={500} lineClamp={1}>
                                                {alert.title}
                                            </Text>
                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                {alert.message}
                                            </Text>
                                        </Box>
                                    </Group>
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dismissAlert(alert.id);
                                        }}
                                    >
                                        <IconX size={12} />
                                    </ActionIcon>
                                </Group>
                            </Paper>
                        ))}
                    </Box>
                ) : (
                    <Text size="xs" c="dimmed" ta="center" p="md">
                        No alerts
                    </Text>
                )}
            </ScrollArea>
        </Box>
    );
}
