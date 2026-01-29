import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const ZEUS_API_URL = process.env.NEXT_PUBLIC_ZEUS_API_URL || "https://zeus.aldc.io";
const ZEUS_API_KEY = process.env.ZEUS_API_KEY || process.env.NEXT_PUBLIC_ZEUS_API_KEY || "";

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
    {
        name: "search_zeus_memory",
        description: "Search Zeus Memory for relevant information, documents, decisions, or historical data. Use this to find information that might help answer the user's question or provide context.",
        input_schema: {
            type: "object" as const,
            properties: {
                query: {
                    type: "string",
                    description: "The search query to find relevant memories",
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results to return (default: 5)",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "store_to_zeus_memory",
        description: "Store important information, decisions, or learnings to Zeus Memory for future reference.",
        input_schema: {
            type: "object" as const,
            properties: {
                content: {
                    type: "string",
                    description: "The content to store in memory",
                },
                source: {
                    type: "string",
                    description: "The source of this information (default: 'atlas-zeus-console')",
                },
                metadata: {
                    type: "object",
                    description: "Optional metadata to attach to the memory",
                },
            },
            required: ["content"],
        },
    },
];

// Execute tool calls
async function executeToolCall(
    toolName: string,
    toolInput: Record<string, unknown>
): Promise<string> {
    try {
        if (toolName === "search_zeus_memory") {
            const query = toolInput.query as string;
            const limit = (toolInput.limit as number) || 5;

            const response = await fetch(`${ZEUS_API_URL}/api/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": ZEUS_API_KEY,
                },
                body: JSON.stringify({
                    query,
                    limit,
                }),
            });

            if (!response.ok) {
                return `Failed to search Zeus Memory: ${response.statusText}`;
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                return "No relevant memories found.";
            }

            // Format results
            const results = data.results.map((r: { content: string; source: string; created_at: string }, i: number) =>
                `[${i + 1}] ${r.content.slice(0, 500)}${r.content.length > 500 ? "..." : ""}\n   Source: ${r.source} | Created: ${r.created_at}`
            ).join("\n\n");

            return `Found ${data.results.length} relevant memories:\n\n${results}`;
        }

        if (toolName === "store_to_zeus_memory") {
            const content = toolInput.content as string;
            const source = (toolInput.source as string) || "atlas-zeus-console";
            const metadata = (toolInput.metadata as Record<string, unknown>) || {};

            const response = await fetch(`${ZEUS_API_URL}/api/store`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": ZEUS_API_KEY,
                },
                body: JSON.stringify({
                    content,
                    source,
                    metadata: {
                        ...metadata,
                        stored_via: "atlas-zeus-console",
                        stored_at: new Date().toISOString(),
                    },
                }),
            });

            if (!response.ok) {
                return `Failed to store to Zeus Memory: ${response.statusText}`;
            }

            const data = await response.json();
            return `Successfully stored to Zeus Memory with ID: ${data.memory_id}`;
        }

        return `Unknown tool: ${toolName}`;
    } catch (error) {
        console.error(`Tool execution error for ${toolName}:`, error);
        return `Error executing ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 }
            );
        }

        // Build system prompt with context
        let systemPrompt = `You are Zeus Console, an AI assistant integrated into Atlas - a document workspace powered by Zeus Memory.

You have access to Zeus Memory - a persistent memory system that stores documents, decisions, learnings, and historical data for the ALDC organization. You can:
1. SEARCH Zeus Memory to find relevant information, past decisions, project history, and organizational knowledge
2. STORE important information to Zeus Memory for future reference

When users ask questions, consider whether searching Zeus Memory might provide helpful context or historical information. Be proactive about using your tools.

Your other capabilities:
- Create new documents on any topic
- Suggest improvements and revisions to existing content
- Generate subtopics and expand on ideas
- Answer questions about document content
- Help with research and writing

Be concise, helpful, and focus on producing high-quality markdown content when creating or editing documents.`;

        if (context?.nodeTitle || context?.nodeContent) {
            systemPrompt += `\n\nCurrent Document Context:`;
            if (context.nodeTitle) {
                systemPrompt += `\nTitle: ${context.nodeTitle}`;
            }
            if (context.nodeContent) {
                systemPrompt += `\nContent:\n${context.nodeContent.slice(0, 4000)}`;
            }
        }

        // Initial API call with tools
        let response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages: messages.map((m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
        });

        // Handle tool use loop
        const conversationMessages: Anthropic.MessageParam[] = messages.map(
            (m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })
        );

        while (response.stop_reason === "tool_use") {
            // Find tool use blocks
            const toolUseBlocks = response.content.filter(
                (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
            );

            // Add assistant's response with tool use
            conversationMessages.push({
                role: "assistant",
                content: response.content,
            });

            // Execute tools and collect results
            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                toolUseBlocks.map(async (toolUse) => ({
                    type: "tool_result" as const,
                    tool_use_id: toolUse.id,
                    content: await executeToolCall(
                        toolUse.name,
                        toolUse.input as Record<string, unknown>
                    ),
                }))
            );

            // Add tool results as user message
            conversationMessages.push({
                role: "user",
                content: toolResults,
            });

            // Continue the conversation
            response = await anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                system: systemPrompt,
                tools,
                messages: conversationMessages,
            });
        }

        // Extract final text response
        const textBlock = response.content.find(
            (block): block is Anthropic.TextBlock => block.type === "text"
        );

        const content = textBlock?.text || "";

        return NextResponse.json({ content });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Failed to generate response" },
            { status: 500 }
        );
    }
}
