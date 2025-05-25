# Build stage
FROM golang:1-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY *.go ./

# Build the application
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -o main .

# Final stage
FROM scratch

# Create /data directory and set it as a volume
VOLUME ["/data"]

# Set working directory
WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

# Set environment variable with default
ENV PORT=8080

# Expose the port
EXPOSE ${PORT}

# Run the application
CMD ["./main"] 