const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PROVIDER_PORT || 5656;
const API_KEY = process.env.AUTHENTICATION_API_KEY || process.env.API_KEY || 'BQYHJGJHJ';
const STORAGE_DIR = process.env.PROVIDER_STORAGE_DIR || '/app/storage';
const PREFIX = process.env.PROVIDER_PREFIX || 'evolution';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Auth middleware
const authMiddleware = (req, res, next) => {
  const apikey = req.headers.apikey;
  if (apikey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Health check
app.options('/ping', (req, res) => {
  res.send('pong');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

// Create group
app.post('/session', authMiddleware, async (req, res) => {
  const { group } = req.body;
  const groupPath = path.join(STORAGE_DIR, group || PREFIX);
  try {
    await fs.mkdir(groupPath, { recursive: true });
    res.json({ status: 'ok', message: 'Group created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create instance
app.post('/session/:prefix/:instance', authMiddleware, async (req, res) => {
  const { prefix, instance } = req.params;
  const instancePath = path.join(STORAGE_DIR, prefix, instance);
  try {
    await fs.mkdir(instancePath, { recursive: true });
    res.json({ status: 'ok', message: 'Instance created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write data
app.post('/session/:prefix/:instance/:key', authMiddleware, async (req, res) => {
  const { prefix, instance, key } = req.params;
  let data = req.body.data;
  
  // Handle both JSON and text formats
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  
  const filePath = path.join(STORAGE_DIR, prefix, instance, `${key}.json`);
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data, 'utf8');
    res.json({ status: 'ok', message: 'Data written' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read data
app.get('/session/:prefix/:instance/:key', authMiddleware, async (req, res) => {
  const { prefix, instance, key } = req.params;
  const filePath = path.join(STORAGE_DIR, prefix, instance, `${key}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    res.json({ data });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete key
app.delete('/session/:prefix/:instance/:key', authMiddleware, async (req, res) => {
  const { prefix, instance, key } = req.params;
  const filePath = path.join(STORAGE_DIR, prefix, instance, `${key}.json`);
  try {
    await fs.unlink(filePath);
    res.json({ status: 'ok', message: 'Key deleted' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete instance
app.delete('/session/:prefix/:instance', authMiddleware, async (req, res) => {
  const { prefix, instance } = req.params;
  const instancePath = path.join(STORAGE_DIR, prefix, instance);
  try {
    await fs.rm(instancePath, { recursive: true, force: true });
    res.json({ status: 'ok', message: 'Instance deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List instances
app.get('/session/:prefix/list-instances', authMiddleware, async (req, res) => {
  const { prefix } = req.params;
  const prefixPath = path.join(STORAGE_DIR, prefix);
  try {
    const items = await fs.readdir(prefixPath, { withFileTypes: true });
    const instances = items
      .filter(item => item.isDirectory())
      .map(item => item.name);
    res.json(instances);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json([]);
    }
    res.status(500).json({ error: error.message });
  }
});

// Initialize storage directory
async function init() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    console.log(`Storage directory initialized: ${STORAGE_DIR}`);
  } catch (error) {
    console.error('Failed to initialize storage directory:', error);
  }
}

const server = app.listen(PORT, async () => {
  await init();
  console.log(`Provider Files Server running on port ${PORT}`);
  console.log(`API Key: ${API_KEY.substring(0, 5)}...`);
  console.log(`Storage: ${STORAGE_DIR}`);
  console.log(`Prefix: ${PREFIX}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

