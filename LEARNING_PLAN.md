# Production Backend Development - 7 Day Learning Plan

Интенсивный курс профессиональной backend разработки на примере проекта Eventure.

## 📋 Обзор

Этот план научит вас создавать production-ready backend приложения за 7 дней, используя текущий проект как reference.

---

## 🎯 День 1: Architecture & Project Structure

### Утро: Clean Architecture (4 часа)

#### Теория
1. **Layered Architecture**
   ```
   API Layer (endpoints) → Service Layer (business logic) → CRUD Layer (data access) → Models
   ```
   
2. **Separation of Concerns**
   - **API (`app/api/`)** - HTTP endpoints, request/response handling
   - **Services (`app/services/`)** - Business logic, validation
   - **CRUD (`app/crud/`)** - Database operations
   - **Models (`app/models/`)** - Database schema
   - **Schemas (`app/schemas/`)** - Data validation, serialization

#### Практика
**Задание 1.1:** Проанализируй текущую архитектуру
```bash
# Посмотри как работает flow:
# 1. Request → app/api/events.py::create_event()
# 2. Service → app/services/event_service.py::create_event()
# 3. CRUD → app/crud/event.py::create()
# 4. Model → app/models/event.py::Event
```

**Задание 1.2:** Создай новый endpoint `GET /api/events/{id}/statistics`
```python
# Добавь в app/api/events.py
@router.get("/{event_id}/statistics")
def get_event_statistics(event_id: int, db: Session = Depends(get_db)):
    """Get event statistics (total tasks, completed, pending)"""
    # 1. Создай service method
    # 2. Используй существующий CRUD
    # 3. Верни статистику
```

**Цель:** Понять почему каждый слой отделён и как они взаимодействуют.

---

### День: Dependency Injection (4 часа)

#### Теория
**FastAPI Dependencies** - это паттерн для инъекции зависимостей:

```python
# app/api/deps.py
def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), 
                     db: Session = Depends(get_db)):
    """Current user dependency"""
    # Декодируй токен, верни пользователя
```

**Зачем?**
- Переиспользование логики
- Легкое тестирование (mock dependencies)
- Чистый код

#### Практика
**Задание 1.3:** Создай новую dependency
```python
# app/api/deps.py
def get_current_active_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Только для суперпользователей"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403)
    return current_user

# Используй в app/api/users.py
@router.get("/all")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    # Только superuser может видеть всех пользователей
```

**Задание 1.4:** Создай pagination dependency
```python
class PaginationParams:
    def __init__(self, skip: int = 0, limit: int = 100):
        self.skip = skip
        self.limit = min(limit, 1000)  # Max 1000

# Используй везде вместо отдельных параметров
```

---

## 🗄️ День 2: Database & ORM Mastery

### Утро: SQLAlchemy 2.0 (4 часа)

#### Теория
1. **Relationships & Cascade**
   ```python
   # One-to-Many
   class Event(Base):
       tasks = relationship("Task", back_populates="event", 
                          cascade="all, delete-orphan")
   
   class Task(Base):
       event = relationship("Event", back_populates="tasks")
   ```

2. **Cascade Options:**
   - `all` - все операции
   - `delete-orphan` - удалить если отвязан от parent
   - `delete` - удалить child при удалении parent
   - `merge` - обновить child при merge parent

#### Практика
**Задание 2.1:** Добавь Many-to-Many relationship
```python
# Создай таблицу для участников события
# app/models/event_participant.py
event_participants = Table(
    'event_participants',
    Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id')),
    Column('user_id', Integer, ForeignKey('users.id'))
)

# Обнови Event model
class Event(Base):
    participants = relationship("User", secondary=event_participants, 
                               back_populates="participating_events")
```

**Задание 2.2:** Реализуй API для участников
```python
@router.post("/{event_id}/participants/{user_id}")
def add_participant(event_id: int, user_id: int, db: Session = Depends(get_db))

@router.delete("/{event_id}/participants/{user_id}")
def remove_participant(...)

@router.get("/{event_id}/participants")
def list_participants(...)
```

