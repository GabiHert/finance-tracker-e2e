# Implementation Workflow

## Complete Feature Implementation Steps

### Step 1: Create BDD Feature File (MANDATORY)

**NEVER SKIP THIS STEP!** Always start with the BDD test.

Location: `/test/integration/features/feature-name.feature`

```gherkin
#language: en
#utf-8

@all @create_product
Feature: Create product functionality

  Background:
    Given the tables are empty
    And the header is empty

  @create_product @contract_fields_validation
  Scenario Outline: Create product failure - bad request
    When I call "POST" "/v1/products" with the following payload
    """
    {
      "name": <name>,
      "price": <price>
    }
    """
    Then the status returned should be 400
    And the response should contain the field "error.code" equal to "PRD-01400"
    And the response should contain the field "error.error_details.0.attribute" equal to "<attribute>"
    And the response should contain the field "error.error_details.0.messages.0" equal to "<message>"

    Examples:
      | name      | price  | attribute | message                    |
      | ""        | 99.99  | name      | REQUIRED_ATTRIBUTE_MISSING |
      | null      | 99.99  | name      | REQUIRED_ATTRIBUTE_MISSING |
      | "Product" | null   | price     | REQUIRED_ATTRIBUTE_MISSING |
      | "Product" | -1     | price     | INVALID_VALUE              |

  @create_product @success
  Scenario: Create product success
    When I call "POST" "/v1/products" with the following payload
    """
    {
      "name": "Test Product",
      "price": 99.99,
      "description": "Product description"
    }
    """
    Then the status returned should be 201
    And the response should contain the field "id" equal to "not nil"
    And the response should contain the field "name" equal to "Test Product"
    And the db should contain 1 objects in the "products" table
```

### Step 2: Domain Layer Implementation

#### 2.1 Create Entity
Location: `/internal/domain/entity/product.go`

```go
package entity

import "time"

type Product struct {
    Id          string
    Name        string
    Price       float64
    Description string
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

func NewProduct(id, name, description string, price float64) Product {
    return Product{
        Id:          id,
        Name:        name,
        Price:       price,
        Description: description,
    }
}
```

#### 2.2 Create Domain Errors
Location: `/internal/domain/error/`

```go
// product_already_exists.go
package error

import "github.com/bhlabz/maxsatt-api/pkg/errs"

func ProductAlreadyExists() error {
    return errs.ClientError("Product already exists", "PRD-01409", 409)
}

// product_not_found.go
func ProductNotFound() error {
    return errs.NotFoundError("Product not found", "PRD-01404")
}
```

#### 2.3 Create Enums (if needed)
Location: `/internal/domain/enums/product_status/`

```go
// /internal/domain/enums/product_status.go
package enums

type ProductStatus string

// /internal/domain/enums/product_status/value.go
package product_status

const (
    Active   = "ACTIVE"
    Inactive = "INACTIVE"
    Draft    = "DRAFT"
)
```

### Step 3: Application Layer Implementation

#### 3.1 Create Adapter Interface
Location: `/internal/application/adapter/create_product.go`

```go
package adapter

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
)

type CreateProductService interface {
    Create(ctx context.Context, product entity.Product) (*entity.Product, error)
}
```

#### 3.2 Create UseCase Interfaces
Location: `/internal/application/usecase/`

```go
// find_product.go
package usecase

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
)

type FindProduct interface {
    FindById(ctx context.Context, id string) (*entity.Product, error)
    FindByName(ctx context.Context, name string) (*entity.Product, error)
    ListByPageAndLimit(ctx context.Context, page, limit int) ([]entity.Product, int64, error)
}

// save_product.go
type SaveProduct interface {
    Save(ctx context.Context, product entity.Product) (*entity.Product, error)
}

// update_product.go
type UpdateProduct interface {
    Update(ctx context.Context, product entity.Product) (*entity.Product, error)
}

// delete_product.go
type DeleteProduct interface {
    Delete(ctx context.Context, id string) error
}
```

#### 3.3 Create Service Implementation
Location: `/internal/application/service/create_product.go`

