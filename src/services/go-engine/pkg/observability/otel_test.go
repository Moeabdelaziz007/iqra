// بسم الله الرحمن الرحيم
// Unit tests for the observability package (Phase 5a – OpenTelemetry bootstrap).
//
// Scope: functions and constants introduced in otel.go.
// Strategy: exercise the exported surface (Init, Tracer, constants) and the
// internal helpers (isDisabled, newExporter, newResource) by manipulating
// environment variables and asserting on observable behaviour — no real
// collector is required.

package observability

import (
	"context"
	"os"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace/noop"
)

// ── helpers ──────────────────────────────────────────────────────────────────

// setenv sets an env var for the duration of a test and restores it on cleanup.
func setenv(t *testing.T, key, value string) {
	t.Helper()
	prev, hadPrev := os.LookupEnv(key)
	if err := os.Setenv(key, value); err != nil {
		t.Fatalf("setenv(%q, %q): %v", key, value, err)
	}
	t.Cleanup(func() {
		if hadPrev {
			os.Setenv(key, prev)
		} else {
			os.Unsetenv(key)
		}
	})
}

// unsetenv ensures an env var is absent for the duration of a test.
func unsetenv(t *testing.T, key string) {
	t.Helper()
	prev, hadPrev := os.LookupEnv(key)
	os.Unsetenv(key)
	t.Cleanup(func() {
		if hadPrev {
			os.Setenv(key, prev)
		}
	})
}

// resetTracerProvider restores the global tracer provider after a test so that
// tests are isolated from each other.
func resetTracerProvider(t *testing.T) {
	t.Helper()
	prev := otel.GetTracerProvider()
	t.Cleanup(func() { otel.SetTracerProvider(prev) })
}

// ── constants ─────────────────────────────────────────────────────────────────

func TestConstants_ServiceName(t *testing.T) {
	if ServiceName != "iqra-go-engine" {
		t.Errorf("ServiceName = %q; want %q", ServiceName, "iqra-go-engine")
	}
}

func TestConstants_ServiceNamespace(t *testing.T) {
	if ServiceNamespace != "iqra" {
		t.Errorf("ServiceNamespace = %q; want %q", ServiceNamespace, "iqra")
	}
}

func TestConstants_DefaultServiceVer(t *testing.T) {
	if DefaultServiceVer != "0.3.69" {
		t.Errorf("DefaultServiceVer = %q; want %q", DefaultServiceVer, "0.3.69")
	}
}

func TestConstants_StackCodename(t *testing.T) {
	if StackCodename != "Echo369" {
		t.Errorf("StackCodename = %q; want %q", StackCodename, "Echo369")
	}
}

func TestConstants_StackSpec(t *testing.T) {
	if StackSpec != "AIX/1.0" {
		t.Errorf("StackSpec = %q; want %q", StackSpec, "AIX/1.0")
	}
}

func TestConstants_StackLayer(t *testing.T) {
	if StackLayer != "L2" {
		t.Errorf("StackLayer = %q; want %q", StackLayer, "L2")
	}
}

func TestConstants_StackAuthority(t *testing.T) {
	if StackAuthority != "axiomid.app" {
		t.Errorf("StackAuthority = %q; want %q", StackAuthority, "axiomid.app")
	}
}

func TestConstants_TracerInstrumentor(t *testing.T) {
	if TracerInstrumentor != "iqra/engine" {
		t.Errorf("TracerInstrumentor = %q; want %q", TracerInstrumentor, "iqra/engine")
	}
}

// ── isDisabled ────────────────────────────────────────────────────────────────

func TestIsDisabled_DefaultsToFalse(t *testing.T) {
	unsetenv(t, "OTEL_DISABLED")
	if isDisabled() {
		t.Error("isDisabled() must return false when OTEL_DISABLED is unset")
	}
}

func TestIsDisabled_TrueWhenSetToTrue(t *testing.T) {
	setenv(t, "OTEL_DISABLED", "true")
	if !isDisabled() {
		t.Error("isDisabled() must return true when OTEL_DISABLED=true")
	}
}

func TestIsDisabled_TrueWhenSetToOne(t *testing.T) {
	setenv(t, "OTEL_DISABLED", "1")
	if !isDisabled() {
		t.Error("isDisabled() must return true when OTEL_DISABLED=1")
	}
}

func TestIsDisabled_FalseForArbitraryValue(t *testing.T) {
	setenv(t, "OTEL_DISABLED", "yes")
	if isDisabled() {
		t.Error("isDisabled() must return false when OTEL_DISABLED is set to an unexpected value")
	}
}

