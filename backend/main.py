from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth

app = FastAPI()

# Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

@app.get("/")
def read_root():
    return {"message": "Backend running!"}

@app.post("/verify-token")
async def verify_token(request: Request):
    body = await request.json()
    id_token = body.get("token")

    try:
        decoded_token = auth.verify_id_token(id_token)
        return {"uid": decoded_token["uid"]}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
