"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Text, Loader, Badge, Group, Paper, Button, Stack, ActionIcon } from "@mantine/core";
import { IconZoomIn, IconZoomOut, IconHome, IconInfoCircle } from "@tabler/icons-react";
import Graph from "graphology";
import Sigma from "sigma";
import {
    getOverview,
    getL2Detail,
    getL1Detail,
    getMemoryDetail,
    getCategoryColor,
    type ClusterInfo,
    type MemoryInfo,
    type MemoryDetailResponse,
} from "@/lib/athenaApi";

type ZoomLevel = "l2" | "l1" | "memories";

interface BreadcrumbItem {
    level: ZoomLevel;
    id: string;
    label: string;
}

interface SelectedNode {
    id: string;
    type: "cluster" | "memory";
    label: string;
    data: ClusterInfo | MemoryInfo | MemoryDetailResponse | null;
}

export function SigmaGraph() {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const graphRef = useRef<Graph | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("l2");
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
        { level: "l2", id: "root", label: "All Domains" },
    ]);
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
    const [stats, setStats] = useState({ nodes: 0, edges: 0 });

    // Initialize graph and sigma
    useEffect(() => {
        if (!containerRef.current) return;

        const graph = new Graph();
        graphRef.current = graph;

        const sigma = new Sigma(graph, containerRef.current, {
            renderLabels: true,
            labelFont: "Inter, sans-serif",
            labelSize: 12,
            labelWeight: "500",
            labelColor: { color: "#ffffff" },
            defaultNodeColor: "#718096",
            defaultEdgeColor: "#4a5568",
            minCameraRatio: 0.1,
            maxCameraRatio: 10,
        });
        sigmaRef.current = sigma;

        // Handle node clicks
        sigma.on("clickNode", async ({ node }) => {
            const nodeData = graph.getNodeAttributes(node);
            await handleNodeClick(node, nodeData);
        });

        // Handle background click to deselect
        sigma.on("clickStage", () => {
            setSelectedNode(null);
        });

        // Load initial L2 overview
        loadL2Overview();

        return () => {
            sigma.kill();
        };
    }, []);

    // Load L2 cluster overview
    const loadL2Overview = useCallback(async () => {
        if (!graphRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await getOverview();
            const graph = graphRef.current;

            graph.clear();

            // Add L2 cluster nodes
            data.clusters.forEach((cluster) => {
                graph.addNode(cluster.id, {
                    x: cluster.x,
                    y: cluster.y,
                    size: Math.max(5, Math.min(30, Math.sqrt(cluster.size) * 2)),
                    label: cluster.label,
                    color: cluster.color || "#718096",
                    nodeType: "cluster",
                    level: "l2",
                    clusterSize: cluster.size,
                });
            });

            // Add edges between nearby clusters (visual connections)
            const nodes = graph.nodes();
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = graph.getNodeAttributes(nodes[i]);
                    const n2 = graph.getNodeAttributes(nodes[j]);
                    const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
                    if (dist < 50) {
                        graph.addEdge(nodes[i], nodes[j], {
                            size: 0.5,
                            color: "#2d3748",
                        });
                    }
                }
            }

            setStats({ nodes: graph.order, edges: graph.size });
            setZoomLevel("l2");
            setBreadcrumbs([{ level: "l2", id: "root", label: "All Domains" }]);
            setSelectedNode(null);

            sigmaRef.current?.refresh();
            sigmaRef.current?.getCamera().animate({ ratio: 1, x: 0.5, y: 0.5 }, { duration: 500 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load L1 clusters within an L2
    const loadL1Clusters = useCallback(async (l2Id: string, l2Label: string) => {
        if (!graphRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await getL2Detail(l2Id);
            const graph = graphRef.current;

            graph.clear();

            // Add L1 cluster nodes
            data.l1_clusters.forEach((cluster) => {
                graph.addNode(cluster.id, {
                    x: cluster.x,
                    y: cluster.y,
                    size: Math.max(4, Math.min(25, Math.sqrt(cluster.size) * 1.5)),
                    label: cluster.label,
                    color: cluster.color || "#4299e1",
                    nodeType: "cluster",
                    level: "l1",
                    clusterSize: cluster.size,
                    parentL2: l2Id,
                });
            });

            // Add edges between nearby L1 clusters
            const nodes = graph.nodes();
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = graph.getNodeAttributes(nodes[i]);
                    const n2 = graph.getNodeAttributes(nodes[j]);
                    const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
                    if (dist < 30) {
                        graph.addEdge(nodes[i], nodes[j], {
                            size: 0.3,
                            color: "#2d3748",
                        });
                    }
                }
            }

            setStats({ nodes: graph.order, edges: graph.size });
            setZoomLevel("l1");
            setBreadcrumbs([
                { level: "l2", id: "root", label: "All Domains" },
                { level: "l1", id: l2Id, label: l2Label },
            ]);
            setSelectedNode(null);

            sigmaRef.current?.refresh();
            sigmaRef.current?.getCamera().animate({ ratio: 1, x: 0.5, y: 0.5 }, { duration: 500 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load L1 clusters");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load memories within an L1 cluster
    const loadMemories = useCallback(async (l1Id: string, l1Label: string, parentL2: string) => {
        if (!graphRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await getL1Detail(l1Id, 200);
            const graph = graphRef.current;

            graph.clear();

            // Add memory nodes
            data.memories.forEach((memory) => {
                graph.addNode(memory.id, {
                    x: memory.x,
                    y: memory.y,
                    size: 3,
                    label: memory.content_preview.substring(0, 30) + "...",
                    color: getCategoryColor(memory.category),
                    nodeType: "memory",
                    level: "memory",
                    category: memory.category,
                    content_preview: memory.content_preview,
                    parentL1: l1Id,
                    parentL2: parentL2,
                });
            });

            setStats({ nodes: graph.order, edges: 0 });
            setZoomLevel("memories");
            setBreadcrumbs((prev) => [
                ...prev.slice(0, 2),
                { level: "memories", id: l1Id, label: l1Label },
            ]);
            setSelectedNode(null);

            sigmaRef.current?.refresh();
            sigmaRef.current?.getCamera().animate({ ratio: 1, x: 0.5, y: 0.5 }, { duration: 500 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load memories");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle node click - zoom in or show details
    const handleNodeClick = useCallback(
        async (nodeId: string, nodeData: Record<string, unknown>) => {
            const level = nodeData.level as string;
            const nodeType = nodeData.nodeType as string;

            if (nodeType === "cluster") {
                if (level === "l2") {
                    // Zoom into L2 -> show L1 clusters
                    await loadL1Clusters(nodeId, nodeData.label as string);
                } else if (level === "l1") {
                    // Zoom into L1 -> show memories
                    await loadMemories(
                        nodeId,
                        nodeData.label as string,
                        nodeData.parentL2 as string
                    );
                }
            } else if (nodeType === "memory") {
                // Show memory details in sidebar
                try {
                    const detail = await getMemoryDetail(nodeId);
                    setSelectedNode({
                        id: nodeId,
                        type: "memory",
                        label: nodeData.label as string,
                        data: detail,
                    });
                } catch (err) {
                    console.error("Failed to load memory details:", err);
                    // Use available data from the node attributes
                    setSelectedNode({
                        id: nodeId,
                        type: "memory",
                        label: nodeData.label as string,
                        data: {
                            id: nodeId,
                            x: nodeData.x as number,
                            y: nodeData.y as number,
                            content_preview: nodeData.content_preview as string || "",
                            category: nodeData.category as string || "",
                            cluster_l1: nodeData.parentL1 as string || "",
                            cluster_l2: nodeData.parentL2 as string || "",
                        } as MemoryInfo,
                    });
                }
            }
        },
        [loadL1Clusters, loadMemories]
    );

    // Navigate via breadcrumb
    const handleBreadcrumbClick = useCallback(
        async (item: BreadcrumbItem, index: number) => {
            if (index === 0) {
                // Go back to L2 overview
                await loadL2Overview();
            } else if (index === 1 && item.level === "l1") {
                // Go back to L1 view
                await loadL1Clusters(item.id, item.label);
            }
        },
        [loadL2Overview, loadL1Clusters]
    );

    // Zoom controls
    const handleZoomIn = () => {
        const camera = sigmaRef.current?.getCamera();
        if (camera) {
            camera.animate({ ratio: camera.ratio / 1.5 }, { duration: 200 });
        }
    };

    const handleZoomOut = () => {
        const camera = sigmaRef.current?.getCamera();
        if (camera) {
            camera.animate({ ratio: camera.ratio * 1.5 }, { duration: 200 });
        }
    };

    const handleResetView = () => {
        sigmaRef.current?.getCamera().animate({ ratio: 1, x: 0.5, y: 0.5 }, { duration: 300 });
    };

    return (
        <Box className="h-full flex bg-gray-900">
            {/* Main Graph Area */}
            <Box className="flex-1 flex flex-col">
                {/* Header with breadcrumbs and controls */}
                <Box className="p-2 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
                    <Group gap="xs">
                        {breadcrumbs.map((item, index) => (
                            <Group gap={4} key={item.id}>
                                {index > 0 && <Text c="dimmed">/</Text>}
                                <Button
                                    size="xs"
                                    variant={index === breadcrumbs.length - 1 ? "filled" : "subtle"}
                                    color="blue"
                                    onClick={() => handleBreadcrumbClick(item, index)}
                                >
                                    {item.label}
                                </Button>
                            </Group>
                        ))}
                    </Group>

                    <Group gap="xs">
                        <Badge size="sm" variant="outline" color="gray">
                            {stats.nodes} nodes
                        </Badge>
                        <ActionIcon variant="subtle" color="gray" onClick={handleZoomIn}>
                            <IconZoomIn size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="gray" onClick={handleZoomOut}>
                            <IconZoomOut size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="gray" onClick={handleResetView}>
                            <IconHome size={16} />
                        </ActionIcon>
                    </Group>
                </Box>

                {/* Graph container */}
                <Box className="flex-1 relative">
                    {isLoading && (
                        <Box className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                            <Box className="text-center">
                                <Loader size="md" color="blue" mb="sm" />
                                <Text size="sm" c="dimmed">
                                    Loading {zoomLevel === "l2" ? "domains" : zoomLevel === "l1" ? "topics" : "memories"}...
                                </Text>
                            </Box>
                        </Box>
                    )}

                    {error && (
                        <Box className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                            <Paper p="lg" bg="red.9" withBorder>
                                <Text c="white">{error}</Text>
                                <Button mt="sm" size="xs" onClick={loadL2Overview}>
                                    Retry
                                </Button>
                            </Paper>
                        </Box>
                    )}

                    <div
                        ref={containerRef}
                        className="w-full h-full"
                        style={{ background: "#0a0a1a" }}
                    />

                    {/* Zoom level indicator */}
                    <Box className="absolute bottom-4 left-4 bg-gray-800/80 px-3 py-2 rounded">
                        <Text size="xs" c="dimmed">
                            Level: {zoomLevel === "l2" ? "Domains (L2)" : zoomLevel === "l1" ? "Topics (L1)" : "Memories"}
                        </Text>
                        <Text size="xs" c="dimmed">
                            Click a node to zoom in
                        </Text>
                    </Box>
                </Box>
            </Box>

            {/* Details Sidebar */}
            <Box className="w-80 border-l border-gray-700 flex flex-col bg-gray-900">
                <Box className="p-3 border-b border-gray-700 bg-gray-800">
                    <Group gap="xs">
                        <IconInfoCircle size={16} className="text-gray-400" />
                        <Text size="sm" fw={500} c="white">
                            Details
                        </Text>
                    </Group>
                </Box>

                <Box className="flex-1 p-3 overflow-y-auto">
                    {selectedNode ? (
                        <Stack gap="sm">
                            <Badge
                                size="sm"
                                color={selectedNode.type === "memory" ? "green" : "blue"}
                            >
                                {selectedNode.type === "memory" ? "Memory" : "Cluster"}
                            </Badge>

                            <Text fw={600} c="white">
                                {selectedNode.label}
                            </Text>

                            {selectedNode.type === "memory" && selectedNode.data && "content" in selectedNode.data && (
                                <>
                                    <Box>
                                        <Text size="xs" c="dimmed" mb={4}>
                                            Category
                                        </Text>
                                        <Badge size="sm" color="gray">
                                            {(selectedNode.data as MemoryDetailResponse).category}
                                        </Badge>
                                    </Box>

                                    <Box>
                                        <Text size="xs" c="dimmed" mb={4}>
                                            Content
                                        </Text>
                                        <Text
                                            size="sm"
                                            c="gray.3"
                                            style={{ whiteSpace: "pre-wrap" }}
                                        >
                                            {(selectedNode.data as MemoryDetailResponse).content}
                                        </Text>
                                    </Box>

                                    <Box>
                                        <Text size="xs" c="dimmed" mb={4}>
                                            Created
                                        </Text>
                                        <Text size="sm" c="gray.4">
                                            {new Date(
                                                (selectedNode.data as MemoryDetailResponse).created_at
                                            ).toLocaleString()}
                                        </Text>
                                    </Box>
                                </>
                            )}
                        </Stack>
                    ) : (
                        <Box className="text-center py-8">
                            <IconInfoCircle size={32} className="mx-auto mb-2 text-gray-600" />
                            <Text size="sm" c="dimmed">
                                Click on a node to view details
                            </Text>
                            <Text size="xs" c="dimmed" mt="xs">
                                Double-click clusters to zoom in
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
