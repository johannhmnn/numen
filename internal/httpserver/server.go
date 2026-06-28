package httpserver

import "net/http"

// New returns the bootstrap HTTP handler for local development.
//
// Example:
//
//	handler := httpserver.New()
func New() http.Handler {
	mux := http.NewServeMux()
	registerHealthRoute(mux)
	return mux
}

func registerHealthRoute(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", handleHealth)
}

func handleHealth(writer http.ResponseWriter, _ *http.Request) {
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte("ok"))
}
