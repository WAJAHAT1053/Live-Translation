import formidable from 'formidable';
import { promises as fs } from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handleFormData(req, res, endpoint) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    // Parse the multipart form data
    const form = formidable();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    console.log('📦 Parsed form data:', {
      fields,
      files: Object.keys(files)
    });

    // Create new FormData for the backend request
    const formData = new FormData();
    
    // Add the audio file
    if (files.audio) {
      const file = files.audio[0];
      const fileContent = await fs.readFile(file.filepath);
      formData.append('audio', new Blob([fileContent], { type: file.mimetype }), file.originalFilename);
    }

    // Add other fields
    if (fields.source_language) formData.append('source_language', fields.source_language[0]);
    if (fields.target_language) formData.append('target_language', fields.target_language[0]);

    console.log('📤 Forwarding request to backend:', `${backendUrl}${endpoint}`);

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': endpoint === '/test-upload' ? 'application/json' : 'audio/mpeg',
      },
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend request failed:', errorText);
      throw new Error(`Backend request failed: ${response.status} ${errorText}`);
    }

    if (endpoint === '/test-upload') {
      const jsonResponse = await response.json();
      res.json(jsonResponse);
    } else {
      // Forward the response headers
      const headers = {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'source-text-base64': response.headers.get('source-text-base64'),
        'translated-text-base64': response.headers.get('translated-text-base64'),
      };

      Object.entries(headers).forEach(([key, value]) => {
        if (value) res.setHeader(key, value);
      });

      // Stream the response
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const endpoint = req.query.test ? '/test-upload' : '/translate-audio';
  await handleFormData(req, res, endpoint);
} 