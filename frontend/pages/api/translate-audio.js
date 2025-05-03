import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import formidable from 'formidable';

// Disable the default body parser
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
    // Parse the multipart form data
    const form = formidable();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const sourceLanguage = fields.sourceLanguage?.[0];
    const targetLanguage = fields.targetLanguage?.[0];
    const audioFile = files.audio?.[0];

    if (!audioFile || !targetLanguage || !sourceLanguage) {
      return res.status(400).json({ error: 'Missing audio file, source language, or target language' });
    }

    // Create a temporary directory for processing
    const tempDir = join(process.cwd(), 'temp');
    const inputPath = join(tempDir, `input_${Date.now()}.wav`);
    
    // Ensure temp directory exists
    await mkdir(tempDir, { recursive: true });
    
    // Copy the uploaded file to temp directory
    await writeFile(inputPath, await readFile(audioFile.filepath));

    // Run the Python script
    const pythonProcess = spawn('python', [
      'translate_audio.py',
      inputPath,
      sourceLanguage,
      targetLanguage,
      process.env.OPENAI_API_KEY
    ]);

    let outputData = '';
    let errorData = '';

    // Collect data from Python script
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // Wait for Python script to finish
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorData}`));
        }
      });
    });

    // Parse the output from Python script
    const outputLines = outputData.trim().split('\n');
    const finalOutput = JSON.parse(outputLines[outputLines.length - 1]);

    if (finalOutput.status === 'error') {
      throw new Error(finalOutput.message);
    }

    // Read the translated audio file
    const audioBuffer = await readFile(finalOutput.output_file);

    // Clean up temporary files
    await Promise.all([
      unlink(inputPath),
      unlink(finalOutput.output_file)
    ]).catch(console.error);

    // Send the audio buffer back to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
} 