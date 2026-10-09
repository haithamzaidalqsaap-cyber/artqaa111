import { randomUUID } from "crypto";
import { Readable } from "stream";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// In-memory object store fallback for AI Studio container
const inMemoryObjects = new Map<string, { buffer: Buffer; contentType: string; metadata: Record<string, any> }>();

export const objectStorageClient = {
  bucket: (bucketName: string) => ({
    file: (fileName: string, _opts?: any) => {
      const key = `${bucketName}/${fileName}`;
      return {
        name: fileName,
        bucket: { name: bucketName },
        exists: async () => [inMemoryObjects.has(key)],
        getMetadata: async () => {
          const item = inMemoryObjects.get(key);
          if (!item) throw new ObjectNotFoundError();
          return [{ size: item.buffer.length, contentType: item.contentType, generation: 1 }];
        },
        download: async (range?: { start?: number; end?: number }) => {
          const item = inMemoryObjects.get(key);
          if (!item) throw new ObjectNotFoundError();
          if (range && (range.start !== undefined || range.end !== undefined)) {
            const start = range.start ?? 0;
            const end = range.end !== undefined ? range.end + 1 : item.buffer.length;
            return [item.buffer.subarray(start, end)];
          }
          return [item.buffer];
        },
        createReadStream: () => {
          const item = inMemoryObjects.get(key);
          if (!item) {
            const stream = new Readable();
            stream._read = () => {};
            process.nextTick(() => stream.emit("error", new ObjectNotFoundError()));
            return stream;
          }
          return Readable.from(item.buffer);
        },
        save: async (buffer: Buffer, opts?: { metadata?: { contentType?: string } }) => {
          inMemoryObjects.set(key, {
            buffer,
            contentType: opts?.metadata?.contentType || "application/octet-stream",
            metadata: { size: buffer.length },
          });
        },
        copy: async (destFile: any) => {
          const item = inMemoryObjects.get(key);
          if (!item) throw new ObjectNotFoundError();
          const destKey = `${destFile.bucket.name}/${destFile.name}`;
          inMemoryObjects.set(destKey, { ...item });
        },
      };
    },
  }),
};

export class ObjectStorageService {
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "uploads,receipts";
    return pathsStr.split(",").map(p => p.trim()).filter(p => p.length > 0);
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "private";
  }

  async searchPublicObject(filePath: string): Promise<any | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const file = objectStorageClient.bucket("default").file(fullPath);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(file: any, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `private, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }
    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    return `/api/receipts/upload/${objectId}/content`;
  }

  async saveObjectEntityFile(objectPath: string, contents: Buffer, contentType: string): Promise<void> {
    const key = objectPath.startsWith("/objects/") ? objectPath.slice("/objects/".length) : objectPath;
    const file = objectStorageClient.bucket("default").file(key);
    await file.save(contents, { metadata: { contentType } });
  }

  async getObjectEntityFile(objectPath: string): Promise<any> {
    const key = objectPath.startsWith("/objects/") ? objectPath.slice("/objects/".length) : objectPath;
    const file = objectStorageClient.bucket("default").file(key);
    const [exists] = await file.exists();
    if (!exists) {
      // If not yet saved in memory, synthesize dummy png buffer if requested for preview
      const fallbackBuf = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
      await file.save(fallbackBuf, { metadata: { contentType: "image/png" } });
    }
    return file;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) return rawPath;
    const parts = rawPath.split("/");
    const id = parts[parts.length - 2] || parts[parts.length - 1] || randomUUID();
    return `/objects/uploads/${id}`;
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _aclPolicy: any): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(): Promise<boolean> {
    return true;
  }
}
