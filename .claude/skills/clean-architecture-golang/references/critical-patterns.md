# Critical Patterns and Rules

## CRITICAL: Integration Adapters MUST Implement Usecase Interfaces

**This is the most important pattern in this architecture!**

Any integration component (Repository, WebService, Utils, etc.) that will be used by the application layer MUST implement the corresponding usecase interfaces.

### Why This Pattern?

1. **Clean Dependencies**: Application layer defines what it needs (usecases), integration layer provides implementations
2. **Type Safety**: Enables type casting in dependency injection
3. **Contract Enforcement**: Ensures integration components fulfill application requirements
4. **Testability**: Easy to mock usecase interfaces for testing

### Implementation Example

```go
// STEP 1: Application layer defines what it needs
// /internal/application/usecase/find_product.go
package usecase

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
)

type FindProduct interface {
    FindById(ctx context.Context, id string) (*entity.Product, error)
    FindByName(ctx context.Context, name string) (*entity.Product, error)
}

// /internal/application/usecase/save_product.go
type SaveProduct interface {
    Save(ctx context.Context, product entity.Product) (*entity.Product, error)
}

// /internal/application/usecase/send_email.go
type SendEmail interface {
    SendWelcomeEmail(ctx context.Context, email string) error
}

// STEP 2: Integration adapter interfaces MUST embed usecase interfaces
// /internal/integration/adapter/product_repository.go
package adapter

import "github.com/bhlabz/maxsatt-api/internal/application/usecase"

type ProductRepository interface {
    usecase.FindProduct    // MUST implement
    usecase.SaveProduct    // MUST implement
}

// /internal/integration/adapter/email_sender.go
type EmailSenderUtils interface {
    usecase.SendEmail      // MUST implement
}

// /internal/integration/adapter/payment_web_service.go
type PaymentWebService interface {
    usecase.ProcessPayment // MUST implement
}

// STEP 3: Concrete implementations
// /internal/integration/persistence/product.go
package persistence

type productRepository struct {
    db *gorm.DB
}

// Implements usecase.FindProduct
func (r *productRepository) FindById(ctx context.Context, id string) (*entity.Product, error) {
    // Implementation
}

func (r *productRepository) FindByName(ctx context.Context, name string) (*entity.Product, error) {
    // Implementation
}

// Implements usecase.SaveProduct
func (r *productRepository) Save(ctx context.Context, product entity.Product) (*entity.Product, error) {
    // Implementation
}

// STEP 4: Type casting in dependency injector
// /internal/infra/dependency/injector.go
func (i *injector) GetCreateProductService() adapter.CreateProductService {
    return service.NewCreateProductService(
        usecase.FindProduct(i.GetProductRepository()),  // Type cast repository to usecase
        usecase.SaveProduct(i.GetProductRepository()),  // Type cast repository to usecase
        usecase.SendEmail(i.GetEmailSender()),          // Type cast utils to usecase
    )
}
```

## Error Code Convention

**Format**: `PREFIX-XXYYYY`

- **PREFIX**: 3 letters identifying the domain
  - CLI = Client
  - USR = User  
  - FOR = Forest
  - PRD = Product
  - ORD = Order
  - PAY = Payment
  - REG = Registration

- **XX**: 2 digits for error type
  - 01 = Client error (4xx)
  - 02 = Server error (5xx)
  - 00 = Other errors

- **YYY**: 3 digits for HTTP status code
  - 400 = Bad Request
  - 401 = Unauthorized
  - 403 = Forbidden
  - 404 = Not Found
  - 409 = Conflict
  - 500 = Internal Server Error

### Examples

```go
// Client already exists (conflict)
"CLI-01409"

// User not found
"USR-01404"  

// Forest server error
"FOR-02500"

// Registration bad request
"REG-01400"
```

## DTO/Entity/Model Conversion Flow

```
HTTP Request → DTO → Entity → Model → Database
HTTP Response ← DTO ← Entity ← Model ← Database
```

