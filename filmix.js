(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // Константы
    // ─────────────────────────────────────────────────────────────
    var SOURCE_NAME  = 'filmix';
    var SOURCE_TITLE = 'Filmix';
    var API_URL      = 'http://filmixapp.cyou/api/v2/';

    // Зафиксированный device_id для одного устройства
    var DEVICE_ID = Lampa.Storage.field('filmix_device_id') || (function () {
        var id = Lampa.Utils.uid(16);
        Lampa.Storage.set('filmix_device_id', id);
        return id;
    }());

    var network = new Lampa.Reguest();

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
    // Сетевой слой
    // ─────────────────────────────────────────────────────────────
    function get(url, onSuccess, onError) {
        network.timeout(15000);
        network.get(url, onSuccess, onError || function () {});
    }

    function catalogUrl(params) {
        var url = API_URL + 'catalog?' + authParams();
        if (params.cat)    url += '&cat='    + params.cat;
        if (params.sort)   url += '&sort='   + params.sort;
        if (params.page)   url += '&page='   + params.page;
        return url;
    }

    function searchUrl(query) {
        return API_URL + 'search?' + authParams() + '&s=' + encodeURIComponent(query);
    }

    function postUrl(id) {
        return API_URL + 'post/' + id + '?' + authParams();
    }

    function personUrl(id) {
        return API_URL + 'person/' + id + '?' + authParams();
    }

    // ─────────────────────────────────────────────────────────────
    // Нормализация карточки: Filmix API → Lampa card
    // ─────────────────────────────────────────────────────────────

    // Секции API: 0=фильм, 7=сериал, 14=мульт/мультсериал, 93=аниме
    function isSerial(section) {
        return section === 7 || section === 93 || section === 14;
    }

    function convertCard(item) {
        if (!item) return null;

        var genres  = (item.categories || []).map(function (name) { return { name: name }; });
        var year    = item.year ? String(item.year) : '';

        return {
            // Идентификаторы
            id:             item.id,
            filmix_id:      item.id,
            alt_name:       item.alt_name || '',

            // Метаданные
            title:          item.title          || item.original_title || '',
            original_title: item.original_title || item.title          || '',
            overview:       item.short_story    || '',
            release_date:   year ? year + '-01-01' : '',
            genres:         genres,
            type:           isSerial(item.section) ? 'tv' : 'movie',
            quality:        item.quality || item.rip || '',

            // Рейтинги (API может вернуть строку "-" вместо числа без токена)
            vote_average:  parseFloat(item.kp_rating) || parseFloat(item.imdb_rating) || 0,
            vote_count:    parseInt(item.kp_votes, 10) || 0,
            filmix_rating:  item.rating || 0,
            kp_rating:      parseFloat(item.kp_rating)  || 0,
            imdb_rating:    parseFloat(item.imdb_rating) || 0,

            // Постер (thumb w220 → w400 для отображения)
            poster:         posterLarge(item.poster),
            poster_path:    posterLarge(item.poster),
            backdrop_path:  posterLarge(item.poster),

            // Производство
            production_countries: (item.countries || []).map(function (c) { return { name: c }; }),

            // Сериал
            number_of_seasons: isSerial(item.section) ? 1 : undefined,
        };
    }

    // Заменяет w220 → w400 в URL постера
    function posterLarge(url) {
        if (!url) return '';
        return url.replace('/w220/', '/w400/').replace('/w140/', '/w400/');
    }

    // ─────────────────────────────────────────────────────────────
    // Построение credits / seasons из полного поста
    // ─────────────────────────────────────────────────────────────

    function buildCredits(data) {
        var cast = (data.found_actors || []).map(function (a) {
            return {
                id:            a.id,
                name:          a.name,
                original_name: a.original_name || '',
                character:     '',
                profile_path:  '',
            };
        });

        var crew = (data.directors || []).map(function (name) {
            return { name: name, job: 'Director', profile_path: '' };
        });

        return { cast: cast, crew: crew };
    }

    // player_links.playlist → массив сезонов Lampa
    function buildSeasons(playlist, title) {
        var seasons = [];
        Object.keys(playlist).sort(function (a, b) { return +a - +b; }).forEach(function (num) {
            var translations = playlist[num];
            var firstKey     = Object.keys(translations || {})[0];
            var epCount      = firstKey ? Object.keys(translations[firstKey]).length : 0;

            seasons.push({
                season_number: +num,
                episode_count: epCount,
                name:          (title || '') + '. Сезон ' + num,
                air_date:      '',
            });
        });
        return seasons;
    }

    // player_links.playlist → seasons_obj (для Lampa-плеера)
    // Структура: { "1": { season_number, translations, episodes: { "1": { episode_number, name, urls } } } }
    function buildSeasonsObj(playlist) {
        var obj = {};
        Object.keys(playlist).forEach(function (seasonNum) {
            var translations  = playlist[seasonNum];
            var episodesObj   = {};
            var translationList = Object.keys(translations);

            translationList.forEach(function (transName) {
                var eps = translations[transName];
                Object.keys(eps).forEach(function (epNum) {
                    var ep = eps[epNum];
                    if (!episodesObj[epNum]) {
                        episodesObj[epNum] = {
                            episode_number: +epNum,
                            name:           'Серия ' + epNum,
                            urls:           {},
                        };
                    }
                    episodesObj[epNum].urls[transName] = ep.link || ep;
                });
            });

            obj[seasonNum] = {
                season_number: +seasonNum,
                translations:  translationList,
                episodes:      episodesObj,
            };
        });
        return obj;
    }

    // ─────────────────────────────────────────────────────────────
    // Разбор URL списка: /catalog/list?plugin=filmix&cat=s0&sort=date
    // ─────────────────────────────────────────────────────────────
    function parseListUrl(url) {
        var result = { cat: 's0', sort: 'date' };
        if (!url) return result;
        var catM  = url.match(/[?&]cat=([^&]+)/);
        var sortM = url.match(/[?&]sort=([^&]+)/);
        if (catM)  result.cat  = catM[1];
        if (sortM) result.sort = sortM[1];
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Объект источника
    // ─────────────────────────────────────────────────────────────
    var Source = {
        SOURCE_NAME:  SOURCE_NAME,
        SOURCE_TITLE: SOURCE_TITLE,

        // ── Главный экран ─────────────────────────────────────────
        main: function (params) {
            var rows = [
                { title: 'Новые фильмы',     cat: 's0',  sort: 'date'   },
                { title: 'Новые сериалы',    cat: 's7',  sort: 'date'   },
                { title: 'Топ фильмы',       cat: 's0',  sort: 'rating' },
                { title: 'Топ сериалы',      cat: 's7',  sort: 'rating' },
                { title: 'Мультфильмы',      cat: 's14', sort: 'date'   },
                { title: 'Аниме',            cat: 's93', sort: 'date'   },
            ];

            var status = new Lampa.Status(rows.length);
            status.onComplite = params.onComplite || function () {};

            rows.forEach(function (row) {
                get(catalogUrl({ cat: row.cat, sort: row.sort, page: 1 }),
                    function (data) {
                        if (!Array.isArray(data) || !data.length) { status.error(); return; }
                        status.append(row.title, row.title, data.map(convertCard).filter(Boolean));
                    },
                    function () { status.error(); }
                );
            });
        },

        // ── Меню категорий ────────────────────────────────────────
        menu: function (params) {
            var categories = [
                { title: 'Фильмы',      cat: 's0'  },
                { title: 'Сериалы',     cat: 's7'  },
                { title: 'Мультфильмы', cat: 's14' },
                { title: 'Аниме',       cat: 's93' },
            ];

            var sorts = [
                { label: 'По дате',     sort: 'date'   },
                { label: 'По рейтингу', sort: 'rating' },
                { label: 'По году',     sort: 'year'   },
            ];

            var sections = [];
            categories.forEach(function (cat) {
                sorts.forEach(function (s) {
                    sections.push({
                        title: cat.title + ' — ' + s.label,
                        url:   '/catalog/list?plugin=' + SOURCE_NAME +
                               '&cat=' + cat.cat + '&sort=' + s.sort,
                    });
                });
            });

            params.onComplite(sections);
        },

        // ── Список с пагинацией ───────────────────────────────────
        list: function (params) {
            var parsed = parseListUrl(params.url);
            var page   = params.page || 1;

            get(catalogUrl({ cat: parsed.cat, sort: parsed.sort, page: page }),
                function (data) {
                    if (!Array.isArray(data) || !data.length) {
                        params.empty ? params.empty() : params.onComplite([]);
                        return;
                    }
                    params.onComplite({
                        results:     data.map(convertCard).filter(Boolean),
                        total_pages: 999,  // API не сообщает число страниц
                    });
                },
                params.error || function () {}
            );
        },

        category: function (params) {
            var Source = Lampa.Api.sources[SOURCE_NAME];
            Source.list(params);
        },

        // ── Полная карточка ───────────────────────────────────────
        full: function (params) {
            var card   = params.card;
            var id     = card.filmix_id || card.id;
            var status = new Lampa.Status(1);
            status.onComplite = params.onComplite || function () {};

            get(postUrl(id),
                function (data) {
                    if (!data || !data.id) { status.error(); return; }

                    var enriched = convertCard(data);

                    // Актёры и режиссёры
                    enriched.credits = buildCredits(data);

                    // Похожие
                    enriched.similar = {
                        results: (data.relates || []).map(convertCard).filter(Boolean),
                    };

                    // Трейлеры
                    var trailers = (data.player_links || {}).trailer || [];
                    enriched.videos = {
                        results: trailers.map(function (t, i) {
                            return {
                                name: 'Trailer ' + (i + 1),
                                key:  t.link || t,
                                site: 'direct',
                                type: 'Trailer',
                            };
                        }),
                    };

                    // Прямые ссылки на фильм
                    var movieLinks = (data.player_links || {}).movie || [];
                    if (movieLinks.length) {
                        enriched.filmix_links = movieLinks;
                    }

                    // Сериальные данные
                    var playlist = ((data.player_links || {}).playlist) || {};
                    if (Object.keys(playlist).length) {
                        enriched.seasons      = buildSeasons(playlist, data.title);
                        enriched.seasons_obj  = buildSeasonsObj(playlist);
                        enriched.number_of_seasons = enriched.seasons.length;
                    }

                    status.append('full', 'full', enriched);
                },
                function () { status.error(); }
            );
        },

        // ── Поиск ─────────────────────────────────────────────────
        // Без токена API возвращает пустой массив.
        // Для поиска необходим активный filmix_token в Lampa.Storage.
        search: function (params) {
            var query = params.query || params.search || '';
            if (!query) { params.onComplite([]); return; }

            if (!token()) {
                Lampa.Noty.show('Filmix: для поиска необходим токен. Укажите его в настройках.');
                params.empty ? params.empty() : params.onComplite([]);
                return;
            }

            get(searchUrl(query),
                function (data) {
                    if (!Array.isArray(data) || !data.length) {
                        params.empty ? params.empty() : params.onComplite([]);
                        return;
                    }
                    params.onComplite(data.map(convertCard).filter(Boolean));
                },
                params.error || function () {}
            );
        },

        // ── Персона ───────────────────────────────────────────────
        person: function (params) {
            var id = params.id || (params.card && (params.card.filmix_id || params.card.id));
            if (!id) { params.error && params.error(); return; }

            get(personUrl(id),
                function (data) {
                    if (!data || !data.id) { params.error && params.error(); return; }

                    params.onComplite({
                        id:             data.id,
                        name:           data.name,
                        original_name:  data.original_name || '',
                        biography:      data.about         || '',
                        birthday:       data.birth         || '',
                        deathday:       data.death !== '-' ? (data.death || '') : '',
                        place_of_birth: data.birth_place   || '',
                        gender:         data.gender === 'man' ? 2 : 1,
                        profile_path:   data.poster        || '',
                        known_for_department: data.career  || '',
                        movie_credits: {
                            cast: (data.movies || []).map(convertCard).filter(Boolean),
                        },
                    });
                },
                params.error || function () {}
            );
        },

        // ── Сезоны ────────────────────────────────────────────────
        seasons: function (params) {
            var id = params.filmix_id || (params.card && params.card.filmix_id);
            if (!id) { params.onComplite([]); return; }

            get(postUrl(id),
                function (data) {
                    if (!data || !data.player_links) { params.onComplite([]); return; }
                    var playlist = data.player_links.playlist || {};
                    params.onComplite({
                        seasons:     buildSeasons(playlist, data.title),
                        seasons_obj: buildSeasonsObj(playlist),
                    });
                },
                function () { params.onComplite([]); }
            );
        },

        // ── Сброс сетевых запросов ────────────────────────────────
        clear: function () {
            network.clear();
        },

        // ── Методы, которые Lampa может вызвать (стабы) ──────────
        img: function (path) {
            return path || '';
        },

        menuCategory: function (params) {
            if (params && params.onComplite) params.onComplite([]);
        },

        company: function (params) {
            if (params && params.onComplite) params.onComplite({ results: [] });
        },

        favorite: function (params) {
            if (params && params.onComplite) params.onComplite({ results: [] });
        },

        relise: function (params) {
            if (params && params.onComplite) params.onComplite({ results: [] });
        },

        genres: function (onComplite) {
            if (onComplite) onComplite([]);
        },

        collections: function (params) {
            if (params && params.onComplite) params.onComplite({ results: [] });
        },
    };

    // ─────────────────────────────────────────────────────────────
    // Настройки (ввод токена)
    // ─────────────────────────────────────────────────────────────
    function showSettings() {
        Lampa.Select.show({
            title: 'Filmix — настройки',
            items: [
                {
                    title:       'Токен: ' + (token() ? token().substring(0, 8) + '…' : 'не задан'),
                    description: 'Нужен для поиска и взрослого контента',
                    action:      'token',
                },
            ],
            onSelect: function (item) {
                if (item.action === 'token') {
                    // Lampa не имеет встроенного текстового ввода в TV-режиме,
                    // поэтому показываем подсказку
                    Lampa.Noty.show('Filmix: установите токен через Lampa.Storage.set("filmix_token", "ВАШ_ТОКЕН")');
                }
            },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Инициализация
    // ─────────────────────────────────────────────────────────────
    function init() {
        if (window.filmix_plugin_loaded) return;
        window.filmix_plugin_loaded = true;

        if (Lampa.Api.sources[SOURCE_NAME]) {
            Lampa.Noty.show('Filmix: источник уже зарегистрирован другим плагином');
            return;
        }

        // Регистрируем источник
        Lampa.Api.sources[SOURCE_NAME] = Source;
        Object.defineProperty(Lampa.Api.sources, SOURCE_NAME, {
            get:          function () { return Source; },
            configurable: true,
        });

        // Добавляем в выпадающий список источников
        if (Lampa.Params && Lampa.Params.values && Lampa.Params.values.source) {
            Lampa.Params.values.source[SOURCE_NAME] = SOURCE_TITLE;
        }
    }

    Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') init();
    });

})();
