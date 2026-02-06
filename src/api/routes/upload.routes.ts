/**
 * Upload routes
 */

import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

export function registerUploadRoutes(server: FastifyInstance): void {
  /**
   * POST /api/upload
   * Upload a file to a brain's intake directory
   */
  server.post('/api/upload', async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      reply.code(400);
      return { error: 'No file uploaded' };
    }

    const brainId = (data.fields?.brainId as any)?.value || 'default';
    const safeBrain = brainId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
    const intakeDir = path.join(process.cwd(), 'data', safeBrain, 'intake');
    
    if (!fs.existsSync(intakeDir)) {
      fs.mkdirSync(intakeDir, { recursive: true });
    }

    const filename = data.filename || `upload-${Date.now()}`;
    const outPath = path.join(intakeDir, filename);
    await fs.promises.writeFile(outPath, await data.toBuffer());

    return {
      success: true,
      brainId: safeBrain,
      path: outPath,
      filename,
    };
  });
}
