import { NextRequest, NextResponse } from "next/server";
import { parseWebDAVResponse, cleanPath, type NextcloudFile } from "@/lib/nextcloudApi";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_ZEUS_URL || "https://cloud.aldc.io";
const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_ZEUS_USERNAME || "";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_ZEUS_PASSWORD || "";

export async function POST(request: NextRequest) {
    try {
        const { path = "/" } = await request.json();

        if (!NEXTCLOUD_USERNAME || !NEXTCLOUD_PASSWORD) {
            return NextResponse.json(
                { error: "Nextcloud credentials not configured" },
                { status: 500 }
            );
        }

        // Build WebDAV URL
        const webdavPath = `/remote.php/dav/files/${NEXTCLOUD_USERNAME}${path}`;
        const url = `${NEXTCLOUD_URL}${webdavPath}`;

        // PROPFIND request to list directory
        const response = await fetch(url, {
            method: "PROPFIND",
            headers: {
                "Authorization": `Basic ${Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString("base64")}`,
                "Depth": "1",
                "Content-Type": "application/xml",
            },
            body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
    <d:prop>
        <d:displayname/>
        <d:getcontentlength/>
        <d:getlastmodified/>
        <d:getcontenttype/>
        <d:getetag/>
        <d:resourcetype/>
    </d:prop>
</d:propfind>`,
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: "Directory not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: `WebDAV error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const xml = await response.text();
        const files = parseWebDAVResponse(xml);

        // Clean up paths and filter out the current directory
        const cleanedFiles: NextcloudFile[] = files
            .map(file => ({
                ...file,
                path: cleanPath(file.path, webdavPath),
            }))
            .filter(file => file.path !== path && file.path !== path + "/")
            .sort((a, b) => {
                // Directories first, then alphabetical
                if (a.type !== b.type) {
                    return a.type === "directory" ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

        return NextResponse.json(cleanedFiles);
    } catch (error) {
        console.error("Nextcloud list error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to list directory" },
            { status: 500 }
        );
    }
}
