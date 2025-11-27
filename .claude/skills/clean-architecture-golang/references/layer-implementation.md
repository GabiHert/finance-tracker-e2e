# Layer Implementation Reference

## Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│  Integration Layer (Adapters)                       │
│  /internal/integration/                             │
│  - Controllers, DTOs, Repositories, WebServices     │
└────────────────┬────────────────────────────────────┘
                 │ depends on ↓
┌────────────────▼────────────────────────────────────┐
│  Application Layer (Use Cases)                      │
│  /internal/application/                             │
│  - Services, UseCases, Adapter Interfaces           │
└────────────────┬────────────────────────────────────┘
                 │ depends on ↓
┌────────────────▼────────────────────────────────────┐
│  Domain Layer (Business Logic)                      │
│  /internal/domain/                                  │
│  - Entities, Domain Errors, Enums                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Infrastructure Layer (Framework & Tools)           │
│  /internal/infra/                                   │
│  - Dependency Injection, Router, DB Config          │
└─────────────────────────────────────────────────────┘
```

## Domain Layer (`/internal/domain/`)

### Entities (`/internal/domain/entity/`)

Simple data structures representing business concepts. **NO business logic**.

```go
// /internal/domain/entity/client.go
package entity

import "time"

type Client struct {
    Id        string
    Name      string
    Email     string
    CreatedAt time.Time
    UpdatedAt time.Time
}

// Constructor for new entities
func NewClient(id, name, email string) Client {
    return Client{
        Id:    id,
        Name:  name,
        Email: email,
    }
}
```

**Rules**:
- Only exported struct with fields
- Use PascalCase for exported fields
- Include audit fields (CreatedAt, UpdatedAt)
- Optional: Constructor functions for complex initialization
- NO methods (business logic goes in services)
- NO validation logic
- NO database annotations

### Domain Errors (`/internal/domain/error/`)

Domain-specific errors as functions that return errors.

```go
// /internal/domain/error/client_already_exists.go
package error

import "github.com/bhlabz/maxsatt-api/pkg/errs"

func ClientAlreadyExists() error {
    return errs.ClientError("Client already exists", "CLI-01409", 409)
}
```

**Error Code Format**: `PREFIX-XXYYYY`
- PREFIX: 3 letters identifying the domain (CLI, USR, FOR, etc.)
- XX: 2 digits for error type (01=client error, 02=server error, etc.)
- YYY: 3 digits for HTTP status code (400, 404, 409, 500, etc.)

### Enums (`/internal/domain/enums/`)

```go
// /internal/domain/enums/role.go
package enums

type Role string

// /internal/domain/enums/role/value.go
package role

const (
    Admin    = "ADMIN"
    User     = "USER"
    UserRoot = "USER_ROOT"
)
```

## Application Layer (`/internal/application/`)

### Adapter Interfaces (`/internal/application/adapter/`)

Define contracts that the application layer needs from outer layers.

```go
// /internal/application/adapter/create_client.go
package adapter

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
)

type CreateClientService interface {
    Create(ctx context.Context, client entity.Client) (*entity.Client, error)
}
```

### UseCases (`/internal/application/usecase/`)

Single-purpose interface definitions for atomic operations.

```go
// /internal/application/usecase/find_client.go
package usecase

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
)

type FindClient interface {
    FindById(ctx context.Context, clientId string) (*entity.Client, error)
    FindByEmail(ctx context.Context, email string) (*entity.Client, error)
    ListByPartialNameAndPageAndLimit(ctx context.Context, name *string, page, limit int) ([]entity.Client, int64, error)
}
```

### Services (`/internal/application/service/`)

Orchestrate multiple usecases to implement business workflows.

```go
// /internal/application/service/create_client.go
package service

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/application/adapter"
    "github.com/bhlabz/maxsatt-api/internal/application/usecase"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    domainError "github.com/bhlabz/maxsatt-api/internal/domain/error"
    "github.com/bhlabz/maxsatt-api/pkg/logger"
)

type createClientService struct {
    findClient        usecase.FindClient
    saveClient        usecase.SaveClient
    createUserService adapter.CreateUserService
}

func NewCreateClientService(
    findClient usecase.FindClient,
    saveClient usecase.SaveClient,
    createUserService adapter.CreateUserService,
) adapter.CreateClientService {
    return &createClientService{
        findClient:        findClient,
        saveClient:        saveClient,
        createUserService: createUserService,
    }
}

func (c *createClientService) Create(ctx context.Context, client entity.Client) (*entity.Client, error) {
    logger.Info(ctx, "Started", client)

    // 1. Business validation
    existingClient, err := c.findClient.FindByEmail(ctx, client.Email)
    if err == nil && existingClient != nil {
        return nil, domainError.ClientAlreadyExists()
    }

    // 2. Execute operation
    clientSaved, err := c.saveClient.Save(ctx, client)
    if err != nil {
        return nil, err
    }

    logger.Info(ctx, "Finished", clientSaved)
    return clientSaved, nil
}
```

## Integration Layer (`/internal/integration/`)

### Controllers (`/internal/integration/entrypoint/controller/`)

Handle HTTP requests and responses using DTOs.

```go
// /internal/integration/entrypoint/controller/client.go
package controller

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/application/adapter"
    "github.com/bhlabz/maxsatt-api/internal/integration/entrypoint/dto"
    "github.com/bhlabz/maxsatt-api/pkg/logger"
    "github.com/bhlabz/maxsatt-api/pkg/utils"
)

type clientController struct {
    createClient adapter.CreateClientService
    listClients  adapter.ListClientsService
}

