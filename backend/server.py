from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_message: str
    bot_response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: str

class ChatRequest(BaseModel):
    message: str
    session_id: str

class BookInfo(BaseModel):
    title: str
    subject: str
    description: str
    availability: str = "Available"

# EDUSHELF Books Database
EDUSHELF_BOOKS = [
    {
        "title": "Technical English",
        "subject": "English Communication",
        "description": "Essential English communication skills for technical professionals. Covers technical writing, presentation skills, and professional communication.",
        "keywords": ["english", "communication", "technical writing", "presentation", "professional"]
    },
    {
        "title": "Mathematics I",
        "subject": "Engineering Mathematics",
        "description": "Fundamental mathematics concepts including calculus, differential equations, and linear algebra for engineering students.",
        "keywords": ["mathematics", "calculus", "differential equations", "algebra", "engineering math"]
    },
    {
        "title": "Mathematics II",
        "subject": "Advanced Mathematics",
        "description": "Advanced mathematical concepts including complex analysis, Fourier transforms, and numerical methods.",
        "keywords": ["advanced math", "complex analysis", "fourier", "numerical methods", "mathematics"]
    },
    {
        "title": "Programming For Problem Solving",
        "subject": "Computer Programming",
        "description": "Introduction to programming concepts using C language. Covers problem-solving techniques and algorithm development.",
        "keywords": ["programming", "c language", "algorithms", "problem solving", "coding"]
    },
    {
        "title": "Environmental Science",
        "subject": "Environmental Studies",
        "description": "Study of environmental systems, pollution control, and sustainable development practices.",
        "keywords": ["environment", "pollution", "sustainability", "ecology", "green technology"]
    },
    {
        "title": "Basic Civil Engineering",
        "subject": "Civil Engineering",
        "description": "Fundamentals of civil engineering including construction materials, surveying, and structural basics.",
        "keywords": ["civil engineering", "construction", "materials", "surveying", "structures"]
    },
    {
        "title": "Elements of Electromagnetics",
        "subject": "Electrical Engineering",
        "description": "Comprehensive study of electromagnetic fields, waves, and their applications in engineering.",
        "keywords": ["electromagnetics", "electrical", "fields", "waves", "maxwell equations"]
    },
    {
        "title": "Signal & System",
        "subject": "Electronics Engineering",
        "description": "Analysis of signals and systems in time and frequency domain. Essential for electronics engineers.",
        "keywords": ["signals", "systems", "frequency domain", "electronics", "fourier analysis"]
    },
    {
        "title": "Op-Amp and Linear Integrated Circuit",
        "subject": "Electronics",
        "description": "Operational amplifiers and linear integrated circuits design and applications.",
        "keywords": ["op-amp", "operational amplifier", "integrated circuits", "linear circuits", "electronics"]
    },
    {
        "title": "Professional Ethics",
        "subject": "Ethics",
        "description": "Professional ethics and moral responsibilities in engineering practice.",
        "keywords": ["ethics", "professional", "moral", "responsibility", "engineering ethics"]
    },
    {
        "title": "AVR Microcontroller and Embedded Systems",
        "subject": "Embedded Systems",
        "description": "Programming and interfacing of AVR microcontrollers for embedded system applications.",
        "keywords": ["microcontroller", "avr", "embedded systems", "programming", "interfacing"]
    }
]

