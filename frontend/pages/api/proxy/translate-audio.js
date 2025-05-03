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

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/translate-audio`, {
      method: 'POST',
      body: req,
      headers: {
        ...req.headers,
        host: new URL(backendUrl).host,
      },
    });

    // Forward the response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Stream the response
    const stream = response.body;
    stream.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
} 