func NewClientController(
    createClient adapter.CreateClientService,
    listClients adapter.ListClientsService,
) adapter.ClientController {
    return &clientController{
        createClient: createClient,
        listClients:  listClients,
    }
}

func (c *clientController) Create(ctx context.Context, payload dto.Client) (*dto.ClientResponse, error) {
    logger.Debug(ctx, "Started", payload)
    
    entity := payload.ToEntity()
    entity.Id = utils.GenerateId()
    
    client, err := c.createClient.Create(ctx, entity)
    if err != nil {
        return nil, err
    }
    
    response := dto.NewClientResponse(*client)
    logger.Debug(ctx, "Finished", response)
    return response, nil
}
```

### DTOs (`/internal/integration/entrypoint/dto/`)

Data Transfer Objects for HTTP communication.

```go
// /internal/integration/entrypoint/dto/client.go
package dto

import (
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    "time"
)

// Request DTO
type Client struct {
    Name  string `json:"name" validate:"required,min=3,max=100"`
    Email string `json:"email" validate:"required,email"`
}

func (c Client) ToEntity() entity.Client {
    return entity.Client{
        Name:  c.Name,
        Email: c.Email,
    }
}

// Response DTO
type ClientResponse struct {
    Id        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

func NewClientResponse(client entity.Client) *ClientResponse {
    return &ClientResponse{
        Id:        client.Id,
        Name:      client.Name,
        Email:     client.Email,
        CreatedAt: client.CreatedAt,
    }
}
```

### Repositories (`/internal/integration/persistence/`)

Database operations implementing usecase interfaces.

```go
// /internal/integration/persistence/client.go
package persistence

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    "github.com/bhlabz/maxsatt-api/internal/integration/adapter"
    "github.com/bhlabz/maxsatt-api/internal/integration/persistence/model"
    "github.com/bhlabz/maxsatt-api/pkg/errs"
    "github.com/bhlabz/maxsatt-api/pkg/logger"
    "gorm.io/gorm"
)

type clientRepository struct {
    db *gorm.DB
}

func NewClientRepository(db *gorm.DB) adapter.ClientRepository {
    return &clientRepository{db: db}
}

func (r *clientRepository) Save(ctx context.Context, entity entity.Client) (*entity.Client, error) {
    logger.Debug(ctx, "Started", entity)
    
    clientModel := model.NewClientModel(entity)
    if err := r.db.Create(clientModel).Error; err != nil {
        return nil, errs.DatabaseError(err, "REG-01500")
    }
    
    result := clientModel.ToEntity()
    logger.Debug(ctx, "Finished", result)
    return &result, nil
}

func (r *clientRepository) FindById(ctx context.Context, id string) (*entity.Client, error) {
    logger.Debug(ctx, "Started", id)
    
    var clientModel model.Client
    err := r.db.Where("id = ?", id).First(&clientModel).Error
    if err == gorm.ErrRecordNotFound {
        return nil, errs.NotFoundError("Client not found", "CLI-01404")
    }
    if err != nil {
        return nil, errs.DatabaseError(err, "CLI-01500")
    }
    
    result := clientModel.ToEntity()
    logger.Debug(ctx, "Finished", result)
    return &result, nil
}
```

### Models (`/internal/integration/persistence/model/`)

Database models with GORM annotations.

```go
// /internal/integration/persistence/model/client.go
package model

import (
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    "gorm.io/gorm"
    "time"
)

type Client struct {
    Id        string         `gorm:"primarykey;size:45"`
    Name      string         `gorm:"size:100;not null"`
    Email     string         `gorm:"size:100;not null;unique"`
    CreatedAt time.Time      `gorm:"not null"`
    UpdatedAt time.Time      `gorm:"not null"`
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (Client) TableName() string {
    return "clients"
}

func NewClientModel(entity entity.Client) *Client {
    return &Client{
        Id:        entity.Id,
        Name:      entity.Name,
        Email:     entity.Email,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
}

func (c Client) ToEntity() entity.Client {
    return entity.Client{
        Id:        c.Id,
        Name:      c.Name,
        Email:     c.Email,
        CreatedAt: c.CreatedAt,
        UpdatedAt: c.UpdatedAt,
    }
}
```

## Infrastructure Layer (`/internal/infra/`)

### Dependency Injection (`/internal/infra/dependency/injector.go`)

```go
func (i *injector) GetClientController() adapter.ClientController {
    if i.clientController == nil {
        i.clientController = controller.NewClientController(
            i.GetCreateClientService(),
            i.GetListClientsService(),
        )
    }
    return i.clientController
}

func (i *injector) GetCreateClientService() adapter.CreateClientService {
    if i.createClientService == nil {
        i.createClientService = service.NewCreateClientService(
            usecase.FindClient(i.GetClientRepository()),
            usecase.SaveClient(i.GetClientRepository()),
            i.GetCreateUserService(),
        )
    }
    return i.createClientService
}

func (i *injector) GetClientRepository() adapter.ClientRepository {
    if i.clientRepository == nil {
        i.clientRepository = persistence.NewClientRepository(i.Db)
    }
    return i.clientRepository
}
```

### Router (`/internal/infra/server/router/router.go`)

```go
func (r *router) Route() *fiber.App {
    app := fiber.New()

    v1 := app.Group("/v1")

    clients := v1.Group("/clients")
    clients.Post("/",
        r.validatePayload("CLI-01400", dto.Client{}),
        func(c *fiber.Ctx) error {
            client := c.Locals("Client").(*dto.Client)
            response, err := r.clientController.Create(c.Context(), *client)
            if err != nil {
                return err
            }
            return c.JSON(response).Status(fiber.StatusCreated)
        })

    return app
}
```
