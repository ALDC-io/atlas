import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

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
        let systemPrompt = `You are Zeus Console, an AI assistant integrated into Atlas - a document workspace. You help users create, edit, and improve their documents.

Your capabilities:
- Create new documents on any topic
- Suggest improvements and revisions to existing content
- Generate subtopics and expand on ideas
- Answer questions about the document content
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

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages: messages.map((m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
        });

        const content =
            response.content[0].type === "text"
                ? response.content[0].text
                : "";

        return NextResponse.json({ content });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Failed to generate response" },
            { status: 500 }
        );
    }
}
