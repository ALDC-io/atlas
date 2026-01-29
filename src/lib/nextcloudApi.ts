// Nextcloud WebDAV API integration for Atlas
// Uses the Zeus Nextcloud account at cloud.aldc.io

export interface NextcloudFile {
    name: string;
    path: string;
    type: "file" | "directory";
    size: number;
    lastModified: string;
    mimeType?: string;
    etag?: string;
}

export interface NextcloudFileContent {
    path: string;
    content: string;
    mimeType: string;
    size: number;
    lastModified: string;
}

// Parse WebDAV XML response
function parseWebDAVResponse(xml: string): NextcloudFile[] {
    const files: NextcloudFile[] = [];

    // Simple XML parsing for WebDAV PROPFIND response
    const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/g;
    let match;

    while ((match = responseRegex.exec(xml)) !== null) {
        const response = match[1];

        // Extract href (path)
        const hrefMatch = response.match(/<d:href>([^<]+)<\/d:href>/);
        if (!hrefMatch) continue;

        const href = decodeURIComponent(hrefMatch[1]);

        // Skip the root directory itself
        const isCollection = response.includes("<d:collection/>");

        // Extract displayname
        const displayNameMatch = response.match(/<d:displayname>([^<]*)<\/d:displayname>/);
        const name = displayNameMatch ? displayNameMatch[1] : href.split("/").filter(Boolean).pop() || "";

        // Extract size
        const sizeMatch = response.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/);
        const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

        // Extract last modified
        const lastModMatch = response.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/);
        const lastModified = lastModMatch ? lastModMatch[1] : "";

        // Extract mime type
        const mimeMatch = response.match(/<d:getcontenttype>([^<]+)<\/d:getcontenttype>/);
        const mimeType = mimeMatch ? mimeMatch[1] : undefined;

        // Extract etag
        const etagMatch = response.match(/<d:getetag>"?([^"<]+)"?<\/d:getetag>/);
        const etag = etagMatch ? etagMatch[1] : undefined;

        files.push({
            name,
            path: href,
            type: isCollection ? "directory" : "file",
            size,
            lastModified,
            mimeType,
            etag,
        });
    }

    return files;
}

// Clean up the path to get relative path from WebDAV base
function cleanPath(fullPath: string, basePath: string): string {
    // Remove the WebDAV prefix and get relative path
    const webdavPrefix = "/remote.php/dav/files/";
    let path = fullPath;

    if (path.startsWith(webdavPrefix)) {
        // Remove prefix and username
        const afterPrefix = path.substring(webdavPrefix.length);
        const slashIndex = afterPrefix.indexOf("/");
        if (slashIndex !== -1) {
            path = afterPrefix.substring(slashIndex);
        }
    }

    return path;
}

// Client-side functions that call our API routes

export async function listNextcloudDirectory(path: string = "/"): Promise<NextcloudFile[]> {
    const response = await fetch("/api/nextcloud/list", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to list directory: ${response.statusText}`);
    }

    return response.json();
}

export async function getNextcloudFile(path: string): Promise<NextcloudFileContent> {
    const response = await fetch("/api/nextcloud/file", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to get file: ${response.statusText}`);
    }

    return response.json();
}

export async function saveNextcloudFile(path: string, content: string): Promise<void> {
    const response = await fetch("/api/nextcloud/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, content }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to save file: ${response.statusText}`);
    }
}

export async function createNextcloudDirectory(path: string): Promise<void> {
    const response = await fetch("/api/nextcloud/mkdir", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create directory: ${response.statusText}`);
    }
}

export async function deleteNextcloudItem(path: string): Promise<void> {
    const response = await fetch("/api/nextcloud/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete item: ${response.statusText}`);
    }
}

// Helper to check if a file is a text/markdown file
export function isTextFile(file: NextcloudFile): boolean {
    const textExtensions = [".md", ".txt", ".json", ".yaml", ".yml", ".xml", ".html", ".css", ".js", ".ts", ".py", ".sh"];
    const textMimeTypes = ["text/", "application/json", "application/xml", "application/javascript"];

    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (textExtensions.includes(ext)) return true;

    if (file.mimeType) {
        return textMimeTypes.some(type => file.mimeType!.startsWith(type));
    }

    return false;
}

// Helper to get file icon based on type
export function getFileIcon(file: NextcloudFile): string {
    if (file.type === "directory") return "folder";

    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    switch (ext) {
        case ".md": return "markdown";
        case ".txt": return "file-text";
        case ".json": return "braces";
        case ".pdf": return "file-type-pdf";
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".gif":
        case ".webp": return "photo";
        case ".mp4":
        case ".mov":
        case ".avi": return "video";
        case ".mp3":
        case ".wav":
        case ".flac": return "music";
        default: return "file";
    }
}

// Export the XML parser for server-side use
export { parseWebDAVResponse, cleanPath };
