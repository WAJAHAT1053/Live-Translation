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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/translate-audio")
async def translate_audio(audio: UploadFile, source_language: str = Form(...), target_language: str = Form(...)):
    try:
        # Save file with extension
        input_path = f"temp_{audio.filename or 'input'}.webm"
        content = await audio.read()
        with open(input_path, "wb") as f:
            f.write(content)

        print(f"📝 Saved audio at: {input_path}")

        # Step 1: Transcribe
        with open(input_path, "rb") as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=source_language
            )
        source_text = transcript.text
        print(f"📝 Transcribed text: {source_text}")

        # Step 2: Translate using GPT
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"Translate from {source_language} to {target_language}."},
                {"role": "user", "content": source_text}
            ]
        )
        translated_text = response.choices[0].message.content
        print(f"🌍 Translated text: {translated_text}")

        # Step 3: Convert translated text to speech
        gtts_lang = LANGUAGE_MAPPING.get(target_language)
        if not gtts_lang:
            raise ValueError(f"Unsupported target language: {target_language}")
        
        tts = gTTS(text=translated_text, lang=gtts_lang)
        output_buffer = io.BytesIO()
        tts.write_to_fp(output_buffer)
        output_buffer.seek(0)

        # Encode texts into base64
        source_text_b64 = base64.b64encode(source_text.encode()).decode()
        translated_text_b64 = base64.b64encode(translated_text.encode()).decode()

        headers = {
            "source-text-base64": source_text_b64,
            "translated-text-base64": translated_text_b64
        }

        return StreamingResponse(output_buffer, media_type="audio/mpeg", headers=headers)

    except Exception as e:
        print("❌ Error during translation pipeline:", str(e))
        return {"error": str(e)}

    finally:
        try:
            os.remove(input_path)
        except Exception as cleanup_error:
            print("Cleanup error:", cleanup_error)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
