# Grpc Protobuf

## gRPC & Protobuf

### Buf toolchain

```yaml
# buf.yaml
version: v2
modules:
  - path: proto
lint:
  use: [DEFAULT]
breaking:
  use: [FILE]
```

```yaml
# buf.gen.yaml
version: v2
plugins:
  - remote: buf.build/protocolbuffers/go
    out: gen/go
    opt: paths=source_relative
  - remote: buf.build/grpc/go
    out: gen/go
    opt: paths=source_relative
```

```bash
buf lint
buf breaking --against '.git#branch=main'
buf generate
buf format -w
```

### gRPC Error Handling

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/genproto/googleapis/rpc/errdetails"
)

// Server: return status errors
func (s *Server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    user, err := s.store.Get(ctx, req.Id)
    if errors.Is(err, ErrNotFound) {
        return nil, status.Error(codes.NotFound, "user not found")
    }
    if err != nil {
        return nil, status.Error(codes.Internal, "internal error")
    }
    return &pb.GetUserResponse{User: user}, nil
}

// Rich errors with details
st := status.New(codes.InvalidArgument, "invalid request")
st, _ = st.WithDetails(&errdetails.BadRequest{
    FieldViolations: []*errdetails.BadRequest_FieldViolation{
        {Field: "email", Description: "must be valid email"},
    },
})
return nil, st.Err()

// Client: extract status
st, ok := status.FromError(err)
if ok && st.Code() == codes.NotFound { ... }
```

### Interceptor Chain

```go
// Sub-packages from github.com/grpc-ecosystem/go-grpc-middleware/v2
server := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        otelgrpc.UnaryServerInterceptor(),    // tracing
        logging.UnaryServerInterceptor(logger), // logging
        recovery.UnaryServerInterceptor(),      // panic → codes.Internal
        auth.UnaryServerInterceptor(authFn),    // authentication
    ),
)
```

### Health Check

```go
import "google.golang.org/grpc/health"
import healthpb "google.golang.org/grpc/health/grpc_health_v1"

healthServer := health.NewServer()
healthpb.RegisterHealthServer(grpcServer, healthServer)
healthServer.SetServingStatus("myservice", healthpb.HealthCheckResponse_SERVING)
```