func TestIsDisabled_FalseWhenSetToFalse(t *testing.T) {
	setenv(t, "OTEL_DISABLED", "false")
	if isDisabled() {
		t.Error("isDisabled() must return false when OTEL_DISABLED=false")
	}
}

// ── newExporter ───────────────────────────────────────────────────────────────

func TestNewExporter_ReturnsNilWhenNoEndpointSet(t *testing.T) {
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	unsetenv(t, "OTEL_STDOUT")

	exp, kind, err := newExporter(context.Background())
	if err != nil {
		t.Fatalf("newExporter() error = %v; want nil", err)
	}
	if exp != nil {
		t.Errorf("newExporter() exporter = %v; want nil (no endpoint configured)", exp)
	}
	if kind != "" {
		t.Errorf("newExporter() kind = %q; want empty string", kind)
	}
}

func TestNewExporter_StdoutKindWhenOTELStdoutTrue(t *testing.T) {
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	setenv(t, "OTEL_STDOUT", "true")

	exp, kind, err := newExporter(context.Background())
	if err != nil {
		t.Fatalf("newExporter() error = %v; want nil", err)
	}
	if exp == nil {
		t.Fatal("newExporter() returned nil exporter; want stdout exporter")
	}
	if kind != "stdout" {
		t.Errorf("newExporter() kind = %q; want %q", kind, "stdout")
	}
	exp.Shutdown(context.Background()) //nolint:errcheck
}

func TestNewExporter_StdoutKindWhenOTELStdoutOne(t *testing.T) {
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	setenv(t, "OTEL_STDOUT", "1")

	exp, kind, err := newExporter(context.Background())
	if err != nil {
		t.Fatalf("newExporter() error = %v; want nil", err)
	}
	if exp == nil {
		t.Fatal("newExporter() returned nil exporter for OTEL_STDOUT=1")
	}
	if kind != "stdout" {
		t.Errorf("newExporter() kind = %q; want %q", kind, "stdout")
	}
	exp.Shutdown(context.Background()) //nolint:errcheck
}

// ── newResource ───────────────────────────────────────────────────────────────

func TestNewResource_ReturnsNonNil(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	if res == nil {
		t.Fatal("newResource() returned nil resource")
	}
}

func TestNewResource_ContainsServiceNameAttribute(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "service.name" && kv.Value.AsString() == ServiceName {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() attributes do not contain service.name=%q; got %v", ServiceName, attrs)
	}
}

func TestNewResource_ContainsAIXStackCodename(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "aix.stack.codename" && kv.Value.AsString() == StackCodename {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() attributes do not contain aix.stack.codename=%q; got %v", StackCodename, attrs)
	}
}

func TestNewResource_ContainsAIXStackSpec(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "aix.stack.spec" && kv.Value.AsString() == StackSpec {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() attributes do not contain aix.stack.spec=%q; got %v", StackSpec, attrs)
	}
}

func TestNewResource_ContainsAIXLayer(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "aix.layer" && kv.Value.AsString() == StackLayer {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() attributes do not contain aix.layer=%q; got %v", StackLayer, attrs)
	}
}

func TestNewResource_ContainsAIXAuthority(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "aix.authority" && kv.Value.AsString() == StackAuthority {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() attributes do not contain aix.authority=%q; got %v", StackAuthority, attrs)
	}
}

func TestNewResource_UsesIQRAVersionEnvVar(t *testing.T) {
	setenv(t, "IQRA_VERSION", "9.9.9")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "service.version" && kv.Value.AsString() == "9.9.9" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() should use IQRA_VERSION=9.9.9 for service.version; got %v", attrs)
	}
}