---

### День: Migrations & Database Design (4 часа)

#### Теория
**Alembic Migration Best Practices:**
1. Всегда проверяй generated migration
2. Добавляй indexes для FK и частых queries
3. Используй `op.batch_alter_table()` для SQLite
4. Пиши и `upgrade()` и `downgrade()`

#### Практика
**Задание 2.3:** Создай оптимизированную миграцию
```bash
uv run alembic revision --autogenerate -m "add event participants"
```

Отредактируй миграцию:
```python
def upgrade():
    op.create_table(
        'event_participants',
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), 
                  server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], 
                                ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], 
                                ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('event_id', 'user_id')
    )
    
    # ВАЖНО: Добавь индексы!
    op.create_index('ix_event_participants_event_id', 
                    'event_participants', ['event_id'])
    op.create_index('ix_event_participants_user_id', 
                    'event_participants', ['user_id'])

def downgrade():
    op.drop_index('ix_event_participants_user_id')
    op.drop_index('ix_event_participants_event_id')
    op.drop_table('event_participants')
```

**Задание 2.4:** Добавь индексы для performance
```python
# В models добавь:
class Event(Base):
    __tablename__ = "events"
    
    # Composite index для частых queries
    __table_args__ = (
        Index('ix_events_organizer_status', 'organizer_id', 'status'),
        Index('ix_events_start_time', 'start_time'),
    )
```

---

## 🔐 День 3: Security & Authentication

### Утро: JWT & Password Security (4 часа)

#### Теория
1. **JWT Structure:** Header.Payload.Signature
2. **bcrypt** для хеширования паролей
3. **Refresh tokens** для долгого доступа
4. **Token blacklisting** для logout

#### Практика
**Задание 3.1:** Добавь Refresh Token
```python
# app/core/security.py
def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

# app/api/auth.py
@router.post("/login")
def login(...):
    # Верни оба токена
    return {
        "access_token": create_access_token(...),
        "refresh_token": create_refresh_token(...),
        "token_type": "bearer"
    }

@router.post("/refresh")
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    # Валидируй refresh token, верни новый access token
```

**Задание 3.2:** Добавь rate limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")  # 5 попыток в минуту
async def login(...):
    ...
```

---

### День: Authorization & Permissions (4 часа)

#### Теория
**RBAC (Role-Based Access Control):**
- Roles: Admin, Organizer, Participant
- Permissions: create_event, edit_event, delete_event

#### Практика
**Задание 3.3:** Реализуй Permission System
```python
# app/models/user.py
class UserRole(str, Enum):
    ADMIN = "admin"
    ORGANIZER = "organizer"
    PARTICIPANT = "participant"

class User(Base):
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.PARTICIPANT
    )

# app/api/deps.py
def require_role(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403)
        return current_user
    return role_checker

# Используй:
@router.post("/events/")
def create_event(
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN))
):
    ...
```

**Задание 3.4:** Добавь владение ресурсами
```python
def require_resource_owner(resource_type: str):
    """Проверяет что user - владелец ресурса"""
    async def owner_checker(
        resource_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if resource_type == "event":
            resource = db.query(Event).filter(Event.id == resource_id).first()
            if resource.organizer_id != current_user.id:
                raise HTTPException(403)
        return resource
    return owner_checker
```

---

## 🧪 День 4: Testing & Quality

### Утро: Unit & Integration Tests (4 часа)

#### Теория
**Testing Pyramid:**
1. Unit tests (70%) - отдельные функции
2. Integration tests (20%) - API endpoints
3. E2E tests (10%) - полные сценарии

#### Практика
**Задание 4.1:** Настрой pytest
```bash
# backend/pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

# Установи
uv add --dev pytest pytest-asyncio httpx
```

**Задание 4.2:** Создай test fixtures
```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.api.deps import get_db
from app.db.base import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db):
    """Создай тестового пользователя"""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Test User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

