package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStaticCacheHeaders(t *testing.T) {
	oldRoot := webRoot
	webRoot = t.TempDir()
	t.Cleanup(func() { webRoot = oldRoot })

	files := map[string]string{
		"index.html":     "<!doctype html><title>x</title>",
		"entware.js":     "console.log('x')",
		"style.css":      "body{}",
		"icons.svg":      "<svg></svg>",
		"version.json":   `{"version":"test"}`,
		"menu/menu.json": `[]`,
	}
	for name, content := range files {
		full := filepath.Join(webRoot, name)
		if err := os.MkdirAll(filepath.Dir(full), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}

	cases := []struct {
		path       string
		contains   string
		shouldHave bool
	}{
		{path: "/entware-manager/", contains: "no-store", shouldHave: true},
		{path: "/entware-manager/version.json", contains: "no-store", shouldHave: true},
		{path: "/entware-manager/menu/menu.json", contains: "no-store", shouldHave: true},
		{path: "/entware-manager/entware.js", contains: "no-cache", shouldHave: true},
		{path: "/entware-manager/style.css", contains: "no-cache", shouldHave: true},
		{path: "/entware-manager/icons.svg", contains: "no-cache", shouldHave: false},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			rec := httptest.NewRecorder()
			handleStatic(rec, req)
			if rec.Code != http.StatusOK {
				t.Fatalf("GET %s = %d, want 200", tc.path, rec.Code)
			}
			header := rec.Header().Get("Cache-Control")
			has := strings.Contains(header, tc.contains)
			if has != tc.shouldHave {
				t.Fatalf("GET %s Cache-Control=%q contains %q = %v, want %v", tc.path, header, tc.contains, has, tc.shouldHave)
			}
		})
	}
}
