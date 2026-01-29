import { NextRequest, NextResponse } from "next/server";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_ZEUS_URL || "https://cloud.aldc.io";
const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_ZEUS_USERNAME || "";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_ZEUS_PASSWORD || "";

export async function POST(request: NextRequest) {
    try {
        const { path, content } = await request.json();

        if (!path) {
            return NextResponse.json(
                { error: "Path is required" },
                { status: 400 }
            );
        }

        if (content === undefined) {
            return NextResponse.json(
                { error: "Content is required" },
                { status: 400 }
            );
        }

        if (!NEXTCLOUD_USERNAME || !NEXTCLOUD_PASSWORD) {
            return NextResponse.json(
                { error: "Nextcloud credentials not configured" },
                { status: 500 }
            );
        }

        // Build WebDAV URL
        const webdavPath = `/remote.php/dav/files/${NEXTCLOUD_USERNAME}${path}`;
        const url = `${NEXTCLOUD_URL}${webdavPath}`;

        // PUT request to save file
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Basic ${Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString("base64")}`,
                "Content-Type": "text/plain; charset=utf-8",
            },
            body: content,
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `WebDAV error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Nextcloud save error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to save file" },
            { status: 500 }
        );
    }
}
