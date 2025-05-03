from openai import OpenAI
from gtts import gTTS
import os
import sys
import json

def translate_audio(input_file, source_lang, target_lang, openai_key):
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=openai_key)

        # Step 1: Transcribe original audio to text
        with open(input_file, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=source_lang
            )
        source_text = transcript.text
        print(json.dumps({"status": "transcribed", "text": source_text}), flush=True)

        # Step 2: Translate text using GPT
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"Translate the following text from {source_lang} to {target_lang}."},
                {"role": "user", "content": source_text}
            ]
        )
        translated_text = response.choices[0].message.content
        print(json.dumps({"status": "translated", "text": translated_text}), flush=True)

        # Step 3: Convert translated text to speech
        output_file = os.path.join(os.path.dirname(input_file), "translated_output.mp3")
        tts = gTTS(text=translated_text, lang=target_lang)
        tts.save(output_file)
        
        print(json.dumps({
            "status": "success",
            "output_file": output_file,
            "source_text": source_text,
            "translated_text": translated_text
        }), flush=True)
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    # Get arguments from command line
    input_file = sys.argv[1]
    source_lang = sys.argv[2]
    target_lang = sys.argv[3]
    openai_key = sys.argv[4]
    
    translate_audio(input_file, source_lang, target_lang, openai_key) 