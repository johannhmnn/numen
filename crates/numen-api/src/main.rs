use std::net::{Ipv4Addr, SocketAddr};

use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, 3000));
    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind numen-api listener");

    println!("numen-api listening on http://{addr}");

    axum::serve(listener, numen_api::app())
        .await
        .expect("numen-api server failed");
}
