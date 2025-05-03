import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Create new FormData for the backend request
    const formData = new FormData();
    
    // Add the audio file
    if (files.audio) {
      const file = files.audio[0];
      formData.append('audio', new Blob([await readFile(file.filepath)], { type: file.mimetype }), file.originalFilename);
    }

    // Add other fields
    if (fields.source_language) formData.append('source_language', fields.source_language[0]);
    if (fields.target_language) formData.append('target_language', fields.target_language[0]);

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/translate-audio`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'audio/mpeg',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend request failed: ${response.status} ${errorText}`);
    }

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

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
} 