**Задание 4.3:** Напиши тесты для Event API
```python
# tests/test_events.py
def test_create_event(client, test_user):
    # Login
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "testpass"
    })
    token = response.json()["access_token"]
    
    # Create event
    response = client.post(
        "/api/events/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Test Event",
            "description": "Test Description",
            "location": "Test Location",
            "start_time": "2026-02-15T10:00:00",
            "end_time": "2026-02-15T12:00:00",
            "status": "planning"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Event"
    assert data["organizer_id"] == test_user.id

def test_create_event_invalid_dates(client, test_user):
    """End time before start time"""
    # Login and try to create with invalid dates
    # Assert 400 error

def test_delete_event_cascade(client, test_user):
    """Tasks should be deleted with event"""
    # Create event
    # Create task for event
    # Delete event
    # Assert task is also deleted
```

---

### День: Code Quality & Linting (4 часа)

#### Практика
**Задание 4.4:** Настрой linters
```bash
uv add --dev ruff mypy black isort
```

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "S", "B", "A"]

[tool.black]
line-length = 100

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true

[tool.isort]
profile = "black"
line_length = 100
```

**Задание 4.5:** Добавь pre-commit hooks
```bash
uv add --dev pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
        args: [--fix]
      
  - repo: https://github.com/psf/black
    rev: 23.10.0
    hooks:
      - id: black

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.6.0
    hooks:
      - id: mypy

uv run pre-commit install
```

**Задание 4.6:** Покрой код тестами
```bash
# Цель: 80%+ coverage
uv add --dev pytest-cov

uv run pytest --cov=app --cov-report=html
# Открой htmlcov/index.html
```

---

## 🚀 День 5: API Best Practices

### Утро: RESTful Design (4 часа)

#### Теория
**REST Principles:**
1. Resource-based URLs: `/events/{id}`
2. HTTP methods: GET, POST, PUT, PATCH, DELETE
3. Status codes: 200, 201, 204, 400, 401, 403, 404, 500
4. Pagination, filtering, sorting

#### Практика
**Задание 5.1:** Добавь фильтрацию и сортировку
```python
# app/schemas/event.py
class EventFilter(BaseModel):
    status: Optional[EventStatus] = None
    organizer_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# app/api/events.py
