.PHONY: build podman-build run podman-run

VERSION := $(shell node -p "require('./package.json').version")
GIT_SHA := $(shell git rev-parse --short HEAD)
IMAGE_NAME := hardfork-upgrade-tracking
IMAGE_TAG := $(VERSION)-$(GIT_SHA)

build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "Built: $(IMAGE_NAME):$(IMAGE_TAG)"

podman-build:
	podman build --platform linux/amd64 -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "Built: $(IMAGE_NAME):$(IMAGE_TAG)"

run:
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "Error: DATABASE_URL environment variable is required"; \
		exit 1; \
	fi
	docker run --rm -it \
		-p 3000:3000 \
		-e DATABASE_URL="$(DATABASE_URL)" \
		-e RELEASE_PERCENTAGE="$(RELEASE_PERCENTAGE)" \
		$(IMAGE_NAME):$(IMAGE_TAG)

podman-run:
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "Error: DATABASE_URL environment variable is required"; \
		exit 1; \
	fi
	podman run --rm -it \
		-p 3000:3000 \
		-e DATABASE_URL="$(DATABASE_URL)" \
		-e RELEASE_PERCENTAGE="$(RELEASE_PERCENTAGE)" \
		$(IMAGE_NAME):$(IMAGE_TAG)
