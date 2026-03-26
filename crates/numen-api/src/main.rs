use std::net::{Ipv4Addr, SocketAddr};

use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, 3000));
    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind numen-api listener");

    println!("numen-api listening on http://{addr}");

    let app = numen_api::app().await.expect("build numen-api app");

    axum::serve(listener, app)
        .await
        .expect("numen-api server failed");
}