def generate_bot_response(user_message: str) -> str:
    """Generate intelligent responses based on user queries"""
    message_lower = user_message.lower()
    
    # Greeting responses
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
    if any(greeting in message_lower for greeting in greetings):
        return "Hello! 👋 I'm EduBot, your EDUSHELF library assistant. I'm here to help you find the perfect books for your studies. You can ask me about:\n\n📚 Available books and subjects\n🔍 Book recommendations based on your course\n📖 Detailed information about any book\n❓ Help with using the library system\n\nWhat would you like to know today?"
    
    # Book search and recommendations
    if any(word in message_lower for word in ["book", "books", "find", "search", "recommend", "suggest"]):
        # Check for specific subjects
        found_books = []
        for book in EDUSHELF_BOOKS:
            if any(keyword in message_lower for keyword in book["keywords"]):
                found_books.append(book)
        
        if found_books:
            response = "📚 I found these relevant books for you:\n\n"
            for book in found_books[:3]:  # Limit to 3 recommendations
                response += f"📖 **{book['title']}**\n"
                response += f"   Subject: {book['subject']}\n"
                response += f"   {book['description']}\n\n"
            
            if len(found_books) > 3:
                response += f"💡 I found {len(found_books) - 3} more books. Would you like to see them?"
            
            return response
        else:
            return "📚 Here are all our available books:\n\n" + "\n".join([f"• **{book['title']}** ({book['subject']})" for book in EDUSHELF_BOOKS]) + "\n\n🔍 You can ask me about any specific subject or book for more details!"
    
    # Subject-specific queries
    subjects = {
        "math": ["Mathematics I", "Mathematics II"],
        "programming": ["Programming For Problem Solving"],
        "english": ["Technical English"],
        "electronics": ["Signal & System", "Op-Amp and Linear Integrated Circuit"],
        "electrical": ["Elements of Electromagnetics"],
        "civil": ["Basic Civil Engineering"],
        "environment": ["Environmental Science"],
        "microcontroller": ["AVR Microcontroller and Embedded Systems"],
        "ethics": ["Professional Ethics"]
    }
    
    for subject, books in subjects.items():
        if subject in message_lower:
            response = f"📚 For {subject.title()} studies, I recommend:\n\n"
            for book_title in books:
                book = next(b for b in EDUSHELF_BOOKS if b["title"] == book_title)
                response += f"📖 **{book['title']}**\n   {book['description']}\n\n"
            return response
    
    # Help and guidance
    if any(word in message_lower for word in ["help", "how", "guide", "navigate", "use"]):
        return "🎯 **How to use EDUSHELF Library:**\n\n" \
               "1. **Browse Books**: Scroll through the available books section\n" \
               "2. **Search**: Use the search bar to find specific books or topics\n" \
               "3. **Categories**: Books are organized by engineering subjects\n" \
               "4. **Access**: Click on any book to view or download\n\n" \
               "💡 **Tips:**\n" \
               "• Ask me about specific subjects for targeted recommendations\n" \
               "• I can explain concepts from any book\n" \
               "• Need study tips? Just ask!\n\n" \
               "What specific help do you need?"
    
    # Study tips and advice
    if any(word in message_lower for word in ["study", "learn", "tip", "advice", "exam", "preparation"]):
        return "📚 **Study Tips for Engineering Students:**\n\n" \
               "✅ **Effective Study Strategies:**\n" \
               "• Start with fundamentals - Math and Programming are key\n" \
               "• Practice problems regularly, especially in Mathematics\n" \
               "• For technical subjects, understand concepts before memorizing\n" \
               "• Use Technical English book to improve communication skills\n\n" \
               "📅 **Study Schedule:**\n" \
               "• Mathematics: Daily practice (1-2 hours)\n" \
               "• Programming: Code daily, build projects\n" \
               "• Theory subjects: Regular reading and note-making\n\n" \
               "🎯 Which subject would you like specific study guidance for?"
    
    # Default response with suggestions
    return "🤔 I'd love to help you with that! I specialize in:\n\n" \
           "📚 **Book Information & Recommendations**\n" \
           "🔍 **Subject-specific Guidance**\n" \
           "📖 **Study Tips & Learning Strategies**\n" \
           "❓ **Library Navigation Help**\n\n" \
           "Try asking me:\n" \
           "• 'Show me mathematics books'\n" \
           "• 'I need help with programming'\n" \
           "• 'Study tips for electronics'\n" \
           "• 'What books do you have?'\n\n" \
           "What would you like to know?"

@api_router.post("/chat")
async def chat_with_bot(request: ChatRequest):
    """Handle chat messages and generate responses"""
    try:
        # Generate bot response
        bot_response = generate_bot_response(request.message)
        
        # Save chat history to database
        chat_message = ChatMessage(
            user_message=request.message,
            bot_response=bot_response,
            session_id=request.session_id
        )
        
        await db.chat_history.insert_one(chat_message.dict())
        
        return {
            "response": bot_response,
            "timestamp": chat_message.timestamp,
            "session_id": request.session_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    try:
        history = await db.chat_history.find(
            {"session_id": session_id}
        ).sort("timestamp", 1).to_list(100)
        
        # Clean up ObjectIds
        clean_history = []
        for chat in history:
            chat_dict = dict(chat)
            if "_id" in chat_dict:
                del chat_dict["_id"]
            clean_history.append(chat_dict)
        
        return {"history": clean_history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

@api_router.get("/books")
async def get_all_books():
    """Get all available books in EDUSHELF"""
    return {"books": EDUSHELF_BOOKS}

@api_router.get("/books/search/{query}")
async def search_books(query: str):
    """Search books by title, subject, or keywords"""
    query_lower = query.lower()
    matching_books = []
    
    for book in EDUSHELF_BOOKS:
        if (query_lower in book["title"].lower() or 
            query_lower in book["subject"].lower() or
            any(query_lower in keyword for keyword in book["keywords"])):
            matching_books.append(book)
    
    return {"books": matching_books, "query": query, "count": len(matching_books)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()