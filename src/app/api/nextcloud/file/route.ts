import { NextRequest, NextResponse } from "next/server";
import type { NextcloudFileContent } from "@/lib/nextcloudApi";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_ZEUS_URL || "https://cloud.aldc.io";
const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_ZEUS_USERNAME || "";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_ZEUS_PASSWORD || "";

export async function POST(request: NextRequest) {
    try {
        const { path } = await request.json();

        if (!path) {
            return NextResponse.json(
                { error: "Path is required" },
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

        // GET request to fetch file content
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString("base64")}`,
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: "File not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: `WebDAV error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const content = await response.text();
        const mimeType = response.headers.get("Content-Type") || "text/plain";
        const contentLength = response.headers.get("Content-Length");
        const lastModified = response.headers.get("Last-Modified") || new Date().toISOString();

        const fileContent: NextcloudFileContent = {
            path,
            content,
            mimeType,
            size: contentLength ? parseInt(contentLength, 10) : content.length,
            lastModified,
        };

        return NextResponse.json(fileContent);
    } catch (error) {
        console.error("Nextcloud file error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get file" },
            { status: 500 }
        );
    }
}
