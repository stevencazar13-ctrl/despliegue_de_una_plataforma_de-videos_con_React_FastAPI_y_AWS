import os
import shutil
import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlmodel import Session, select
from database import create_db_and_tables, get_session
from models import User, Video, Comment
from aws_service import generate_presigned_url
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = session.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user


class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class VideoCreate(BaseModel):
    title: str
    description: str
    video_url: str
    thumbnail_url: str

class VideoUpdate(BaseModel):
    title: str
    description: str

class CommentCreate(BaseModel):
    content: str

# ==========================================
# 3. CONFIGURACIÓN DE FASTAPI
# ==========================================
app = FastAPI(title="API Plataforma de Videos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/videos", exist_ok=True)
os.makedirs("uploads/thumbnails", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/s3/presigned-url")
def get_s3_presigned_url(filename: str, file_type: str, current_user: User = Depends(get_current_user)):
    """
    Entrega una URL pre-firmada al usuario autenticado.
    """
    urls = generate_presigned_url(filename, file_type)
    if not urls:
        raise HTTPException(status_code=500, detail="Error al comunicarse con S3")
    
    return urls

@app.post("/users", response_model=User)
def create_user(user_in: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(name=user_in.name, email=user_in.email, password_hash=hashed_password)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/{id}", response_model=User)
def get_user(id: int, session: Session = Depends(get_session)):
    user = session.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@app.post("/videos", response_model=Video)
def create_video(video_in: VideoCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_video = Video(
        title=video_in.title,
        description=video_in.description,
        video_url=video_in.video_url,
        thumbnail_url=video_in.thumbnail_url,
        user_id=current_user.id
    )
    session.add(db_video)
    session.commit()
    session.refresh(db_video)
    return db_video

@app.get("/videos", response_model=List[Video])
def get_videos(session: Session = Depends(get_session)):
    return session.exec(select(Video)).all()

@app.get("/videos/{id}", response_model=Video)
def get_video(id: int, session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    video.views += 1
    session.add(video)
    session.commit()
    session.refresh(video)
    return video

@app.put("/videos/{id}", response_model=Video)
def update_video(id: int, video_in: VideoUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este video")
    
    video.title = video_in.title
    video.description = video_in.description
    session.add(video)
    session.commit()
    session.refresh(video)
    return video

@app.delete("/videos/{id}")
def delete_video(id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este video")
    
    session.delete(video)
    session.commit()
    return {"detail": "Video eliminado exitosamente"}

@app.post("/videos/{id}/comments", response_model=Comment)
def create_comment(id: int, comment_in: CommentCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    db_comment = Comment(
        content=comment_in.content,
        user_id=current_user.id,
        video_id=id
    )
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment

@app.get("/videos/{id}/comments", response_model=List[Comment])
def get_comments(id: int, session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    comments = session.exec(select(Comment).where(Comment.video_id == id)).all()
    return comments