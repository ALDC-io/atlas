import { NextRequest, NextResponse } from "next/server";

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

        // MKCOL request to create directory
        const response = await fetch(url, {
            method: "MKCOL",
            headers: {
                "Authorization": `Basic ${Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString("base64")}`,
            },
        });

        if (!response.ok) {
            if (response.status === 405) {
                return NextResponse.json(
                    { error: "Directory already exists" },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: `WebDAV error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Nextcloud mkdir error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create directory" },
            { status: 500 }
        );
    }
}
