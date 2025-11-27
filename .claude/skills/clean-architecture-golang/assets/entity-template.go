// /internal/domain/entity/ENTITY_NAME.go
package entity

import "time"

type ENTITY_NAME struct {
	Id string
	// Add domain fields here
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Optional constructor
func NewENTITY_NAME(id string /* add parameters */) ENTITY_NAME {
	return ENTITY_NAME{
		Id: id,
		// Initialize fields
	}
}

// REMEMBER: NO business logic, NO validation, NO database annotations
