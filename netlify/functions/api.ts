import serverless from 'serverless-http';
import app from '../../server';

// Wrap the Express app with serverless-http
export const handler = serverless(app);
