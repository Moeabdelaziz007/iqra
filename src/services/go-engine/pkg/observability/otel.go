// Package observability provides OpenTelemetry tracing bootstrap for the IQRA
// Go engine. It instruments the HTTP handlers exposed by main.go plus the
// heavy compute paths (resonance, LID, Shannon, homology, batch, compression)
// so that the TS<->Go bridge latency and the DAMIR throughput become
// measurable from day one of Phase 5a.
//
// Default behaviour is opt-in: if no OTEL endpoint is configured the package
// installs a NoOp tracer and produces zero traces, zero log spam, and zero
// overhead. Opt in by setting OTEL_EXPORTER_OTLP_ENDPOINT to point at a
// collector, or set OTEL_STDOUT=true to dump spans to stdout for local
// debugging. Set OTEL_DISABLED=true to force everything off even if other
// variables are present.
//
// AIX Stack identity attributes ride on every span:
//
//	service.name        = iqra-go-engine
//	service.namespace   = iqra
//	service.version     = $IQRA_VERSION or 0.3.69 (the L2 SemVer anchor)
//	aix.stack.codename  = Echo369
//	aix.stack.spec      = AIX/1.0
//	aix.layer           = L2
//	aix.authority       = axiomid.app
package observability

import (
	"context"
	"fmt"
	"log"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
	"go.opentelemetry.io/otel/trace/noop"
)

// AIX Stack identity constants. These mirror the canonical values declared
// in iqra/package.json#aix and aix-format/AXIOM.md §6. Keep in sync.
const (
	ServiceName        = "iqra-go-engine"
	ServiceNamespace   = "iqra"
	DefaultServiceVer  = "0.3.69"
	StackCodename      = "Echo369"
	StackSpec          = "AIX/1.0"
	StackLayer         = "L2"
	StackAuthority     = "axiomid.app"
	TracerInstrumentor = "iqra/engine"
)

// ShutdownFunc flushes pending spans and tears down the tracer provider.
// Always call it via `defer` from main, ideally with a short timeout context
// so a slow collector does not block process exit.
type ShutdownFunc func(context.Context) error

// noopShutdown is returned when tracing is disabled or unconfigured. It
// keeps the main.go call site uniform regardless of OTEL state.
var noopShutdown ShutdownFunc = func(context.Context) error { return nil }

// Init wires up the OpenTelemetry SDK and returns a shutdown handle. It is
// safe to call exactly once at process start. If OTEL is disabled or no
// endpoint is configured the function installs a NoOp tracer provider and
// returns a no-op shutdown so callers do not need branching logic.
func Init(ctx context.Context) (ShutdownFunc, error) {
	if isDisabled() {
		otel.SetTracerProvider(noop.NewTracerProvider())
		log.Println("[otel] tracing disabled (OTEL_DISABLED=true)")
		return noopShutdown, nil
	}

	exporter, exporterKind, err := newExporter(ctx)
	if err != nil {
		// Tracing is best-effort observability, never a startup blocker.
		// Fall back to NoOp on exporter init failure and surface the error
		// in logs so operators can fix the collector without breaking the
		// engine.
		log.Printf("[otel] exporter init failed, falling back to noop: %v", err)
		otel.SetTracerProvider(noop.NewTracerProvider())
		return noopShutdown, nil
	}

	if exporter == nil {
		// No endpoint and no stdout requested: silent NoOp.
		otel.SetTracerProvider(noop.NewTracerProvider())
		log.Println("[otel] no exporter configured (set OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_STDOUT=true), using noop")
		return noopShutdown, nil
	}

	res, err := newResource(ctx)
	if err != nil {
		return nil, fmt.Errorf("observability: build resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	log.Printf("[otel] tracer provider ready (exporter=%s, service=%s, codename=%s, layer=%s)",
		exporterKind, ServiceName, StackCodename, StackLayer)
	return tp.Shutdown, nil
}

// Tracer returns a tracer scoped to the IQRA engine instrumentation name.
// Use it from handlers and compute paths to open manual spans:
//
//	ctx, span := observability.Tracer().Start(ctx, "CalculateResonance")
//	defer span.End()
func Tracer() trace.Tracer {
	return otel.Tracer(TracerInstrumentor)
}

// isDisabled returns true when the operator has explicitly turned tracing off.
func isDisabled() bool {
	return os.Getenv("OTEL_DISABLED") == "true" || os.Getenv("OTEL_DISABLED") == "1"
}

// newResource builds the resource attribute set attached to every span emitted
// by this process. Operators can override any attribute via OTEL_RESOURCE_ATTRIBUTES
// thanks to resource.WithFromEnv().
func newResource(ctx context.Context) (*resource.Resource, error) {
	version := os.Getenv("IQRA_VERSION")
	if version == "" {
		version = DefaultServiceVer
	}
	return resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(ServiceName),
			semconv.ServiceNamespace(ServiceNamespace),
			semconv.ServiceVersion(version),
			attribute.String("aix.stack.codename", StackCodename),
			attribute.String("aix.stack.spec", StackSpec),
			attribute.String("aix.layer", StackLayer),
			attribute.String("aix.authority", StackAuthority),
		),
		resource.WithHost(),
		resource.WithProcess(),
		resource.WithProcessRuntimeVersion(),
		resource.WithFromEnv(),
	)
}

// newExporter selects an exporter implementation based on env. Returns
// (exporter, kindLabel, err). If both OTEL_EXPORTER_OTLP_ENDPOINT and
// OTEL_STDOUT are unset the function returns (nil, "", nil) signalling
// silent NoOp mode.
func newExporter(ctx context.Context) (sdktrace.SpanExporter, string, error) {
	if os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT") != "" || os.Getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT") != "" {
		exp, err := otlptracehttp.New(ctx)
		if err != nil {
			return nil, "", fmt.Errorf("otlp http: %w", err)
		}
		return exp, "otlp-http", nil
	}
	if os.Getenv("OTEL_STDOUT") == "true" || os.Getenv("OTEL_STDOUT") == "1" {
		exp, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
		if err != nil {
			return nil, "", fmt.Errorf("stdout: %w", err)
		}
		return exp, "stdout", nil
	}
	return nil, "", nil
}
