SHELL:=/bin/bash
DOCKER_ACCOUNT?=uscictdocker
DOCKER_IMAGE?=uscictdocker/react-cmi5-context

clean:
	rm -rf node_modules dist *.tgz

build:
	npm ci && npm run build
	

format: node_modules/prettier
	npm run format

LICENSE:
	@echo "you must have a LICENSE file" 1>&2
	exit 1

.PHONY: license
license: LICENSE node_modules/license-check-and-add
	npm run license:fix
	
node_modules/license-check-and-add:
	npm ci

node_modules/eslint:
	npm ci

node_modules/gatsby-cli:
	npm ci

node_modules/jest:
	npm ci

node_modules/prettier:
	npm ci

node_modules/typescript:
	npm ci

.PHONY: test
test: node_modules/jest
	npm run test

PHONY: test-all
test-all:
	$(MAKE) test-audit
	$(MAKE) test-format
	$(MAKE) test-lint
	$(MAKE) test-types
	$(MAKE) test

.PHONY: test-audit
test-audit:
	npm run test:audit

.PHONY: test-format
test-format: node_modules/prettier
	npm run test:format

.PHONY: test-format
test-lint: node_modules/eslint
	npm run test:lint

.PHONY: test-types
test-types: node_modules/typescript
	npm run test:types


.PHONY: test-license
test-license: LICENSE node_modules/license-check-and-add
	npm run test:license
