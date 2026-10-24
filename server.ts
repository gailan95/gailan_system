process.env.DISABLE_HMR = 'true';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// In-memory rate limiter to protect against brute-force and DoS attacks
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function apiRateLimiter(maxRequests = 120, windowMs = 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    return next();
  };
}

import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side recursive payload sanitizer to neutralize malicious scripts and prototype pollution
function sanitizeServerPayload(obj: any, depth = 0): any {
  if (depth > 20 || obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return obj
      .replace(/\0/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeServerPayload(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Disallow prototype pollution attacks
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = sanitizeServerPayload(obj[key], depth + 1);
    }
    return clean;
  }

  return obj;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Apply rate limiting to all /api routes
  app.use('/api', apiRateLimiter(150, 60 * 1000));

  // Middleware for parsing JSON requests with strict limits
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Ensure data directory exists
  const DATA_DIR = path.join(process.cwd(), 'data');
  const DB_FILE = path.join(DATA_DIR, 'database.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Central Server Clock Synchronization endpoint (NTP-style)
  app.get('/api/time', (req, res) => {
    const now = Date.now();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.json({
      serverTimestamp: now,
      serverTime: new Date(now).toISOString(),
      uptime: process.uptime(),
    });
  });

  // In-memory cache for fast API database reads with TTL & ETag calculation
  let cachedDatabaseContent: string | null = null;
  let cachedDatabaseETag: string | null = null;
  let cachedDatabaseParsed: any = null;
  let cacheLastUpdated = 0;
  const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache TTL

  // Helper to calculate simple MD5-like hash string for ETags
  function generateETag(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `W/"${Math.abs(hash).toString(36)}-${content.length}"`;
  }

  function invalidateServerCache() {
    cachedDatabaseContent = null;
    cachedDatabaseETag = null;
    cachedDatabaseParsed = null;
    cacheLastUpdated = 0;
  }

  // GET /api/database - Load persistent server database with ETag & Stale-While-Revalidate HTTP caching
  app.get('/api/database', (req, res) => {
    try {
      const now = Date.now();

      // Check if memory cache is valid
      if (cachedDatabaseContent && cachedDatabaseETag && now - cacheLastUpdated < CACHE_TTL_MS) {
        // ETag conditional validation (304 Not Modified)
        const clientETag = req.headers['if-none-match'];
        if (clientETag && clientETag === cachedDatabaseETag) {
          res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
          res.setHeader('ETag', cachedDatabaseETag);
          return res.status(304).end();
        }

        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
        res.setHeader('ETag', cachedDatabaseETag);
        return res.setHeader('Content-Type', 'application/json').send(cachedDatabaseContent);
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const etag = generateETag(fileContent);

        cachedDatabaseContent = JSON.stringify({ success: true, data: JSON.parse(fileContent) });
        cachedDatabaseETag = etag;
        cachedDatabaseParsed = JSON.parse(fileContent);
        cacheLastUpdated = now;

        const clientETag = req.headers['if-none-match'];
        if (clientETag && clientETag === etag) {
          res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
          res.setHeader('ETag', etag);
          return res.status(304).end();
        }

        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
        res.setHeader('ETag', etag);
        return res.setHeader('Content-Type', 'application/json').send(cachedDatabaseContent);
      }

      return res.json({ success: true, data: null });
    } catch (error) {
      console.error('Error reading server database:', error);
      return res.status(500).json({ success: false, error: 'Failed to read database' });
    }
  });

  // GET /api/database/summary - Ultra-lightweight initial render API endpoint with aggressive caching
  app.get('/api/database/summary', (req, res) => {
    try {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      
      let dbData = cachedDatabaseParsed;
      if (!dbData && fs.existsSync(DB_FILE)) {
        dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      }

      if (dbData) {
        const summary = {
          productsCount: dbData.products?.length || 0,
          customersCount: dbData.customers?.length || 0,
          salesCount: dbData.sales?.length || 0,
          settings: dbData.settings || null,
          products: (dbData.products || []).slice(0, 50), // Send first 50 items for instant UI render
          customers: (dbData.customers || []).slice(0, 50),
          savedAt: dbData.savedAt || new Date().toISOString(),
        };
        return res.json({ success: true, summary });
      }

      return res.json({ success: true, summary: null });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch summary' });
    }
  });

  // POST /api/database - Save entire database persistently to server disk with validation & cache invalidation
  app.post('/api/database', (req, res) => {
    try {
      const rawPayload = req.body;
      if (!rawPayload || typeof rawPayload !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid database payload' });
      }

      // Sanitize incoming payload before persisting
      const sanitizedPayload = sanitizeServerPayload(rawPayload);

      // Atomic write to prevent file corruption
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(sanitizedPayload, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);

      // Invalidate server memory cache on update
      invalidateServerCache();

      return res.json({
        success: true,
        savedAt: new Date().toISOString(),
        message: 'Database saved successfully and securely on server',
      });
    } catch (error) {
      console.error('Error saving server database:', error);
      return res.status(500).json({ success: false, error: 'Failed to save database' });
    }
  });

  // Gemini endpoint for dynamic promotional offers
  app.post('/api/gemini/offer', async (req, res) => {
    try {
      const { season, context } = req.body;
      
      const prompt = `You are a creative marketing expert for a fruit and vegetable market in Kurdistan.
      Generate a catchy, short promotional offer title and description in Central Kurdish (Sorani).
      The season is ${season}. Context: ${context || 'General fresh products'}.
      Include a specific deal (e.g., 20% discount on strawberries, buy 2 get 1 free on watermelons).
      Output the result in JSON format with 'title' and 'description' keys.
      The tone should be professional and attractive.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "description"],
          },
        },
      });

      const text = response.text;
      if (text) {
        return res.json({ success: true, offer: JSON.parse(text) });
      }
      
      throw new Error('No content generated');
    } catch (error: any) {
      console.error('Gemini error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to generate offer' });
    }
  });

  // Gemini endpoint for dynamic promotional image generation
  app.post('/api/gemini/generate-ad-image', async (req, res) => {
    try {
      const { season, offerTitle, offerDescription } = req.body;

      const prompt = `A professional, high-quality promotional banner for a fruit and vegetable market.
      Season: ${season}. 
      Theme: ${offerTitle}. 
      Details: ${offerDescription}.
      The image should show fresh, vibrant fruits and vegetables associated with ${season}, beautifully arranged. 
      Vivid colors, professional food photography style, soft natural lighting, commercial quality. 
      No text in the image.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      let base64Image = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (base64Image) {
        return res.json({ success: true, imageUrl: `data:image/png;base64,${base64Image}` });
      }

      throw new Error('No image generated');
    } catch (error: any) {
      console.error('Gemini Image Gen error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to generate image' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    // Intercept @vite/client to neutralize WebSocket connection failure in sandbox iframe
    app.use(async (req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';
      if (url === '/@vite/client') {
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (result && result.code) {
            const patched = result.code
              .replace(
                'reject(new Error("WebSocket closed without opened."));',
                'resolve();'
              )
              .replace('throw e;', 'return;');
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache');
            return res.send(patched);
          }
        } catch {
          // Fall through to default middlewares
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
