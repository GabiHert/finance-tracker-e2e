// /internal/integration/persistence/ENTITY_NAME.go
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

type ENTITY_NAMERepository struct {
	db *gorm.DB
}

func NewENTITY_NAMERepository(db *gorm.DB) adapter.ENTITY_NAMERepository {
	return &ENTITY_NAMERepository{db: db}
}

// Implements usecase.SaveENTITY_NAME
func (r *ENTITY_NAMERepository) Save(ctx context.Context, entityObj entity.ENTITY_NAME) (*entity.ENTITY_NAME, error) {
	logger.Debug(ctx, "Started", entityObj)

	modelObj := model.NewENTITY_NAMEModel(entityObj)
	if err := r.db.Create(modelObj).Error; err != nil {
		return nil, errs.DatabaseError(err, "PREFIX-02500")
	}

	result := modelObj.ToEntity()
	logger.Debug(ctx, "Finished", result)
	return &result, nil
}

// Implements usecase.FindENTITY_NAME
func (r *ENTITY_NAMERepository) FindById(ctx context.Context, id string) (*entity.ENTITY_NAME, error) {
	logger.Debug(ctx, "Started", id)

	var modelObj model.ENTITY_NAME
	err := r.db.Where("id = ?", id).First(&modelObj).Error
	if err == gorm.ErrRecordNotFound {
		return nil, errs.NotFoundError("ENTITY_NAME not found", "PREFIX-01404")
	}
	if err != nil {
		return nil, errs.DatabaseError(err, "PREFIX-02500")
	}

	result := modelObj.ToEntity()
	logger.Debug(ctx, "Finished", result)
	return &result, nil
}

// Add other usecase interface implementations
// FindByField, ListByPageAndLimit, Update, Delete, etc.
