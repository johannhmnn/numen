package httpserver_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"codeberg.org/oxiccino/numen/internal/httpserver"
)

func TestHealthzReturnsOK(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	httpserver.New().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("unexpected status %d: expected %d", recorder.Code, http.StatusOK)
	}

	if recorder.Body.String() != "ok" {
		t.Fatalf("unexpected body %q: expected %q", recorder.Body.String(), "ok")
	}
}
