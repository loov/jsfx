CFLAGS=-ggdb
CXXFLAGS=$(CFLAGS) `sdl-config --cflags` `pkg-config gtk+-2.0 --cflags`
LDFLAGS=`sdl-config --libs` `pkg-config gtk+-2.0 --libs`

sfxr: main.cpp tools.h sdlkit.h
	$(CXX) $(CXXFLAGS) $(LDFLAGS) $< -o $@

install: sfxr
	mkdir -p $(DESTDIR)/usr/bin
	mkdir -p $(DESTDIR)/usr/share/sfxr
	mkdir -p $(DESTDIR)/usr/share/applications
	mkdir -p $(DESTDIR)/usr/share/icons/hicolor/48x48/apps
	install -m 755 sfxr $(DESTDIR)/usr/bin
	install -m 644 -p *.tga *.bmp $(DESTDIR)/usr/share/sfxr
	install -p -m 644 sfxr.png \
		$(DESTDIR)/usr/share/icons/hicolor/48x48/apps
	desktop-file-install --vendor "" \
		--dir $(DESTDIR)/usr/share/applications sfxr.desktop

clean:
	rm sfxr
