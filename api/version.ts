export default function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).json({
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
}
