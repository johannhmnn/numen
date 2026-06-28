package main

import (
	"log/slog"
	"net/http"
	"os"

	"codeberg.org/oxiccino/numen/internal/httpserver"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	server := &http.Server{
		Addr:    "127.0.0.1:8080",
		Handler: httpserver.New(),
	}

	logger.Info("starting numen server", "addr", server.Addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("numen server stopped", "error", err)
		os.Exit(1)
	}
}
