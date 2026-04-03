use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use numen_core::DomainError;
use serde::Serialize;
use thiserror::Error;

use crate::repository::RepositoryError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum ApiError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    UnprocessableEntity(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    Internal(String),
}

impl From<DomainError> for ApiError {
    fn from(value: DomainError) -> Self {
        Self::BadRequest(value.to_string())
    }
}

impl From<RepositoryError> for ApiError {
    fn from(value: RepositoryError) -> Self {
        match value {
            RepositoryError::DuplicateAccountName(name) => {
                Self::Conflict(format!("account `{name}` already exists"))
            }
            RepositoryError::AccountNotFound(name) => {
                Self::NotFound(format!("account `{name}` was not found"))
            }
            RepositoryError::Domain(error) => Self::BadRequest(error.to_string()),
            RepositoryError::InvalidStoredData(message) => Self::Internal(message),
            RepositoryError::Migration(error) => Self::Internal(error.to_string()),
            RepositoryError::Database(error) => Self::Internal(error.to_string()),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::UnprocessableEntity(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = Json(ErrorResponse {
            error: self.to_string(),
        });

        (status, body).into_response()
    }
}
