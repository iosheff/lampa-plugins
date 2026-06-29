(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // Константы
    // ─────────────────────────────────────────────────────────────
    var SOURCE_NAME  = 'filmix';
    var SOURCE_TITLE = 'Filmix';
    var API_URL      = 'http://filmixapp.cyou/api/v2/';

    // Раздел настроек в Lampa (имя «Filmix» уже занято сторонним плагином)
    var PLUGIN_TITLE      = 'MediaSources';
    var SETTINGS_COMPONENT = 'mediasources';
    var SETTINGS_ICON =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M4 9h16M9 5v14M15 5v14" stroke="currentColor" stroke-width="1.6"/></svg>';

    // Зафиксированный device_id для одного устройства
    var DEVICE_ID = (function () {
        var id = Lampa.Storage.field('filmix_device_id');
        // защита от старого бага, когда сохранялась строка "undefined"/пусто
        if (!id || id === 'undefined' || id === 'null') {
            id = Lampa.Utils.uid(16);
            Lampa.Storage.set('filmix_device_id', id);
        }
        return id;
    }());

    var _activeControllers = [];

    // ─────────────────────────────────────────────────────────────
    // Аутентификация
    // ─────────────────────────────────────────────────────────────
    function token() {
        return Lampa.Storage.field('filmix_token') || '';
    }

    function authParams() {
        return 'app_lang=ru_RU' +
            '&user_dev_apk=2.1.2' +
            '&user_dev_id='     + DEVICE_ID +
            '&user_dev_name=Xiaomi' +
            '&user_dev_os=11' +
            '&user_dev_vendor=Xiaomi' +
            '&user_dev_token='  + token();
    }

    // ─────────────────────────────────────────────────────────────
    // Сетевой слой (нативный fetch — Lampa.Reguest нестабилен на части сборок)
    // ─────────────────────────────────────────────────────────────
    function get(url, onSuccess, onError) {
        var controller = new AbortController();
        _activeControllers.push(controller);
        function cleanup() {
            var idx = _activeControllers.indexOf(controller);
            if (idx !== -1) _activeControllers.splice(idx, 1);
        }
        fetch(url, { signal: controller.signal })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(
                // onFulfilled: исключения из onSuccess НЕ должны попадать в onError,
                // поэтому используем второй аргумент then(), а не .catch()
                function (data) { cleanup(); onSuccess(data); },
                function (e)    { cleanup(); if (e.name !== 'AbortError') (onError || function () {})(e); }
            );
    }

    function clearRequests() {
        _activeControllers.forEach(function (c) { try { c.abort(); } catch (e) {} });
        _activeControllers = [];
    }

    function catalogUrl(params) {
        var url = API_URL + 'catalog?' + authParams();
        if (params.cat)  url += '&filter='  + params.cat;   // фильтр секции: s0/s7/s14/s93
        if (params.sort) url += '&orderby=' + params.sort;  // date | rating | year | kp_rating
        if (params.page) url += '&page='    + params.page;
        return url;
    }

    function searchUrl(query) {
        // параметр поиска — story= (s= молча возвращает []); требует токен
        return API_URL + 'search?' + authParams() + '&story=' + encodeURIComponent(query);
    }

    function postUrl(id)   { return API_URL + 'post/'   + id + '?' + authParams(); }
    function personUrl(id) { return API_URL + 'person/' + id + '?' + authParams(); }
    function tokenRequestUrl() { return API_URL + 'token_request?' + authParams(); }
    // Проверка авторизации устройства: user_profile с кандидатом-токеном (code).
    // Пока устройство не подтверждено на сайте — отдаёт {}. После — {user_data:{...}}.
    function userProfileUrl(candidateToken) {
        return API_URL + 'user_profile?app_lang=ru_RU' +
            '&user_dev_apk=2.1.2' +
            '&user_dev_id='   + DEVICE_ID +
            '&user_dev_name=Xiaomi' +
            '&user_dev_os=11' +
            '&user_dev_vendor=Xiaomi' +
            '&user_dev_token=' + candidateToken;
    }

    // ─────────────────────────────────────────────────────────────
    // TMDB-обогащение карточек (Вариант A)
    // Каталог остаётся Filmix, но полная карточка дополняется данными
    // TMDB: постер/фон/описание/рейтинг + imdb_id (нужен online_mod для
    // сопоставления и запуска плеера). Запросы идут через прокси Lampa,
    // при сбое — напрямую на api.themoviedb.org.
    // ─────────────────────────────────────────────────────────────
    function tmdbEnabled() {
        // по умолчанию включено
        var v = Lampa.Storage.field('filmix_tmdb_cards');
        return v === undefined ? true : !!v;
    }

    // Режим редиректа: при клике открывать родную карточку TMDB (по умолч. вкл)
    function tmdbRedirect() {
        var v = Lampa.Storage.field('filmix_tmdb_redirect');
        return v === undefined ? true : !!v;
    }

    function tmdbKey() {
        try { return (Lampa.TMDB && Lampa.TMDB.key) ? Lampa.TMDB.key() : ''; }
        catch (e) { return ''; }
    }

    // Запрос к TMDB: сначала прокси Lampa, при ошибке ИЛИ невалидном ответе —
    // прямой api.themoviedb.org. valid(data) — необязательная проверка, что
    // ответ содержит нужные данные (прокси иногда режет append_to_response).
    function tmdbGet(path, onok, onerr, valid) {
        var done = false;
        function good(d) { return !valid || valid(d); }
        function ok(d)   { if (!done) { done = true; onok(d); } }
        function fail()  { if (!done) { done = true; (onerr || function () {})(); } }

        function tryDirect() {
            var net2 = new Lampa.Reguest();
            net2.silent('https://api.themoviedb.org/3/' + path,
                function (d) { if (good(d)) ok(d); else fail(); },
                fail);
        }

        var net1 = new Lampa.Reguest();
        net1.silent(Lampa.TMDB.api(path),
            function (d) { if (good(d)) ok(d); else tryDirect(); },
            tryDirect);
    }

    // Выбор лучшего совпадения: точное original-название → совпадение года → первый
    function pickTmdbMatch(results, title, year, serial) {
        if (!results || !results.length) return null;
        var t = (title || '').toLowerCase().trim();

        function origOf(r) {
            return ((serial ? r.original_name : r.original_title) || r.original_name || r.original_title || '').toLowerCase().trim();
        }
        function yearOf(r) {
            return ((serial ? r.first_air_date : r.release_date) || '').slice(0, 4);
        }

        var exact = results.filter(function (r) { return origOf(r) === t; });
        var pool  = exact.length ? exact : results;

        if (year) {
            var byYear = pool.filter(function (r) { return yearOf(r) === String(year); });
            if (byYear.length) return byYear[0];
        }
        return pool[0];
    }

    function applyTmdb(movie, det, serial) {
        if (!det) return;
        movie.tmdb_id = det.id;
        if (det.poster_path)   movie.poster_path   = det.poster_path;   // TMDB-постер
        if (det.backdrop_path) movie.backdrop_path = det.backdrop_path;
        if (det.overview)      movie.overview      = det.overview;
        if (det.vote_average)  movie.vote_average  = det.vote_average;
        if (det.vote_count)    movie.vote_count    = det.vote_count;
        if (det.genres && det.genres.length) {
            movie.genres = det.genres.map(function (g) { return { id: g.id, name: g.name }; });
        }
        var imdb = (det.external_ids && det.external_ids.imdb_id) || det.imdb_id || '';
        if (imdb) movie.imdb_id = imdb;
    }

    // TMDB-результат → Lampa card (source:'tmdb', откроется как карточка TMDB)
    function tmdbCard(r) {
        if (!r) return null;
        var tv = !!(r.name || r.original_name || r.first_air_date) && !(r.title || r.release_date);
        var card = {
            id:            r.id,
            source:        'tmdb',
            poster_path:   r.poster_path   || '',
            backdrop_path: r.backdrop_path || '',
            vote_average:  r.vote_average  || 0,
            overview:      r.overview      || '',
        };
        if (r.media_type) card.media_type = r.media_type;
        if (tv) {
            card.name           = r.name          || r.original_name || '';
            card.original_name  = r.original_name || '';
            card.title          = r.name          || r.original_name || '';
            card.first_air_date = r.first_air_date || '';
        } else {
            card.title          = r.title          || r.original_title || '';
            card.original_title = r.original_title || '';
            card.release_date   = r.release_date   || '';
        }
        return card;
    }

    // TMDB credits → {cast, crew} с фотографиями (profile_path)
    function tmdbPersons(det, serial) {
        var credits = (det && det.credits) || {};
        var cast = (credits.cast || []).map(function (c) {
            return { id: c.id, name: c.name, character: c.character || '', profile_path: c.profile_path || '', url: '' };
        });
        var crew = (credits.crew || []).map(function (c) {
            return { id: c.id, name: c.name, job: c.job || '', profile_path: c.profile_path || '', url: '' };
        });
        // у сериалов режиссёров часто нет в crew — берём создателей
        if (serial && det && det.created_by) {
            det.created_by.forEach(function (p) {
                crew.unshift({ id: p.id, name: p.name, job: 'Creator', profile_path: p.profile_path || '', url: '' });
            });
        }
        return { cast: cast, crew: crew };
    }

    // Обогащает movie и отдаёт полный TMDB-объект (или null) в done(detail)
    function tmdbEnrichFull(movie, serial, done) {
        if (!tmdbEnabled()) { done(null); return; }
        var key = tmdbKey();
        if (!key || !Lampa.TMDB || !Lampa.TMDB.api) { done(null); return; }

        var title = serial ? (movie.original_name || movie.name) : (movie.original_title || movie.title);
        var dateF = serial ? movie.first_air_date : movie.release_date;
        var year  = (dateF || '').slice(0, 4);
        var type  = serial ? 'tv' : 'movie';
        var yparam = serial ? 'first_air_date_year' : 'primary_release_year';

        if (!title) { done(null); return; }

        var base   = 'search/' + type + '?api_key=' + key + '&language=ru&query=' + encodeURIComponent(title);
        var append = 'credits,recommendations,similar,external_ids,videos';

        function fetchDetail(match) {
            tmdbGet(type + '/' + match.id + '?api_key=' + key + '&language=ru&append_to_response=' + append,
                function (det) { applyTmdb(movie, det, serial); done(det); },
                function ()    { applyTmdb(movie, match, serial); done(null); },
                function (d)   { return d && d.credits; }   // ответ должен содержать append-секции
            );
        }

        // 1) поиск с фильтром по году; 2) если не нашли — повтор без года
        tmdbGet(base + (year ? ('&' + yparam + '=' + year) : ''), function (data) {
            var match = pickTmdbMatch(data && data.results, title, year, serial);
            if (match) { fetchDetail(match); return; }
            if (!year) { done(null); return; }
            tmdbGet(base, function (data2) {
                var m2 = pickTmdbMatch(data2 && data2.results, title, year, serial);
                if (m2) fetchDetail(m2); else done(null);
            }, function () { done(null); });
        }, function () { done(null); });
    }

    // Лёгкий поиск TMDB id по названию+году (для режима редиректа).
    // done(id|null). serial → ищем в tv, иначе в movie.
    function tmdbFindId(title, year, serial, done) {
        if (!tmdbEnabled()) { done(null); return; }
        var key = tmdbKey();
        if (!title || !key || !Lampa.TMDB || !Lampa.TMDB.api) { done(null); return; }

        var type   = serial ? 'tv' : 'movie';
        var yparam = serial ? 'first_air_date_year' : 'primary_release_year';
        var base   = 'search/' + type + '?api_key=' + key + '&language=ru&query=' + encodeURIComponent(title);

        function pick(data) {
            var m = pickTmdbMatch(data && data.results, title, year, serial);
            return m ? m.id : null;
        }
        tmdbGet(base + (year ? ('&' + yparam + '=' + year) : ''), function (data) {
            var id = pick(data);
            if (id) { done(id); return; }
            if (!year) { done(null); return; }
            tmdbGet(base, function (d2) { done(pick(d2)); }, function () { done(null); },
                function (d) { return d && d.results; });
        }, function () { done(null); }, function (d) { return d && d.results; });
    }

    // ─────────────────────────────────────────────────────────────
    // Нормализация карточки: Filmix API → Lampa card
    // ─────────────────────────────────────────────────────────────

    // Секции API: 0=фильм, 7=сериал, 14=мульт/мультсериал, 93=аниме
    function isSerial(section) {
        return section === 7 || section === 93 || section === 14;
    }

    // Заменяет w140/w220 → w400 в URL постера (крупнее)
    function posterLarge(url) {
        if (!url) return '';
        return url.replace('/w140/', '/w400/').replace('/w220/', '/w400/');
    }

    // Filmix отдаёт полные URL постеров. Lampa.Api.img всегда подставляет
    // TMDB-базу, поэтому НЕ задаём poster_path, а кладём полный URL в poster/img.
    function convertCard(item) {
        if (!item) return null;

        var serial  = isSerial(item.section);
        var year    = item.year ? String(item.year) : '';
        var poster  = posterLarge(item.poster);
        var genres  = (item.categories || []).map(function (name) { return { name: name }; });
        var rating  = parseFloat(item.kp_rating) || parseFloat(item.imdb_rating) || 0;

        var card = {
            id:        item.id,
            filmix_id: item.id,
            alt_name:  item.alt_name || '',
            source:    SOURCE_NAME,          // критично: иначе клик уйдёт в tmdb

            overview:  item.short_story || '',
            genres:    genres,
            vote_average: rating,
            vote_count:   parseInt(item.kp_votes, 10) || 0,
            kp_rating:    parseFloat(item.kp_rating)   || 0,
            imdb_rating:  parseFloat(item.imdb_rating) || 0,
            quality:      item.quality || item.rip || '',

            // постер: полный URL — кладём в poster/img (не в poster_path)
            poster: poster,
            img:    poster,

            production_countries: (item.countries || []).map(function (c) { return { name: c }; }),
            production_companies: [],   // Lampa читает .length без проверки
        };

        // method вычисляется Lampa как original_name ? 'tv' : 'movie'
        if (serial) {
            card.name           = item.title          || item.original_title || '';
            card.original_name  = item.original_title || item.title          || '';
            // title тоже задаём: рендер полной карточки читает card.title.length
            // без проверки (на tv/movie это не влияет — оно по original_name)
            card.title          = item.title          || item.original_title || '';
            card.first_air_date = year ? year + '-01-01' : '';
            card.number_of_seasons = 1;
        } else {
            card.title          = item.title          || item.original_title || '';
            card.original_title = item.original_title || item.title          || '';
            card.release_date   = year ? year + '-01-01' : '';
        }

        return card;
    }

    // ─────────────────────────────────────────────────────────────
    // player_links.playlist → структуры сезонов/эпизодов Lampa
    // ─────────────────────────────────────────────────────────────

    // Возвращает { episodes:[...], seasons_count } для запрошенного сезона.
    // playlist: { season: { translation: { ep: {link, qualities} } } }
    function buildSeasonEpisodes(playlist, seasonNum, card) {
        var translations = playlist[seasonNum] || {};
        var transNames   = Object.keys(translations);
        var episodesMap  = {};   // epNum → { translationName: link }

        transNames.forEach(function (trans) {
            var eps = translations[trans] || {};
            Object.keys(eps).forEach(function (epNum) {
                var ep = eps[epNum];
                if (!episodesMap[epNum]) episodesMap[epNum] = {};
                episodesMap[epNum][trans] = (ep && ep.link) ? ep.link : ep;
            });
        });

        var episodes = Object.keys(episodesMap)
            .sort(function (a, b) { return +a - +b; })
            .map(function (epNum) {
                return {
                    id:             card.id + '_' + seasonNum + '_' + epNum,
                    season_number:  +seasonNum,
                    episode_number: +epNum,
                    name:           'Серия ' + epNum,
                    overview:       '',
                    air_date:       '',
                    still_path:     '',
                    // нестандартные поля для собственного плеера / отладки
                    filmix_urls:    episodesMap[epNum],
                    translations:   transNames,
                };
            });

        return {
            episodes:      episodes,
            seasons_count: Object.keys(playlist).length,
        };
    }

    function countSeasons(playlist) {
        return Object.keys(playlist || {}).length;
    }

    // ─────────────────────────────────────────────────────────────
    // Разбор параметров категории
    // cat может прийти как: params.genres ('s0'), либо в URL ?cat=s0
    // ─────────────────────────────────────────────────────────────
    // url='tv'/'movie' (страницы темы) → секция Filmix
    function urlToCat(url) {
        if (url === 'tv')    return 's7';
        if (url === 'movie') return 's0';
        return null;
    }

    function parseCat(params) {
        var cat  = 's0';
        var sort = 'date';

        if (params.genres) cat = String(params.genres);
        if (params.sort)   sort = params.sort;

        var url = params.url || '';

        // прямой маппинг страниц темы (url=tv / url=movie)
        var mapped = urlToCat(url);
        if (mapped) cat = mapped;

        var catM  = url.match(/[?&](?:cat|filter)=([^&]+)/);
        var sortM = url.match(/[?&]sort=([^&]+)/);
        if (catM)  cat  = catM[1];
        if (sortM) sort = sortM[1];

        // нормализуем: допускаем 's0' или '0'
        if (/^\d+$/.test(cat)) cat = 's' + cat;

        return { cat: cat, sort: sort };
    }

    function catTitle(cat) {
        return ({
            s0:  'Фильмы',
            s7:  'Сериалы',
            s14: 'Мультфильмы',
            s93: 'Аниме',
        })[cat] || 'Каталог';
    }

    // ─────────────────────────────────────────────────────────────
    // Объект источника
    // Контракт Lampa: методы получают (params, oncomplite, onerror)
    // ─────────────────────────────────────────────────────────────
    var Source = {
        SOURCE_NAME:  SOURCE_NAME,
        SOURCE_TITLE: SOURCE_TITLE,

        // ── Главный экран: массив рядов [{title, results:[...]}] ──
        main: function (params, oncomplite, onerror) {
            var rows = [
                { title: 'Новые фильмы',  cat: 's0',  sort: 'date',   genres: 's0'  },
                { title: 'Новые сериалы', cat: 's7',  sort: 'date',   genres: 's7'  },
                { title: 'Топ фильмы',    cat: 's0',  sort: 'rating', genres: 's0'  },
                { title: 'Топ сериалы',   cat: 's7',  sort: 'rating', genres: 's7'  },
                { title: 'Мультфильмы',   cat: 's14', sort: 'date',   genres: 's14' },
                { title: 'Аниме',         cat: 's93', sort: 'date',   genres: 's93' },
            ];

            var results = new Array(rows.length);
            var done = 0;

            function finish() {
                var data = results.filter(function (r) { return r && r.results && r.results.length; });
                if (data.length) oncomplite(data);
                else (onerror || function () {})();
            }

            rows.forEach(function (row, i) {
                get(catalogUrl({ cat: row.cat, sort: row.sort, page: 1 }),
                    function (data) {
                        if (Array.isArray(data) && data.length) {
                            results[i] = {
                                title:   row.title,
                                genres:  row.genres,   // для onMore → category
                                results: data.map(convertCard).filter(Boolean),
                            };
                        }
                        if (++done === rows.length) finish();
                    },
                    function () {
                        if (++done === rows.length) finish();
                    }
                );
            });

            // пагинации на главной нет
            return false;
        },

        // ── Меню каталога: [{title, id}] ──
        menu: function (params, oncomplite) {
            oncomplite([
                { title: 'Фильмы',      id: 's0'  },
                { title: 'Сериалы',     id: 's7'  },
                { title: 'Мультфильмы', id: 's14' },
                { title: 'Аниме',       id: 's93' },
            ]);
        },

        // ── Категория (category): две ленты — Последние и Топ + next() ──
        category: function (params, oncomplite, onerror) {
            var parsed = parseCat(params);
            var cat    = parsed.cat;
            var name   = catTitle(cat);

            var lanes = [
                { title: 'Последние ' + name.toLowerCase(), sort: 'date'   },
                { title: 'Топ ' + name.toLowerCase(),       sort: 'rating' },
            ];

            // Первая загрузка: обе ленты параллельно
            var rows = new Array(lanes.length);
            var done = 0;
            lanes.forEach(function (lane, i) {
                get(catalogUrl({ cat: cat, sort: lane.sort, page: 1 }),
                    function (data) {
                        if (Array.isArray(data) && data.length) {
                            rows[i] = {
                                title:   lane.title,
                                results: data.map(convertCard).filter(Boolean),
                            };
                        }
                        if (++done === lanes.length) finish();
                    },
                    function () { if (++done === lanes.length) finish(); }
                );
            });

            function finish() {
                var out = rows.filter(function (r) { return r && r.results && r.results.length; });
                if (out.length) oncomplite(out);
                else (onerror || function () {})();
            }

            // Две фиксированные ленты — без пагинации (иначе появляются ряды «стр. N»)
            return false;
        },

        // ── Список с пагинацией (component list): {results, total_pages} ──
        list: function (params, oncomplite, onerror) {
            var parsed = parseCat(params);
            var page   = params.page || 1;

            get(catalogUrl({ cat: parsed.cat, sort: parsed.sort, page: page }),
                function (data) {
                    if (!Array.isArray(data) || !data.length) {
                        (onerror || function () {})();
                        return;
                    }
                    oncomplite({
                        results:     data.map(convertCard).filter(Boolean),
                        total_pages: 999,   // API не сообщает число страниц
                        page:        page,
                    });
                },
                onerror || function () {}
            );
        },

        // ── Полная карточка: {movie, persons, simular, episodes, videos} ──
        full: function (params, oncomplite, onerror) {
            var id = params.id || (params.card && (params.card.filmix_id || params.card.id));
            if (!id) { (onerror || function () {})(); return; }

            // Дополняет result данными TMDB (актёры/похожее/рекомендации/видео) и отдаёт его
            function emit(result, movie, serial) {
                tmdbEnrichFull(movie, serial, function (det) {
                    if (det) {
                        var persons = tmdbPersons(det, serial);
                        if (persons.cast.length || persons.crew.length) result.persons = persons;

                        var sim = ((det.similar && det.similar.results) || []).map(tmdbCard).filter(Boolean);
                        if (sim.length) result.simular = { results: sim };

                        var rec = ((det.recommendations && det.recommendations.results) || []).map(tmdbCard).filter(Boolean);
                        if (rec.length) result.recomend = { results: rec };

                        var vids = ((det.videos && det.videos.results) || [])
                            .filter(function (v) { return v.site === 'YouTube' && v.key; })
                            .map(function (v) { return { name: v.name, key: v.key, site: 'youtube', type: v.type }; });
                        if (vids.length) result.videos = { results: vids };
                    }
                    oncomplite(result);
                });
            }

            // Фолбэк: детали поста недоступны (404 и т.п.) — строим карточку из
            // данных каталога (params.card) + TMDB. Плеера Filmix не будет (ссылок нет).
            function fallback() {
                var card = params.card;
                if (!card) { (onerror || function () {})(); return; }
                var serial = !!(card.original_name || card.name) || params.method === 'tv';
                // Гарантируем поля, которые рендер полной карточки читает без проверок
                if (!card.production_companies) card.production_companies = [];
                if (!card.production_countries) card.production_countries = [];
                if (!card.genres)               card.genres = [];
                if (card.source === undefined)  card.source = SOURCE_NAME;
                emit({
                    movie:   card,
                    persons: { cast: [], crew: [] },
                    simular: { results: [] },
                    videos:  { results: [] },
                }, card, serial);
            }

            // Загрузка карточки из Filmix (наш рендер) — фолбэк, если нет совпадения TMDB
            function loadFilmix() {
            get(postUrl(id),
                function (data) {
                    if (!data || !data.id) { fallback(); return; }

                    var movie = convertCard(data);
                    var playlist = ((data.player_links || {}).playlist) || {};
                    var seasonsCount = countSeasons(playlist);

                    // длительность, дата
                    if (data.duration) movie.runtime = data.duration;

                    // персоны
                    var cast = (data.found_actors || []).map(function (a) {
                        return {
                            id: a.id, name: a.name,
                            original_name: a.original_name || '',
                            character: '', profile_path: '',
                        };
                    });
                    var crew = (data.directors || []).map(function (name) {
                        return { name: name, job: 'Director', profile_path: '' };
                    });

                    // сериал: количество сезонов, прикрепляем плейлист к карточке
                    if (seasonsCount) {
                        movie.number_of_seasons = seasonsCount;
                        movie.seasons_count     = seasonsCount;
                        movie.filmix_playlist   = playlist;
                    }

                    // трейлеры
                    var trailers = (data.player_links || {}).trailer || [];
                    var videos = {
                        results: trailers.map(function (t, i) {
                            return {
                                name: 'Трейлер ' + (i + 1),
                                key:  (t && t.link) ? t.link : t,
                                site: 'direct', type: 'Trailer',
                            };
                        }),
                    };

                    // прямые ссылки на фильм
                    var movieLinks = (data.player_links || {}).movie || [];
                    if (movieLinks.length) movie.filmix_links = movieLinks;

                    var result = {
                        movie:   movie,
                        persons: { cast: cast, crew: crew },
                        simular: { results: (data.relates || []).map(convertCard).filter(Boolean) },
                        videos:  videos,
                    };

                    // эпизоды первого сезона (для сериалов)
                    if (seasonsCount) {
                        var firstSeason = Object.keys(playlist).sort(function (a, b) { return +a - +b; })[0];
                        var built = buildSeasonEpisodes(playlist, firstSeason, movie);
                        result.episodes = {
                            episodes:      built.episodes,
                            seasons_count: built.seasons_count,
                            name:          'Сезон ' + firstSeason,
                        };
                    }

                    // Обогащаем карточку данными TMDB и отдаём результат.
                    var serial = isSerial(data.section);
                    emit(result, movie, serial);
                },
                fallback
            );
            }

            // Режим редиректа: открыть РОДНУЮ карточку TMDB (отзывы, сезоны/серии,
            // всё нативно). Список — из Filmix, карточка — из TMDB.
            // Если совпадения нет — показываем нашу карточку Filmix.
            if (tmdbEnabled() && tmdbRedirect()) {
                var rc      = params.card || {};
                var rserial = !!(rc.original_name || rc.name) || params.method === 'tv';
                var rtitle  = rserial
                    ? (rc.original_name || rc.name || rc.original_title || rc.title)
                    : (rc.original_title || rc.title || rc.name);
                var ryear   = ((rserial ? rc.first_air_date : rc.release_date) || '').slice(0, 4);

                if (rtitle) {
                    tmdbFindId(rtitle, ryear, rserial, function (tmdbId) {
                        if (tmdbId) {
                            Lampa.Activity.replace({
                                component: 'full',
                                source:    'tmdb',
                                id:        tmdbId,
                                method:    rserial ? 'tv' : 'movie',
                                card:      { id: tmdbId, source: 'tmdb' },
                            });
                        } else {
                            loadFilmix();   // нет совпадения TMDB — наша карточка
                        }
                    });
                    return;
                }
            }

            loadFilmix();
        },

        // ── Сезоны: (tv, from, oncomplite) → {[n]:{episodes, seasons_count}} ──
        seasons: function (tv, from, oncomplite) {
            var id = (tv && (tv.filmix_id || tv.id));
            var playlist = tv && tv.filmix_playlist;

            function emit(pl) {
                var out = {};
                (from || []).forEach(function (seasonNum) {
                    var built = buildSeasonEpisodes(pl, seasonNum, tv || {});
                    out[seasonNum] = {
                        season_number: +seasonNum,
                        episodes:      built.episodes,
                        seasons_count: built.seasons_count || countSeasons(pl),
                    };
                });
                oncomplite(out);
            }

            // плейлист уже есть в карточке (из full) — используем его
            if (playlist && Object.keys(playlist).length) { emit(playlist); return; }

            // иначе запрашиваем пост
            if (!id) { oncomplite({}); return; }
            get(postUrl(id),
                function (data) {
                    var pl = ((data && data.player_links) || {}).playlist || {};
                    emit(pl);
                },
                function () { oncomplite({}); }
            );
        },

        // ── Поиск (нужен токен) ──
        search: function (params, oncomplite, onerror) {
            var query = params.query || params.search || '';
            if (!query) { oncomplite({ movie: { results: [] }, tv: { results: [] } }); return; }

            if (!token()) {
                Lampa.Noty.show('Filmix: для поиска нужен токен (Настройки → Filmix).');
                oncomplite({ movie: { results: [] }, tv: { results: [] } });
                return;
            }

            get(searchUrl(query),
                function (data) {
                    var cards = (Array.isArray(data) ? data : []).map(convertCard).filter(Boolean);
                    // глобальный поиск ждёт {movie:{...}, tv:{...}} ИЛИ массив — отдаём массив рядов
                    oncomplite([{ title: 'Filmix: ' + query, results: cards }]);
                },
                onerror || function () {}
            );
        },

        // ── Персона: {person, credits:{knownFor:[{name, credits:[...]}]}} ──
        person: function (params, oncomplite, onerror) {
            var id = params.id || (params.card && (params.card.filmix_id || params.card.id));
            if (!id) { (onerror || function () {})(); return; }

            get(personUrl(id),
                function (data) {
                    if (!data || !data.id) { (onerror || function () {})(); return; }

                    var movies = (data.movies || []).map(convertCard).filter(Boolean);

                    oncomplite({
                        person: {
                            id:            data.id,
                            name:          data.name,
                            original_name: data.original_name || '',
                            biography:     data.about       || '',
                            birthday:      data.birth       || '',
                            deathday:      data.death !== '-' ? (data.death || '') : '',
                            place_of_birth: data.birth_place || '',
                            profile_path:  data.poster      || '',
                            known_for_department: data.career || '',
                        },
                        credits: {
                            knownFor: movies.length ? [
                                { name: data.career || 'Фильмография', credits: movies },
                            ] : [],
                        },
                    });
                },
                onerror || function () {}
            );
        },

        // ── Сброс сетевых запросов ──
        clear: function () {
            clearRequests();
        },

        // ── Прочие методы интерфейса (заглушки) ──
        img: function (path) { return path || ''; },
        menuCategory: function (params, oncomplite) { (oncomplite || function () {})([]); },
        company:     function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
        favorite:    function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
        relise:      function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
        genres:      function (params, oncomplite) { (oncomplite || function () {})([]); },
        collections: function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
    };

    // ─────────────────────────────────────────────────────────────
    // Device activation flow (Smart TV–стиль):
    //   1. Запрашиваем token_request → получаем user_code (4 буквы)
    //   2. Показываем пользователю код и ссылку filmix.me/activate
    //   3. Опрашиваем token_request/check каждые 5 сек
    //   4. Когда user_dev_token вернётся — сохраняем и прекращаем опрос
    // ─────────────────────────────────────────────────────────────
    var _activationTimer = null;

    function stopActivation() {
        if (_activationTimer) { clearInterval(_activationTimer); _activationTimer = null; }
    }

    function startDeviceActivation() {
        stopActivation();
        Lampa.Noty.show('Filmix: запрашиваю код активации…');
        fetch(tokenRequestUrl())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || data.status !== 'ok' || !data.code) {
                    Lampa.Noty.show('Filmix: не удалось получить код. Попробуйте позже.');
                    return;
                }
                // Длинный code — это и есть кандидат-токен. Он станет рабочим,
                // как только пользователь подтвердит устройство на сайте Filmix.
                var candidateToken = data.code;
                var userCode       = data.user_code || '';

                // Показываем диалог, который остаётся на экране до получения токена
                Lampa.Select.show({
                    title: 'Привязка Filmix — код: ' + userCode,
                    items: [
                        { title: 'Ваш код: ' + userCode },
                        { title: 'Откройте filmix.me → «Профиль» → «Устройства» и введите этот код' },
                        { title: 'Закрыть', cancel: true },
                    ],
                    onSelect: function () { stopActivation(); Lampa.Controller.toggle('settings_component'); },
                    onBack:   function () { stopActivation(); Lampa.Controller.toggle('settings_component'); },
                });

                var attempts = 0;
                var MAX = 60; // ~5 мин (60 × 5 сек)
                _activationTimer = setInterval(function () {
                    attempts++;
                    if (attempts > MAX) {
                        stopActivation();
                        Lampa.Noty.show('Filmix: время ожидания истекло. Повторите привязку.');
                        return;
                    }
                    // Опрашиваем user_profile с кандидатом-токеном.
                    // Появилось user_data → устройство подтверждено, токен рабочий.
                    fetch(userProfileUrl(candidateToken))
                        .then(function (r) { return r.json(); })
                        .then(function (resp) {
                            if (resp && resp.user_data) {
                                stopActivation();
                                Lampa.Storage.set('filmix_token', candidateToken);
                                if (Lampa.Controller) Lampa.Controller.toggle('settings_component');
                                Lampa.Noty.show('Filmix: аккаунт привязан! Токен сохранён ✓');
                            }
                        })
                        .catch(function () {});
                }, 5000);
            })
            .catch(function () {
                Lampa.Noty.show('Filmix: ошибка сети. Проверьте подключение.');
            });
    }

    // ─────────────────────────────────────────────────────────────
    // Раздел настроек «MediaSources» (через Lampa.SettingsApi)
    // Токен НЕ хранится в коде — вводится пользователем и сохраняется
    // в Lampa.Storage['filmix_token'] (его читает token()).
    // ─────────────────────────────────────────────────────────────
    function registerSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: SETTINGS_COMPONENT,
            name:      PLUGIN_TITLE,
            icon:      SETTINGS_ICON,
        });

        // Заголовок-секция Filmix
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param:     { type: 'title' },
            field:     { name: 'Filmix' },
        });

        // Поле ввода токена (тип input — значение сохраняется в Storage автоматически)
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:        'filmix_token',
                type:        'input',
                values:      '',
                'default':   '',
                placeholder: 'Вставьте токен Filmix',
            },
            field: {
                name:        'Токен Filmix',
                description: 'Нужен для поиска и доступа к плеерам. Получить можно в приложении/на сайте Filmix.',
            },
            onChange: function (value) {
                Lampa.Storage.set('filmix_token', (value || '').trim());
                Lampa.Noty.show((value || '').trim()
                    ? 'Filmix: токен сохранён'
                    : 'Filmix: токен очищен');
            },
        });

        // Переключатель TMDB-обогащения карточек
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_tmdb_cards',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        'Карточки TMDB',
                description: 'Дополнять открытую карточку данными TMDB (постер, фон, описание, рейтинг, imdb_id для онлайн-плагинов).',
            },
        });

        // Переключатель режима редиректа на родную карточку TMDB
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_tmdb_redirect',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        'Открывать карточку в TMDB',
                description: 'Список из Filmix, а карточка открывается как родная TMDB (отзывы, сезоны и серии, рекомендации). Если совпадения в TMDB нет — показывается карточка Filmix.',
            },
        });

        // Кнопка привязки аккаунта через device activation flow
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param:     { type: 'button' },
            field: {
                name:        'Привязать аккаунт Filmix',
                description: 'Получить токен автоматически. Откроется код — введите его на filmix.me в разделе «Устройства».',
            },
            onChange:  startDeviceActivation,
        });

        // Кнопка проверки токена
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param:     { type: 'button' },
            field:     { name: 'Проверить токен' },
            onChange:  function () {
                if (!token()) { Lampa.Noty.show('Filmix: токен не задан'); return; }
                Lampa.Noty.show('Filmix: проверяю токен…');
                get(searchUrl('matrix'),
                    function (data) {
                        Lampa.Noty.show(Array.isArray(data) && data.length
                            ? 'Filmix: токен работает ✓'
                            : 'Filmix: токен принят, но поиск пуст');
                    },
                    function () { Lampa.Noty.show('Filmix: токен недействителен ✗'); }
                );
            },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Инициализация
    // ─────────────────────────────────────────────────────────────
    function init() {
        if (window.filmix_plugin_loaded) return;
        window.filmix_plugin_loaded = true;

        Lampa.Api.sources[SOURCE_NAME] = Source;
        Object.defineProperty(Lampa.Api.sources, SOURCE_NAME, {
            get:          function () { return Source; },
            configurable: true,
        });

        if (Lampa.Params && Lampa.Params.values && Lampa.Params.values.source) {
            Lampa.Params.values.source[SOURCE_NAME] = SOURCE_TITLE;
        }

        registerSettings();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') init();
    });

})();
