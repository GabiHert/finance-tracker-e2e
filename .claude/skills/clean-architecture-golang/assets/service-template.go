// /internal/application/service/ACTION_ENTITY.go
package service

import (
	"context"

	"github.com/bhlabz/maxsatt-api/internal/application/adapter"
	"github.com/bhlabz/maxsatt-api/internal/application/usecase"
	"github.com/bhlabz/maxsatt-api/internal/domain/entity"
	"github.com/bhlabz/maxsatt-api/pkg/logger"
)

type ACTION_ENTITYService struct {
	// Add usecase dependencies
	findENTITY usecase.FindENTITY
	saveENTITY usecase.SaveENTITY
	// Add adapter dependencies for other services if needed
}

func NewACTION_ENTITYService(
	findENTITY usecase.FindENTITY,
	saveENTITY usecase.SaveENTITY,
) adapter.ACTION_ENTITYService {
	return &ACTION_ENTITYService{
		findENTITY: findENTITY,
		saveENTITY: saveENTITY,
	}
}

func (s *ACTION_ENTITYService) ACTION(ctx context.Context, entityObj entity.ENTITY) (*entity.ENTITY, error) {
	logger.Info(ctx, "Started", entityObj)

	// 1. Business validation
	// Check if exists, validate business rules, etc.

	// 2. Create main operation
	result, err := s.saveENTITY.Save(ctx, entityObj)
	if err != nil {
		return nil, err
	}

	// 3. Orchestrate dependent operations if needed
	// Call other services, send events, etc.

	logger.Info(ctx, "Finished", result)
	return result, nil
}