```go
package service

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/application/adapter"
    "github.com/bhlabz/maxsatt-api/internal/application/usecase"
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    domainError "github.com/bhlabz/maxsatt-api/internal/domain/error"
    "github.com/bhlabz/maxsatt-api/pkg/logger"
)

type createProductService struct {
    findProduct usecase.FindProduct
    saveProduct usecase.SaveProduct
}

func NewCreateProductService(
    findProduct usecase.FindProduct,
    saveProduct usecase.SaveProduct,
) adapter.CreateProductService {
    return &createProductService{
        findProduct: findProduct,
        saveProduct: saveProduct,
    }
}

func (s *createProductService) Create(ctx context.Context, product entity.Product) (*entity.Product, error) {
    logger.Info(ctx, "Started", product)

    // Business validation
    existing, _ := s.findProduct.FindByName(ctx, product.Name)
    if existing != nil {
        return nil, domainError.ProductAlreadyExists()
    }

    // Save product
    saved, err := s.saveProduct.Save(ctx, product)
    if err != nil {
        return nil, err
    }

    logger.Info(ctx, "Finished", saved)
    return saved, nil
}
```

### Step 4: Integration Layer Implementation

#### 4.1 Create Integration Adapter Interfaces
Location: `/internal/integration/adapter/`

```go
// product_controller.go
package adapter

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/integration/entrypoint/dto"
)

type ProductController interface {
    Create(ctx context.Context, payload dto.Product) (*dto.ProductResponse, error)
    List(ctx context.Context, page, limit int) (*dto.ProductListResponse, error)
}

// product_repository.go - MUST implement usecase interfaces!
package adapter

import "github.com/bhlabz/maxsatt-api/internal/application/usecase"

type ProductRepository interface {
    usecase.FindProduct    // MUST implement
    usecase.SaveProduct    // MUST implement
    usecase.UpdateProduct  // MUST implement
    usecase.DeleteProduct  // MUST implement
}
```

#### 4.2 Create DTOs
Location: `/internal/integration/entrypoint/dto/product.go`

```go
package dto

import (
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    "time"
)

// Request DTO
type Product struct {
    Name        string  `json:"name" validate:"required,min=3,max=100"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    Description string  `json:"description" validate:"max=500"`
}

func (p Product) ToEntity() entity.Product {
    return entity.Product{
        Name:        p.Name,
        Price:       p.Price,
        Description: p.Description,
    }
}

// Response DTO
type ProductResponse struct {
    Id          string    `json:"id"`
    Name        string    `json:"name"`
    Price       float64   `json:"price"`
    Description string    `json:"description"`
    CreatedAt   time.Time `json:"created_at"`
}

func NewProductResponse(product entity.Product) *ProductResponse {
    return &ProductResponse{
        Id:          product.Id,
        Name:        product.Name,
        Price:       product.Price,
        Description: product.Description,
        CreatedAt:   product.CreatedAt,
    }
}
```

#### 4.3 Create Controller
Location: `/internal/integration/entrypoint/controller/product.go`

```go
package controller

import (
    "context"
    "github.com/bhlabz/maxsatt-api/internal/application/adapter"
    "github.com/bhlabz/maxsatt-api/internal/integration/adapter"
    "github.com/bhlabz/maxsatt-api/internal/integration/entrypoint/dto"
    "github.com/bhlabz/maxsatt-api/pkg/logger"
    "github.com/bhlabz/maxsatt-api/pkg/utils"
)

type productController struct {
    createProduct adapter.CreateProductService
}

func NewProductController(
    createProduct adapter.CreateProductService,
) adapter.ProductController {
    return &productController{
        createProduct: createProduct,
    }
}

func (c *productController) Create(ctx context.Context, payload dto.Product) (*dto.ProductResponse, error) {
    logger.Debug(ctx, "Started", payload)
    
    entity := payload.ToEntity()
    entity.Id = utils.GenerateId()
    
    product, err := c.createProduct.Create(ctx, entity)
    if err != nil {
        return nil, err
    }
    
    response := dto.NewProductResponse(*product)
    logger.Debug(ctx, "Finished", response)
    return response, nil
}
```

#### 4.4 Create Model
Location: `/internal/integration/persistence/model/product.go`

```go
package model

import (
    "github.com/bhlabz/maxsatt-api/internal/domain/entity"
    "gorm.io/gorm"
    "time"
)

type Product struct {
    Id          string         `gorm:"primarykey;size:45"`
    Name        string         `gorm:"size:100;not null;unique"`
    Price       float64        `gorm:"not null"`
    Description string         `gorm:"size:500"`
    CreatedAt   time.Time      `gorm:"not null"`
    UpdatedAt   time.Time      `gorm:"not null"`
    DeletedAt   gorm.DeletedAt `gorm:"index"`
}

func (Product) TableName() string {
    return "products"
}

