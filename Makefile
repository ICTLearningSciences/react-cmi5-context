clean:
	rm -rf node_modules static .cache public

develop:
	npx gatsby develop

node_modules/cypress:
	$(MAKE) install

node_modules/eslint:
	$(MAKE) install

node_modules/gatsby-cli:
	$(MAKE) install

node_modules/license-check-and-add:
	$(MAKE) install

node_modules/prettier:
	$(MAKE) install

node_modules/typescript:
	$(MAKE) install

.PHONY: format
format: node_modules/prettier
	npm run format

PHONY: install
install:
	npm ci 

PHONY: test-all
test-all:
	$(MAKE) test-audit
	$(MAKE) test-format
	$(MAKE) test-license
	$(MAKE) test-lint
	$(MAKE) test-types

LICENSE:
	@echo "you must have a LICENSE file" 1>&2
	exit 1

LICENSE_HEADER:
	@echo "you must have a LICENSE_HEADER file" 1>&2
	exit 1

.PHONY: test-audit
test-audit:
	npm run test:audit

.PHONY: test-format
test-format: node_modules/prettier
	npm run test:format

.PHONY: license
license: LICENSE LICENSE_HEADER
	npm run license:fix

.PHONY: test-license
test-license: LICENSE LICENSE_HEADER
	npm run test:license

.PHONY: test-format
test-lint: node_modules/eslint
	npm run test:lint

.PHONY: test-types
test-types: node_modules/typescript
	npm run test:types

.PHONY: test-cypress
test-cypress: node_modules/cypress
	npm run test:cypress
