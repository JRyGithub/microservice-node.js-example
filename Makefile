SHELL := $(shell which bash)
.SHELLFLAGS = -c

.SILENT: ;               # no need for @
.ONESHELL: ;             # recipes execute in same shell
.NOTPARALLEL: ;          # wait for this target to finish
.EXPORT_ALL_VARIABLES: ; # send all vars to shell

default: help

help: ## display help for make commands
	grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help

all: ## run all developer tasks
	$(MAKE) deps
	$(MAKE) lint
	$(MAKE) test-cover
.PHONY: all

githooks: uninstall_githooks ## install local git hooks (for developers)
	# git config core.hooksPath .githooks
	find .githooks -maxdepth 1 -type f -exec ln -v -sf ../../{} .git/hooks/ \;
	chmod a+x .git/hooks/*
.PHONY: githooks

uninstall_githooks: ## uninstall local git hooks
		find .git/hooks -type l -exec rm -v {} \;
.PHONY: uninstall_githooks

### application commands

deps: _dbmigrate ## install dependencies
	yarn install
.PHONY: deps

_dbmigrate:
	if [ ! -f .shmig ]; then \
		curl -o shmig https://raw.githubusercontent.com/mbucc/shmig/master/shmig ; \
	fi ;\
	chmod +x shmig ;
.PHONY: _dbmigrate

init: ## initialize database
	if [ -f .env ]; then \
		export $$(cat .env | grep -v ^\# | xargs) >> /dev/null ; \
	else \
		echo ".env file not read" ; \
	fi ; \
	./shmig -t mysql -l $$DB_USER -p $$DB_PASS -d $$DB_DATABASE -H $${DB_HOST:-localhost} -P $${DB_PORT:-3306} -m migrations/prod -s migrations up \
	&& echo "migrations: ok"
.PHONY: init

init-test: ## initialize test database
	if [ -f .env.test ]; then \
		export $$(cat .env.test | grep -v ^\# | xargs) >> /dev/null ; \
	else \
		echo ".env.test file not read" ; \
	fi ; \
	./shmig -t mysql -l $$DB_USER -p $$DB_PASS -d $$DB_DATABASE -H $${DB_HOST:-localhost} -P $${DB_PORT:-3306} -m migrations/test -s migrations up \
	&& echo "migrations: ok"
.PHONY: init-test

test: init-test ## run unit tests
	./node_modules/.bin/mocha --exit -r ./tests/init.js ./tests/hooks "src/**/*.spec.js"
.PHONY: test

test-watch: init-test ## run unit tests and watch modified files
	./node_modules/.bin/mocha -w -r ./tests/init.js ./tests/hooks "src/**/*.spec.js"
.PHONY: test-watch

test-cover: init-test ## run unit tests with code coverage
	node ./node_modules/.bin/istanbul cover -x "src/**/*.spec.js" ./node_modules/.bin/_mocha -- --exit -r ./tests/init.js ./tests/hooks "src/**/*.spec.js"
.PHONY: test-cover

run: init ## run application
	node src/
.PHONY: run

run-watch: init ## run application and watch modified files
	nodemon --ext js src/
.PHONY: run-watch

lint: ## check syntax
	./node_modules/.bin/eslint src
.PHONY: lint

lint-watch: ## check syntax and watch modified files
	nodemon --exec './node_modules/.bin/eslint src'
.PHONY: lint-watch

lint-docker: ## check Dockerfile syntax
	docker run --rm  -w /src -v "$$PWD:/src" hadolint/hadolint:latest hadolint Dockerfile
.PHONY: lint-docker
