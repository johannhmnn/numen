mod dto;
mod error;
mod repository;

use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use dto::{
    AccountResponse, BalanceResponse, CreateAccountRequest, CreateTransactionRequest,
    StatusResponse,
};
use error::ApiError;
use repository::{LedgerRepository, RepositoryError, SqliteLedgerRepository};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HealthResponse {
    pub service: String,
    pub status: String,
}

#[derive(Clone)]
struct AppState {
    repository: Arc<dyn LedgerRepository>,
}

pub async fn app() -> Result<Router, RepositoryError> {
    let database_url =
        std::env::var("NUMEN_DATABASE_URL").unwrap_or_else(|_| "sqlite://numen.db".to_owned());
    let repository: Arc<dyn LedgerRepository> =
        Arc::new(SqliteLedgerRepository::connect(&database_url).await?);

    Ok(app_with_repository(repository))
}

fn app_with_repository(repository: Arc<dyn LedgerRepository>) -> Router {
    let state = AppState { repository };

    Router::new()
        .route("/health", get(health))
        .route("/accounts", post(create_account).get(list_accounts))
        .route("/transactions", post(create_transaction))
        .route("/accounts/{name}/balance", get(get_balance))
        .with_state(state)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        service: "numen-api".to_owned(),
        status: "ok".to_owned(),
    })
}

async fn create_account(
    State(state): State<AppState>,
    Json(payload): Json<CreateAccountRequest>,
) -> Result<(StatusCode, Json<AccountResponse>), ApiError> {
    let account = payload.into_domain()?;
    let account = state.repository.create_account(&account).await?;

    Ok((StatusCode::CREATED, Json(account.into())))
}

async fn list_accounts(
    State(state): State<AppState>,
) -> Result<Json<Vec<AccountResponse>>, ApiError> {
    let accounts = state
        .repository
        .list_accounts()
        .await?
        .into_iter()
        .map(AccountResponse::from)
        .collect();

    Ok(Json(accounts))
}

async fn create_transaction(
    State(state): State<AppState>,
    Json(payload): Json<CreateTransactionRequest>,
) -> Result<(StatusCode, Json<StatusResponse>), ApiError> {
    let transaction = payload.into_domain()?;

    match state.repository.create_transaction(&transaction).await {
        Ok(()) => Ok((
            StatusCode::CREATED,
            Json(StatusResponse { status: "created" }),
        )),
        Err(RepositoryError::AccountNotFound(name)) => Err(ApiError::BadRequest(format!(
            "posting references unknown account `{name}`"
        ))),
        Err(error) => Err(error.into()),
    }
}

async fn get_balance(
    State(state): State<AppState>,
    Path(account_name): Path<String>,
) -> Result<Json<BalanceResponse>, ApiError> {
    let balance = state.repository.account_balance(&account_name).await?;

    Ok(Json(BalanceResponse {
        account: account_name,
        balance: balance.value().to_string(),
    }))
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::{
        body::{Body, to_bytes},
        http::{Request, StatusCode},
    };
    use serde_json::{Value, json};
    use tower::ServiceExt;

    use super::{HealthResponse, app_with_repository};
    use crate::repository::{LedgerRepository, SqliteLedgerRepository};

    #[tokio::test]
    async fn health_endpoint_returns_success_payload() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::OK);

        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body bytes");
        let payload: HealthResponse = serde_json::from_slice(&body).expect("health payload");

        assert_eq!(
            payload,
            HealthResponse {
                service: "numen-api".to_owned(),
                status: "ok".to_owned(),
            }
        );
    }

    #[tokio::test]
    async fn create_account_endpoint_persists_normalized_account() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/accounts")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        json!({ "name": "  Assets:Checking  ", "type": "Assets" }).to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::CREATED);

        let payload = read_json(response).await;

        assert_eq!(
            payload,
            json!({ "name": "Assets:Checking", "type": "Assets" })
        );
    }

    #[tokio::test]
    async fn list_accounts_endpoint_returns_persisted_accounts() {
        let app = test_app().await;
        let app = create_account_through_http(app, "Assets:Checking", "Assets").await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/accounts")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::OK);

        let payload = read_json(response).await;

        assert_eq!(
            payload,
            json!([{ "name": "Assets:Checking", "type": "Assets" }])
        );
    }

    #[tokio::test]
    async fn duplicate_account_create_is_rejected() {
        let app = test_app().await;
        let app = create_account_through_http(app, "Assets:Checking", "Assets").await;
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/accounts")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        json!({ "name": "Assets:Checking", "type": "Assets" }).to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::CONFLICT);

        let payload = read_json(response).await;

        assert_eq!(
            payload,
            json!({ "error": "account `Assets:Checking` already exists" })
        );
    }

    #[tokio::test]
    async fn create_transaction_and_balance_endpoints_use_persisted_data() {
        let app = test_app().await;
        let app = create_account_through_http(app, "Assets:Checking", "Assets").await;
        let app = create_account_through_http(app, "Expenses:Groceries", "Expenses").await;
        let transaction_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/transactions")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        json!({
                            "date": "2026-03-25",
                            "title": "Groceries",
                            "payee": "Market",
                            "primary_category": "Groceries",
                            "tags": ["food", "home"],
                            "postings": [
                                { "account": "Assets:Checking", "amount": "-12.50" },
                                { "account": "Expenses:Groceries", "amount": "12.50" }
                            ]
                        })
                        .to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("transaction response");

        assert_eq!(transaction_response.status(), StatusCode::CREATED);

        let transaction_payload = read_json(transaction_response).await;

        assert_eq!(transaction_payload, json!({ "status": "created" }));

        let balance_response = app
            .oneshot(
                Request::builder()
                    .uri("/accounts/Expenses:Groceries/balance")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("balance response");

        assert_eq!(balance_response.status(), StatusCode::OK);

        let balance_payload = read_json(balance_response).await;

        assert_eq!(
            balance_payload,
            json!({ "account": "Expenses:Groceries", "balance": "12.50" })
        );
    }

    #[tokio::test]
    async fn balance_endpoint_returns_not_found_for_unknown_account() {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/accounts/Assets:Missing/balance")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let payload = read_json(response).await;

        assert_eq!(
            payload,
            json!({ "error": "account `Assets:Missing` was not found" })
        );
    }

    async fn test_app() -> axum::Router {
        let repository: Arc<dyn LedgerRepository> = Arc::new(
            SqliteLedgerRepository::connect_in_memory()
                .await
                .expect("test repository"),
        );

        app_with_repository(repository)
    }

    async fn create_account_through_http(
        app: axum::Router,
        name: &str,
        account_type: &str,
    ) -> axum::Router {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/accounts")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        json!({ "name": name, "type": account_type }).to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(response.status(), StatusCode::CREATED);

        app
    }

    async fn read_json(response: axum::response::Response) -> Value {
        serde_json::from_slice(
            &to_bytes(response.into_body(), usize::MAX)
                .await
                .expect("body bytes"),
        )
        .expect("json body")
    }
}
