import { connectToDatabase } from '../../server/config/db';
import { jsonOk, jsonError } from '../../server/middleware/response';

/**
 * GET /api/health
 * Public health check returning server and MongoDB Atlas status.
 */
export async function GET(): Promise<Response> {
  try {
    const mongooseInstance = await connectToDatabase();
    const isConnected = mongooseInstance.connection.readyState === 1;

    return jsonOk({
      ok: true,
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
    });
  } catch (error) {
    return jsonError(
      'Database connection failed',
      503,
      error instanceof Error ? error.message : String(error)
    );
  }
}