func TestNewResource_FallsBackToDefaultVersionWhenEnvUnset(t *testing.T) {
	unsetenv(t, "IQRA_VERSION")
	res, err := newResource(context.Background())
	if err != nil {
		t.Fatalf("newResource() error = %v; want nil", err)
	}
	attrs := res.Attributes()
	found := false
	for _, kv := range attrs {
		if string(kv.Key) == "service.version" && kv.Value.AsString() == DefaultServiceVer {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("newResource() should fall back to DefaultServiceVer=%q; got %v", DefaultServiceVer, attrs)
	}
}

// ── Init ─────────────────────────────────────────────────────────────────────

func TestInit_DisabledReturnsNoopShutdown(t *testing.T) {
	resetTracerProvider(t)
	setenv(t, "OTEL_DISABLED", "true")
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	unsetenv(t, "OTEL_STDOUT")

	shutdown, err := Init(context.Background())
	if err != nil {
		t.Fatalf("Init() with OTEL_DISABLED=true returned error: %v", err)
	}
	if shutdown == nil {
		t.Fatal("Init() returned nil shutdown func; want a no-op func")
	}
	// noopShutdown must return nil.
	if shutErr := shutdown(context.Background()); shutErr != nil {
		t.Errorf("noop shutdown returned error: %v", shutErr)
	}
}

func TestInit_DisabledWithOneReturnsNoopShutdown(t *testing.T) {
	resetTracerProvider(t)
	setenv(t, "OTEL_DISABLED", "1")
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	unsetenv(t, "OTEL_STDOUT")

	shutdown, err := Init(context.Background())
	if err != nil {
		t.Fatalf("Init() with OTEL_DISABLED=1 returned error: %v", err)
	}
	if shutdown == nil {
		t.Fatal("Init() returned nil shutdown func")
	}
	if shutErr := shutdown(context.Background()); shutErr != nil {
		t.Errorf("noop shutdown returned error: %v", shutErr)
	}
}

func TestInit_NoExporterConfiguredReturnsNoopShutdown(t *testing.T) {
	resetTracerProvider(t)
	unsetenv(t, "OTEL_DISABLED")
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	unsetenv(t, "OTEL_STDOUT")

	shutdown, err := Init(context.Background())
	if err != nil {
		t.Fatalf("Init() with no endpoint returned error: %v", err)
	}
	if shutdown == nil {
		t.Fatal("Init() returned nil shutdown func")
	}
	if shutErr := shutdown(context.Background()); shutErr != nil {
		t.Errorf("noop shutdown returned error: %v", shutErr)
	}
}

func TestInit_StdoutExporterInstallsRealProvider(t *testing.T) {
	resetTracerProvider(t)
	unsetenv(t, "OTEL_DISABLED")
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	setenv(t, "OTEL_STDOUT", "true")

	shutdown, err := Init(context.Background())
	if err != nil {
		t.Fatalf("Init() with OTEL_STDOUT=true returned error: %v", err)
	}
	if shutdown == nil {
		t.Fatal("Init() returned nil shutdown func")
	}

	// The installed provider must not be the noop one.
	tp := otel.GetTracerProvider()
	if _, isNoop := tp.(noop.TracerProvider); isNoop {
		t.Error("Init() with OTEL_STDOUT=true must install a real TracerProvider, not a noop")
	}

	// Shut down cleanly.
	if shutErr := shutdown(context.Background()); shutErr != nil {
		t.Errorf("shutdown returned error: %v", shutErr)
	}
}

func TestInit_DisabledInstallsNoopProvider(t *testing.T) {
	resetTracerProvider(t)
	setenv(t, "OTEL_DISABLED", "true")
	unsetenv(t, "OTEL_EXPORTER_OTLP_ENDPOINT")
	unsetenv(t, "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
	unsetenv(t, "OTEL_STDOUT")

	_, _ = Init(context.Background())

	tp := otel.GetTracerProvider()
	if _, isNoop := tp.(noop.TracerProvider); !isNoop {
		t.Errorf("Init() with OTEL_DISABLED=true must install a noop TracerProvider; got %T", tp)
	}
}

// ── Tracer ────────────────────────────────────────────────────────────────────

func TestTracer_ReturnsNonNil(t *testing.T) {
	tr := Tracer()
	if tr == nil {
		t.Fatal("Tracer() must not return nil")
	}
}

func TestTracer_CanStartSpan(t *testing.T) {
	// Even with the noop provider a span must be obtainable without panic.
	tr := Tracer()
	ctx, span := tr.Start(context.Background(), "test-span")
	if ctx == nil {
		t.Error("Tracer().Start() returned nil context")
	}
	if span == nil {
		t.Error("Tracer().Start() returned nil span")
	}
	span.End()
}

// ── noopShutdown ─────────────────────────────────────────────────────────────

func TestNoopShutdown_ReturnsNilError(t *testing.T) {
	if err := noopShutdown(context.Background()); err != nil {
		t.Errorf("noopShutdown must return nil error; got %v", err)
	}
}

func TestNoopShutdown_AcceptsCancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := noopShutdown(ctx); err != nil {
		t.Errorf("noopShutdown must return nil even with a cancelled context; got %v", err)
	}
}