<h1 align="center">✨ CSE499 VidChat: A Platform for Video Calls and Chats ✨</h1>

## 🧪 .env Setup

### Backend (`/backend`)

```
PORT=5001
MONGO_URI= mongodb+srv://admin:<admin>@videomeeting.dof57co.mongodb.net/?retryWrites=true&w=majority&appName=videomeeting
STEAM_API_KEY=your_steam_api_key
STEAM_API_SECRET=your_steam_api_secret
JWT_SECRET_KEY=your_jwt_secret
NODE_ENV=development
```

### Frontend (`/frontend`)

```
VITE_STREAM_API_KEY=your_stream_api_key
```

---

## 🔧 Run the Backend

```bash
cd backend
npm install
npm run dev
```

## 💻 Run the Frontend

```bash
cd frontend
npm install
npm run dev
```
