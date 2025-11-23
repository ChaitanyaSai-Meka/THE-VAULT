import os
import io
import psycopg2
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader

load_dotenv()
os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_db_connection():
    return psycopg2.connect(os.environ.get("DATABASE_URL"))


class Document(BaseModel):
    text: str

class UserQuery(BaseModel):
    prompt: str


def store_in_db(content: str):
    if not content.strip():
        raise ValueError("Content is empty")
        
    vector = embed_model.encode(content).tolist()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO vault_data (content, embedding) VALUES (%s, %s)",
        (content, vector)
    )
    conn.commit()
    cur.close()
    conn.close()


@app.post("/upload/text")
def upload_text(doc: Document):
    try:
        store_in_db(doc.text)
        return {"status": "stored", "message": "I have memorized this text note."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"
            
        store_in_db(full_text)
        return {"status": "stored", "message": f"I have read '{file.filename}' and memorized it."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
def chat_vault(query: UserQuery):
    try:
        query_vector = embed_model.encode(query.prompt).tolist()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT content FROM vault_data ORDER BY embedding <=> %s::vector LIMIT 1", 
            (query_vector,)
        )
        result = cur.fetchone()
        cur.close()
        conn.close()

        context = result[0] if result else "No relevant context found."

        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"Answer based ONLY on this context: {context}"},
                {"role": "user", "content": query.prompt}
            ],
        )
        return {"response": completion.choices[0].message.content, "source": context[:50] + "..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))