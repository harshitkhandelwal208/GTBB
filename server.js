import express from "express";

const app = express();

// Middleware for JSON parsing
app.use(express.json());

// Enable trust proxy for Render hosting
app.set('trust proxy', 1);

// Basic alive endpoint for UptimeRobot and basic checks
app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

// Comprehensive health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Render-specific health check endpoint (sometimes used by Render)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Status endpoint with more detailed info
app.get("/status", (req, res) => {
  res.json({
    service: "Discord Bot - Guess The BaseBuilder",
    status: "running",
    uptime: process.uptime(),
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version
  });
});

// Handle 404 for unknown routes (removed problematic catch-all)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'This endpoint does not exist',
    availableEndpoints: ['/', '/health', '/ping', '/status']
  });
});

export function keepAlive() {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0'; // Render requires 0.0.0.0 binding
  
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
    console.log(`Health check available at: http://${HOST}:${PORT}/health`);
  });

  // Graceful shutdown handling for Render
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down server gracefully');
    server.close(() => {
      console.log('Server closed');
    });
  });

  // Error handling for server
  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  return server;
}