@router.get("/", response_model=List[EventResponse])
def get_events(
    filters: EventFilter = Depends(),
    sort_by: str = "start_time",
    order: str = "asc",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    
    # Apply filters
    if filters.status:
        query = query.filter(Event.status == filters.status)
    if filters.organizer_id:
        query = query.filter(Event.organizer_id == filters.organizer_id)
    if filters.start_date:
        query = query.filter(Event.start_time >= filters.start_date)
    
    # Apply sorting
    if order == "desc":
        query = query.order_by(desc(getattr(Event, sort_by)))
    else:
        query = query.order_by(asc(getattr(Event, sort_by)))
    
    return query.offset(skip).limit(limit).all()
```

**Задание 5.2:** Реализуй pagination с metadata
```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

@router.get("/", response_model=PaginatedResponse[EventResponse])
def get_events(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    
    query = db.query(Event)
    total = query.count()
    items = query.offset(skip).limit(page_size).all()
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )
```

---

### День: API Documentation & Versioning (4 часа)

#### Практика
**Задание 5.3:** Улучши OpenAPI docs
```python
# app/main.py
app = FastAPI(
    title="Eventure API",
    description="Event Management System API",
    version="1.0.0",
    contact={
        "name": "Temirlan",
        "email": "temikbjj@gmail.com"
    },
    license_info={
        "name": "MIT"
    }
)

# В каждом endpoint добавь подробное описание
@router.post("/", 
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
    description="""
    Create a new event with the following validations:
    - End time must be after start time
    - Title is required (max 200 chars)
    - User must be authenticated
    
    Returns the created event with ID and timestamps.
    """,
    responses={
        201: {"description": "Event created successfully"},
        400: {"description": "Invalid data"},
        401: {"description": "Not authenticated"}
    }
)
def create_event(...):
    ...
```

**Задание 5.4:** Добавь API versioning
```python
# app/api/v1/ и app/api/v2/
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth-v1"])
app.include_router(auth_v2.router, prefix="/api/v2/auth", tags=["auth-v2"])

# В v2 можно изменить response format без breaking changes
```

---

## ⚡ День 6: Performance & Optimization

### Утро: Database Optimization (4 часа)

#### Теория
**N+1 Query Problem:**
```python
# BAD: N+1 queries
events = db.query(Event).all()
for event in events:
    print(event.organizer.email)  # +1 query per event!

# GOOD: 2 queries with joinedload
events = db.query(Event).options(joinedload(Event.organizer)).all()
for event in events:
    print(event.organizer.email)  # No extra queries!
```

#### Практика
**Задание 6.1:** Оптимизируй queries
```python
# app/crud/event.py
def get_events_with_stats(db: Session, skip: int = 0, limit: int = 100):
    """Получи события с кол-вом задач одним запросом"""
    return (
        db.query(
            Event,
            func.count(Task.id).label('task_count'),
            func.count(case((Task.status == 'completed', 1))).label('completed_count')
        )
        .outerjoin(Task)
        .group_by(Event.id)
        .options(joinedload(Event.organizer))
        .offset(skip)
        .limit(limit)
        .all()
    )
```

**Задание 6.2:** Добавь database indexes
```python
# Анализируй slow queries
# psql -U temirlan -d mydatabase
# EXPLAIN ANALYZE SELECT * FROM events WHERE organizer_id = 1 AND status = 'planning';

# Если видишь Sequential Scan - нужен индекс!
# В migration:
op.create_index('ix_events_organizer_status', 'events', ['organizer_id', 'status'])
```

---

### День: Caching & Background Tasks (4 часа)

#### Практика
**Задание 6.3:** Добавь Redis caching
```bash
uv add redis
```

```python
# app/core/cache.py
import redis
import json
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache(expire: int = 300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and args
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Call function
            result = await func(*args, **kwargs)
            
            # Save to cache
            redis_client.setex(cache_key, expire, json.dumps(result))
            return result
        return wrapper
    return decorator

# Используй:
@router.get("/events/")
@cache(expire=60)  # Cache for 1 minute
async def get_events(...):
    ...
```

**Задание 6.4:** Добавь background tasks
```python
# app/services/email_service.py
from fastapi import BackgroundTasks

def send_welcome_email(email: str):
    # Реальная отправка email
    time.sleep(2)  # Имитация задержки
    print(f"Email sent to {email}")

@router.post("/register")
async def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = create_user(db, user_data)
    
    # Отправка email в фоне (не блокирует response)
    background_tasks.add_task(send_welcome_email, user.email)
    
    return user
```

**Задание 6.5:** Добавь Celery для тяжелых задач
```bash
uv add celery[redis]
```

```python
# app/celery_app.py
from celery import Celery

celery_app = Celery(
    'eventure',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

@celery_app.task
def generate_event_report(event_id: int):
    """Генерация отчета может занять минуты"""
    # Тяжелая обработка данных
    return {"report": "..."}

# Вызов:
task = generate_event_report.delay(event_id)
```

---

## 🐳 День 7: Deployment & Production

### Утро: Docker & Docker Compose (4 часа)

#### Практика
**Задание 7.1:** Создай Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Copy application
COPY . .

# Run migrations and start server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]

EXPOSE 8000
```

**Задание 7.2:** Создай docker-compose.yml
```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: eventure
      POSTGRES_PASSWORD: eventure123
      POSTGRES_DB: eventure_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://eventure:eventure123@db/eventure_db
      SECRET_KEY: your-secret-key-change-in-production
      DEBUG: "False"
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    restart: unless-stopped

volumes:
  postgres_data:
```

**Задание 7.3:** Запусти в Docker
```bash
docker-compose up --build
```

---

### День: Production Deployment (4 часа)

#### Практика
**Задание 7.4:** Настрой production environment
```python
# app/core/config.py
class Settings(BaseSettings):
    # Production settings
    ENVIRONMENT: str = "production"
    
    # Security
    ALLOWED_HOSTS: list[str] = ["yourdomain.com", "www.yourdomain.com"]
    SECURE_COOKIES: bool = True
    
    # Database connection pooling
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    
    # Logging
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: Optional[str] = None  # Error tracking

# app/main.py
if settings.ENVIRONMENT == "production":
    # Disable docs in production
    app = FastAPI(docs_url=None, redoc_url=None)
    
    # Add Sentry
    if settings.SENTRY_DSN:
        import sentry_sdk
        sentry_sdk.init(dsn=settings.SENTRY_DSN)
```

**Задание 7.5:** Добавь health checks
```python
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint для load balancer"""
    try:
        # Check database
        db.execute(text("SELECT 1"))
        
        # Check Redis (если используешь)
        # redis_client.ping()
        
        return {"status": "healthy"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
```

**Задание 7.6:** Deploy на production server
```bash
# На сервере (Ubuntu/Debian):
# 1. Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose

# 2. Clone repo
git clone https://github.com/TemirlanTyulyubayev/eventure.git
cd eventure

# 3. Set production environment
cp .env.example .env
# Отредактируй .env с production values

# 4. Run with SSL (nginx + certbot)
# Создай docker-compose.prod.yml с nginx
docker-compose -f docker-compose.prod.yml up -d

# 5. Setup auto-restart
docker update --restart=unless-stopped <container_name>
```

---

## 📚 Бонус: Advanced Topics

### Мониторинг
```python
# Prometheus metrics
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
# Metrics на /metrics
```

### GraphQL API
```python
import strawberry
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Event:
    id: int
    title: str
    
@strawberry.type
class Query:
    @strawberry.field
    def events(self) -> List[Event]:
        return [...]

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")
```

### WebSockets для real-time
```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Real-time notifications
```

---

## ✅ Чек-лист: Production-Ready Backend

- [ ] Clean Architecture (layers separated)
- [ ] Proper error handling everywhere
- [ ] Input validation (Pydantic)
- [ ] Authentication & Authorization
- [ ] Database indexes on foreign keys
- [ ] Migrations (up & down)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests для API
- [ ] API documentation (OpenAPI)
- [ ] Logging (structured, levels)
- [ ] Environment configs
- [ ] Database connection pooling
- [ ] Rate limiting на sensitive endpoints
- [ ] CORS настроен правильно
- [ ] Security headers
- [ ] Docker & Docker Compose
- [ ] Health check endpoint
- [ ] Graceful shutdown
- [ ] Monitoring (Sentry/Prometheus)
- [ ] Backup strategy для database
- [ ] CI/CD pipeline

---

## 🎓 Итоги недели

После этой недели ты будешь:
1. ✅ Понимать архитектуру production backend
2. ✅ Уметь проектировать REST API
3. ✅ Работать с SQLAlchemy как профи
4. ✅ Писать тесты и поддерживать code quality
5. ✅ Оптимизировать performance
6. ✅ Деплоить приложения в production

## 📖 Дополнительные ресурсы

**Книги:**
- "Clean Architecture" - Robert Martin
- "Database Reliability Engineering" - O'Reilly
- "Release It!" - Michael Nygard

**Документация:**
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Pydantic: https://docs.pydantic.dev/

**Практика:**
- Каждый день коммить прогресс
- Code review собственного кода через день
- Документируй learnings в NOTES.md

---

Удачи! Через неделю ты будешь senior backend разработчиком! 💪