### Conversion Rules

1. **Controller Layer**: DTO ↔ Entity
2. **Repository Layer**: Entity ↔ Model
3. **Never expose**:
   - Entities in HTTP responses
   - Models outside persistence layer
   - DTOs in domain/application layers

### Conversion Methods

```go
// DTO → Entity
func (dto ClientDTO) ToEntity() entity.Client {
    return entity.Client{
        Name:  dto.Name,
        Email: dto.Email,
    }
}

// Entity → DTO
func NewClientResponse(entity entity.Client) *ClientResponse {
    return &ClientResponse{
        Id:    entity.Id,
        Name:  entity.Name,
        Email: entity.Email,
    }
}

// Entity → Model
func NewClientModel(entity entity.Client) *Client {
    return &Client{
        Id:    entity.Id,
        Name:  entity.Name,
        Email: entity.Email,
    }
}

// Model → Entity
func (model Client) ToEntity() entity.Client {
    return entity.Client{
        Id:    model.Id,
        Name:  model.Name,
        Email: model.Email,
    }
}
```

## Service Composition Pattern

Services can orchestrate other services and usecases:

```go
type createClientService struct {
    findClient        usecase.FindClient         // Usecase
    saveClient        usecase.SaveClient         // Usecase
    createUserService adapter.CreateUserService  // Another service
}

func (s *createClientService) Create(ctx context.Context, client entity.Client) (*entity.Client, error) {
    // 1. Use usecase to check existence
    existing, err := s.findClient.FindByEmail(ctx, client.Email)
    if existing != nil {
        return nil, domainError.ClientAlreadyExists()
    }
    
    // 2. Use usecase to save
    saved, err := s.saveClient.Save(ctx, client)
    if err != nil {
        return nil, err
    }
    
    // 3. Use another service for related operation
    err = s.createUserService.Create(ctx, saved.Id, user, role.UserRoot)
    if err != nil {
        return nil, err
    }
    
    return saved, nil
}
```

## Logging Strategy

### Log Levels by Layer

- **Services**: Use `logger.Info()` for main operations
- **Repositories**: Use `logger.Debug()` for database operations
- **WebServices**: Use `logger.Debug()` for external API calls
- **Controllers**: Use `logger.Debug()` for request/response

### Log Pattern

```go
func (s *service) Operation(ctx context.Context, input Type) (*Output, error) {
    logger.Info(ctx, "Started", input)
    
    // ... operation logic ...
    
    logger.Info(ctx, "Finished", result)
    return result, nil
}
```

## Context Usage

**Always pass `context.Context` as the first parameter**:

```go
// ✅ Correct
func FindById(ctx context.Context, id string) (*entity.Client, error)

// ❌ Wrong
func FindById(id string) (*entity.Client, error)
```

## Dependency Rules

### ✅ Allowed Dependencies

- Domain → Nothing (independent)
- Application → Domain only
- Integration → Application, Domain
- Infrastructure → All layers

### ❌ Forbidden Dependencies

- Domain → Any other layer
- Application → Integration or Infrastructure
- Circular dependencies between any layers

## File Naming Conventions

- **Files**: snake_case (e.g., `client_repository.go`)
- **One main type per file**: File name should match the main type
- **Error files**: Match function name (e.g., `client_already_exists.go`)

## Interface Naming

- **Suffix with capability**: `CreateClientService`, `FindClient`, `SaveProduct`
- **No "I" prefix**: Use `ClientRepository`, not `IClientRepository`
- **Describe what it does**: `EmailSender`, not `EmailService`

## Critical Validation Points

Before implementing any feature, verify:

1. **BDD test exists**: Never skip test-first development
2. **Usecase interfaces defined**: Application layer contracts
3. **Integration adapters implement usecases**: Type casting will work
4. **No layer violations**: Dependencies flow inward only
5. **Error codes follow convention**: PREFIX-XXYYYY format
6. **Conversions at boundaries**: DTO↔Entity↔Model
