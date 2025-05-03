# backend/python_server.py
from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
from gtts import gTTS
import os
import io
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Language mapping for gTTS
LANGUAGE_MAPPING = {
    'en': 'en',
    'hi': 'hi',
    'ta': 'ta',
    'te': 'te',
    'de': 'de'
}

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Vercel domain
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["source-text-base64", "translated-text-base64"]
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Translation service is running"}

@app.post("/translate-audio")
async def translate_audio(audio: UploadFile, source_language: str = Form(...), target_language: str = Form(...)):
    try:
        print(f"📥 Received translation request - Source: {source_language}, Target: {target_language}")
        print(f"📦 File info - Name: {audio.filename}, Type: {audio.content_type}, Size: {audio.size if hasattr(audio, 'size') else 'unknown'}")

        # Validate input
        if not audio:
            raise ValueError("No audio file provided")
        if not source_language or not target_language:
            raise ValueError("Missing source or target language")
        if source_language not in LANGUAGE_MAPPING:
            raise ValueError(f"Unsupported source language: {source_language}")
        if target_language not in LANGUAGE_MAPPING:
            raise ValueError(f"Unsupported target language: {target_language}")

        # Save file with extension
        input_path = f"temp_{audio.filename or 'input'}.webm"
        content = await audio.read()
        with open(input_path, "wb") as f:
            f.write(content)

        print(f"📝 Saved audio at: {input_path} (size: {len(content)} bytes)")

        # Step 1: Transcribe
        try:
            with open(input_path, "rb") as audio_file:
                transcript = openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=source_language
                )
            source_text = transcript.text
            print(f"📝 Transcribed text: {source_text}")
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}")
            raise

        # Step 2: Translate using GPT
        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": f"Translate from {source_language} to {target_language}."},
                    {"role": "user", "content": source_text}
                ]
            )
            translated_text = response.choices[0].message.content
            print(f"🌍 Translated text: {translated_text}")
        except Exception as e:
            print(f"❌ Translation error: {str(e)}")
            raise

        # Step 3: Convert translated text to speech
        try:
            gtts_lang = LANGUAGE_MAPPING.get(target_language)
            if not gtts_lang:
                raise ValueError(f"Unsupported target language: {target_language}")
            
            tts = gTTS(text=translated_text, lang=gtts_lang)
            output_buffer = io.BytesIO()
            tts.write_to_fp(output_buffer)
            output_buffer.seek(0)
            print(f"🔊 Generated speech (size: {output_buffer.getbuffer().nbytes} bytes)")
        except Exception as e:
            print(f"❌ Text-to-speech error: {str(e)}")
            raise

        # Encode texts into base64
        source_text_b64 = base64.b64encode(source_text.encode()).decode()
        translated_text_b64 = base64.b64encode(translated_text.encode()).decode()

        headers = {
            "source-text-base64": source_text_b64,
            "translated-text-base64": translated_text_b64
        }

        return StreamingResponse(output_buffer, media_type="audio/mpeg", headers=headers)

    except Exception as e:
        print(f"❌ Error during translation pipeline: {str(e)}")
        return {"error": str(e)}

    finally:
        try:
            if os.path.exists(input_path):
                os.remove(input_path)
                print(f"🧹 Cleaned up temporary file: {input_path}")
        except Exception as cleanup_error:
            print(f"⚠️ Cleanup error: {cleanup_error}")

@app.post("/test-upload")
async def test_upload(audio: UploadFile, source_language: str = Form(...), target_language: str = Form(...)):
    try:
        print(f"📥 Test upload received - Source: {source_language}, Target: {target_language}")
        print(f"📦 File info - Name: {audio.filename}, Type: {audio.content_type}")
        
        # Read a small portion of the file to verify it's being received
        content = await audio.read(1024)  # Read first 1KB
        print(f"📄 First 1KB of file content: {content[:100]}...")
        
        return {
            "status": "success",
            "file_received": True,
            "file_name": audio.filename,
            "file_type": audio.content_type,
            "source_language": source_language,
            "target_language": target_language
        }
    except Exception as e:
        print(f"❌ Test upload error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