func NewProductModel(entity entity.Product) *Product {
    return &Product{
        Id:          entity.Id,
        Name:        entity.Name,
        Price:       entity.Price,
        Description: entity.Description,
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
}

func (p Product) ToEntity() entity.Product {
    return entity.Product{
        Id:          p.Id,
        Name:        p.Name,
        Price:       p.Price,
        Description: p.Description,
        CreatedAt:   p.CreatedAt,
        UpdatedAt:   p.UpdatedAt,
    }
}
```

#### 4.5 Create Repository
Location: `/internal/integration/persistence/product.go`

```go
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

type productRepository struct {
    db *gorm.DB
}

func NewProductRepository(db *gorm.DB) adapter.ProductRepository {
    return &productRepository{db: db}
}

// Implements usecase.SaveProduct
func (r *productRepository) Save(ctx context.Context, entity entity.Product) (*entity.Product, error) {
    logger.Debug(ctx, "Started", entity)
    
    productModel := model.NewProductModel(entity)
    if err := r.db.Create(productModel).Error; err != nil {
        return nil, errs.DatabaseError(err, "PRD-02500")
    }
    
    result := productModel.ToEntity()
    logger.Debug(ctx, "Finished", result)
    return &result, nil
}

// Implements usecase.FindProduct
func (r *productRepository) FindById(ctx context.Context, id string) (*entity.Product, error) {
    logger.Debug(ctx, "Started", id)
    
    var productModel model.Product
    err := r.db.Where("id = ?", id).First(&productModel).Error
    if err == gorm.ErrRecordNotFound {
        return nil, errs.NotFoundError("Product not found", "PRD-01404")
    }
    if err != nil {
        return nil, errs.DatabaseError(err, "PRD-02500")
    }
    
    result := productModel.ToEntity()
    logger.Debug(ctx, "Finished", result)
    return &result, nil
}

func (r *productRepository) FindByName(ctx context.Context, name string) (*entity.Product, error) {
    // Implementation...
}

func (r *productRepository) ListByPageAndLimit(ctx context.Context, page, limit int) ([]entity.Product, int64, error) {
    // Implementation...
}

// Implements other usecase interfaces...
```

### Step 5: Infrastructure Layer Setup

#### 5.1 Wire Dependencies
Location: `/internal/infra/dependency/injector.go`

```go
// Add to injector struct
type injector struct {
    // ... existing fields ...
    productController    adapter.ProductController
    createProductService adapter.CreateProductService
    productRepository    adapter.ProductRepository
}

// Add getter methods
func (i *injector) GetProductController() adapter.ProductController {
    if i.productController == nil {
        i.productController = controller.NewProductController(
            i.GetCreateProductService(),
        )
    }
    return i.productController
}

func (i *injector) GetCreateProductService() adapter.CreateProductService {
    if i.createProductService == nil {
        i.createProductService = service.NewCreateProductService(
            usecase.FindProduct(i.GetProductRepository()),  // Type cast
            usecase.SaveProduct(i.GetProductRepository()),  // Type cast
        )
    }
    return i.createProductService
}

func (i *injector) GetProductRepository() adapter.ProductRepository {
    if i.productRepository == nil {
        i.productRepository = persistence.NewProductRepository(i.Db)
    }
    return i.productRepository
}
```

#### 5.2 Add Routes
Location: `/internal/infra/server/router/router.go`

```go
func (r *router) Route() *fiber.App {
    app := fiber.New()
    
    v1 := app.Group("/v1")
    
    // Product routes
    products := v1.Group("/products")
    products.Post("/",
        r.validatePayload("PRD-01400", dto.Product{}),
        func(c *fiber.Ctx) error {
            product := c.Locals("Product").(*dto.Product)
            response, err := r.productController.Create(c.Context(), *product)
            if err != nil {
                return err
            }
            return c.Status(fiber.StatusCreated).JSON(response)
        })
    
    return app
}
```

### Step 6: Run Tests

```bash
# Run BDD tests
make test-integration

# If tests fail, fix implementation and repeat
```

## Implementation Checklist

- [ ] BDD feature file created
- [ ] Domain entity created
- [ ] Domain errors created
- [ ] Application adapter interface created
- [ ] Application usecases defined
- [ ] Application service implemented
- [ ] Integration adapter interfaces created
- [ ] **Integration adapters implement usecase interfaces**
- [ ] DTOs created with conversion methods
- [ ] Controller implemented
- [ ] Model created with conversion methods
- [ ] Repository implemented
- [ ] Dependencies wired in injector
- [ ] Routes added to router
- [ ] BDD tests passing
