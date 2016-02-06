all: bin bin/index.html bin/libs.css bin/program.js bin/libs.js

bin/%: src/%
	cp $< $@

bin/program.js:
	tsc

bin:
	[ -f bin/.git ] || (echo "bin not setup. see readme" && exit 1)

gh-pages: bin
	cd bin; git add -A; git commit -m'update binaries'; git push

.PHONY: gh-pages

