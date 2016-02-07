all: bin bin/index.html bin/main.js  bin/bundle.js

bin/index.html: index-dist.html
	cp $< $@

bin/main.js: src/main.tsx
	tsc

bin/bundle.js: bin/main.js
	jspm bundle-sfx bin/main bin/bundle.js --minify

bin:
	[ -f bin/.git ] || (echo "bin not setup. see readme" && exit 1)

gh-pages: all
	cd bin; git add -A; git commit -m'update binaries'; git push

.PHONY: gh-pages

