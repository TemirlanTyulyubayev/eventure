# Eventure - Event Management System

AI-Powered Event Coordination Platform

## Features

- 🔐 User authentication (JWT tokens)
- 📅 Event management (CRUD operations)
- ✅ Task management with priorities
- 🎯 Auto-assignment of tasks to current user
- 🔄 Automatic cascade deletion (tasks deleted with events)
- 🎨 Modern, responsive UI with soft color theme
- ⚡ Real-time data updates
- 🔒 Token expiration handling with auto-logout

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migrations
- **JWT** - Authentication
- **Pydantic** - Data validation
- **uv** - Fast Python package manager

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **HTML5/CSS3** - Modern responsive design
- **localStorage** - Client-side state management

## Project Structure

```
eventure/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   ├── auth.py       # Authentication routes
│   │   │   ├── events.py     # Event routes
│   │   │   └── tasks.py      # Task routes
│   │   ├── core/             # Core configuration
│   │   │   └── config.py     # Settings
│   │   ├── crud/             # Database operations
│   │   ├── db/               # Database setup
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── main.py           # FastAPI application
│   └── pyproject.toml        # Python dependencies
├── frontend/
│   ├── css/
│   │   └── style.css         # Styles
│   ├── js/
│   │   ├── api.js            # API client
│   │   ├── auth.js           # Auth logic
│   │   └── dashboard.js      # Dashboard logic
│   ├── index.html            # Login/Register page
│   └── dashboard.html        # Main dashboard
└── README.md
```

## Installation

### Prerequisites
- Python 3.11+
- PostgreSQL
- [uv](https://docs.astral.sh/uv/) package manager

### 1. Clone the repository
```bash
git clone https://github.com/TemirlanTyulyubayev/eventure.git
cd eventure
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL=postgresql://username:password@localhost/mydatabase
SECRET_KEY=your-secret-key-here
DEBUG=True
```

### 3. Install dependencies
```bash
cd backend
uv sync
```

### 4. Create database
```bash
psql -U postgres
CREATE DATABASE mydatabase;
\q
```

### 5. Run migrations
```bash
uv run alembic upgrade head
```

## Running the Application

### Start the backend server
```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Access the application
Open your browser and navigate to:
```
http://localhost:8000
```

The backend serves both API and static frontend files.

### API Documentation
Interactive API docs available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events/` - List all events
- `POST /api/events/` - Create event
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event (cascades to tasks)

### Tasks
- `GET /api/tasks/my-tasks` - Get current user's tasks
- `GET /api/tasks/event/{event_id}` - Get tasks for event
- `POST /api/tasks/` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

## Database Schema

### Users
- id, email, hashed_password, full_name
- is_active, is_superuser
- created_at, updated_at

### Events
- id, title, description, location
- start_time, end_time, status
- organizer_id (FK to users)
- created_at, updated_at

### Tasks
- id, title, description
- status, priority, due_date
- event_id (FK to events, cascade delete)
- assigned_to_id (FK to users)
- created_at, updated_at

## Features in Detail

### Cascade Delete
When an event is deleted, all associated tasks are automatically deleted through SQLAlchemy's cascade relationship.

### Token Expiration
- Access tokens expire after 30 minutes
- Auto-logout on 401 responses
- User redirected to login page

### Task Assignment
Tasks are automatically assigned to the current user when created through the UI.

### Validation
- End time must be after start time
- Email validation
- Password minimum length
- Required fields enforcement

## Development

### Database Migrations
Create a new migration:
```bash
uv run alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
uv run alembic upgrade head
```

Rollback:
```bash
uv run alembic downgrade -1
```

### Code Style
The project uses:
- Type hints throughout
- Pydantic for validation
- SQLAlchemy 2.0 style
- Clean architecture (CRUD + Services)

## Troubleshooting

### CORS Issues
Make sure your CORS origins in `config.py` include:
```python
BACKEND_CORS_ORIGINS: list[str] = [
    "http://localhost:8000",
    "http://0.0.0.0:8000"
]
```

### Database Connection
Check your `DATABASE_URL` in `.env` file matches your PostgreSQL setup.

### Frontend Not Loading
Verify the frontend path in `main.py` points to the correct directory.

## License

MIT

## Author

Temirlan Tyulyubayev
