(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────
    var SOURCE_NAME  = 'filmix';
    var SOURCE_TITLE = 'Filmix';
    var API_URL      = 'http://filmixapp.cyou/api/v2/';

    // Settings section in Lampa (the name "Filmix" is already taken by another plugin)
    var PLUGIN_TITLE      = 'MediaSources';
    var SETTINGS_COMPONENT = 'mediasources';
    var SETTINGS_ICON =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 5h16v14H4z" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M4 9h16M9 5v14M15 5v14" stroke="currentColor" stroke-width="1.6"/></svg>';

    // ─────────────────────────────────────────────────────────────
    // i18n — English is the base language, Russian is a translation.
    // Strings are resolved via Lampa.Lang (it follows the UI language and
    // falls back to English automatically). L() also falls back to the
    // English value from the dictionary if Lampa.Lang is unavailable.
    // ─────────────────────────────────────────────────────────────
    var LANG = {
        // Catalog / lanes
        filmix_cat_movies:    { en: 'Movies',   ru: 'Фильмы' },
        filmix_cat_series:    { en: 'Series',   ru: 'Сериалы' },
        filmix_cat_cartoons:  { en: 'Cartoons', ru: 'Мультфильмы' },
        filmix_cat_anime:     { en: 'Anime',    ru: 'Аниме' },
        filmix_cat_default:   { en: 'Catalog',  ru: 'Каталог' },
        filmix_lane_new:      { en: 'New',      ru: 'Новые' },
        filmix_lane_top:      { en: 'Top',      ru: 'Топ' },
        filmix_lane_latest:   { en: 'Latest',   ru: 'Последние' },
        filmix_lane_new_episodes: { en: 'New series episodes', ru: 'Новые эпизоды сериалов' },
        filmix_lane_continue:     { en: 'Continue watching', ru: 'Продолжить просмотр' },
        filmix_lane_now_movies:    { en: 'Now watching movies',    ru: 'Сейчас смотрят фильмы' },
        filmix_lane_now_series:    { en: 'Now watching series',    ru: 'Сейчас смотрят сериалы' },
        filmix_lane_now_cartoons:  { en: 'Now watching cartoons',  ru: 'Сейчас смотрят мультфильмы' },
        filmix_coll_foreign:      { en: 'Foreign', ru: 'Зарубежные' },
        filmix_coll_russian:      { en: 'Russian', ru: 'Русские' },
        filmix_season:        { en: 'Season',   ru: 'Сезон' },
        filmix_episode:       { en: 'Episode',  ru: 'Серия' },
        filmix_trailer:       { en: 'Trailer',  ru: 'Трейлер' },
        filmix_filmography:   { en: 'Filmography', ru: 'Фильмография' },
        filmix_comments_button:{ en: 'Filmix comments', ru: 'Комментарии Filmix' },
        filmix_comments_title: { en: 'Comments', ru: 'Комментарии' },
        filmix_comments_filmix: { en: 'Filmix comments', ru: 'Комментарии Filmix' },
        filmix_comments_toggle_name: { en: 'Filmix comments button', ru: 'Кнопка комментариев Filmix' },
        filmix_comments_toggle_desc: { en: 'Show Filmix comments button on cards.', ru: 'Показывать кнопку комментариев Filmix на карточках.' },

        // Settings
        filmix_token_name:        { en: 'Filmix token', ru: 'Токен Filmix' },
        filmix_token_desc:        { en: 'Required for search. You can obtain it via the Filmix app/site.',
                                    ru: 'Нужен для поиска. Получить можно в приложении/на сайте Filmix.' },
        filmix_token_placeholder: { en: 'Paste your Filmix token', ru: 'Вставьте токен Filmix' },
        filmix_tmdb_cards_name:   { en: 'TMDB cards', ru: 'Карточки TMDB' },
        filmix_tmdb_cards_desc:   { en: 'Enrich the opened card with TMDB data (poster, backdrop, overview, rating, imdb_id for online plugins).',
                                    ru: 'Дополнять открытую карточку данными TMDB (постер, фон, описание, рейтинг, imdb_id для онлайн-плагинов).' },
        filmix_quality_label_name:{ en: 'Quality label', ru: 'Лейбл качества' },
        filmix_quality_label_desc:{ en: 'Show quality labels on cards in lanes and lists.',
                        ru: 'Показывать лейбл качества на карточках в лентах и списках.' },
        filmix_now_lanes_name:    { en: 'Now watching lanes', ru: 'Ленты Сейчас смотрят' },
        filmix_now_lanes_desc:    { en: 'Show "Now watching" lanes on home and category pages.',
                        ru: 'Показывать ленты «Сейчас смотрят» на главной и в разделах.' },
        filmix_episode_label_name:{ en: 'Episode label', ru: 'Лейбл серии' },
        filmix_episode_label_desc:{ en: 'Show the latest released season/episode (e.g. S3E1) on series posters in lanes, under the quality label.',
                        ru: 'Показывать последний вышедший сезон/серию (например, S3E1) на постерах сериалов в лентах, под лейблом качества.' },
        filmix_redirect_name:     { en: 'Open card in TMDB', ru: 'Открывать карточку в TMDB' },
        filmix_redirect_desc:     { en: 'List comes from Filmix, the card opens as a native TMDB card (reviews, seasons and episodes, recommendations). If there is no TMDB match — the Filmix card is shown.',
                                    ru: 'Список из Filmix, а карточка открывается как родная TMDB (отзывы, сезоны и серии, рекомендации). Если совпадения в TMDB нет — показывается карточка Filmix.' },
        filmix_foreign_name:      { en: 'Foreign collections', ru: 'Подборки Зарубежные' },
        filmix_foreign_desc:      { en: 'Show "Foreign" lanes on the films and series pages.',
                                    ru: 'Показывать ленты «Зарубежные» на страницах фильмов и сериалов.' },
        filmix_russian_name:      { en: 'Russian collections', ru: 'Подборки Русские' },
        filmix_russian_desc:      { en: 'Show "Russian" lanes on the films and series pages.',
                                    ru: 'Показывать ленты «Русские» на страницах фильмов и сериалов.' },
        filmix_link_name:         { en: 'Link Filmix account', ru: 'Привязать аккаунт Filmix' },
        filmix_link_desc:         { en: 'Obtain a token automatically. A code will appear — enter it on filmix.me under "Devices".',
                                    ru: 'Получить токен автоматически. Откроется код — введите его на filmix.me в разделе «Устройства».' },
        filmix_check_name:        { en: 'Check token', ru: 'Проверить токен' },

        // Notifications
        filmix_noty_need_token:   { en: 'Filmix: a token is required for search (Settings → MediaSources).',
                                    ru: 'Filmix: для поиска нужен токен (Настройки → MediaSources).' },
        filmix_noty_token_saved:  { en: 'Filmix: token saved', ru: 'Filmix: токен сохранён' },
        filmix_noty_token_cleared:{ en: 'Filmix: token cleared', ru: 'Filmix: токен очищен' },
        filmix_noty_token_not_set:{ en: 'Filmix: token is not set', ru: 'Filmix: токен не задан' },
        filmix_noty_checking:     { en: 'Filmix: checking the token…', ru: 'Filmix: проверяю токен…' },
        filmix_noty_token_works:  { en: 'Filmix: token works ✓', ru: 'Filmix: токен работает ✓' },
        filmix_noty_token_empty:  { en: 'Filmix: token accepted, but search is empty', ru: 'Filmix: токен принят, но поиск пуст' },
        filmix_noty_token_invalid:{ en: 'Filmix: token is invalid ✗', ru: 'Filmix: токен недействителен ✗' },
        filmix_noty_requesting:   { en: 'Filmix: requesting an activation code…', ru: 'Filmix: запрашиваю код активации…' },
        filmix_noty_code_fail:    { en: 'Filmix: failed to get a code. Try again later.', ru: 'Filmix: не удалось получить код. Попробуйте позже.' },
        filmix_noty_timeout:      { en: 'Filmix: timed out. Please retry the linking.', ru: 'Filmix: время ожидания истекло. Повторите привязку.' },
        filmix_noty_linked:       { en: 'Filmix: account linked! Token saved ✓', ru: 'Filmix: аккаунт привязан! Токен сохранён ✓' },
        filmix_noty_net_error:    { en: 'Filmix: network error. Check your connection.', ru: 'Filmix: ошибка сети. Проверьте подключение.' },
        filmix_noty_comments_loading: { en: 'Filmix: loading comments…', ru: 'Filmix: загружаю комментарии…' },
        filmix_noty_comments_empty:   { en: 'Filmix: no comments yet', ru: 'Filmix: комментариев пока нет' },
        filmix_noty_comments_error:   { en: 'Filmix: failed to load comments', ru: 'Filmix: не удалось загрузить комментарии' },
        filmix_noty_comments_missing:   { en: 'Filmix: title not found on Filmix', ru: 'Filmix: фильм/сериал не найден на Filmix' },
        filmix_noty_comments_searching: { en: 'Filmix: searching…', ru: 'Filmix: ищу…' },

        // Device-linking dialog
        filmix_link_dialog_title: { en: 'Filmix linking — code:', ru: 'Привязка Filmix — код:' },
        filmix_link_your_code:    { en: 'Your code:', ru: 'Ваш код:' },
        filmix_link_instr:        { en: 'Open filmix.me → "Profile" → "Devices" and enter this code',
                                    ru: 'Откройте filmix.me → «Профиль» → «Устройства» и введите этот код' },
        filmix_close:             { en: 'Close', ru: 'Закрыть' },
    };

    function L(key) {
        if (Lampa.Lang && Lampa.Lang.translate) {
            var v = Lampa.Lang.translate(key);
            if (v && v !== key) return v;
        }
        return (LANG[key] && LANG[key].en) || key;
    }

    function registerLang() {
        if (Lampa.Lang && Lampa.Lang.add) Lampa.Lang.add(LANG);
    }

    // Fixed device_id, one per device
    var DEVICE_ID = (function () {
        var id = Lampa.Storage.field('filmix_device_id');
        // guard against an old bug that stored the literal string "undefined"/empty
        if (!id || id === 'undefined' || id === 'null') {
            id = Lampa.Utils.uid(16);
            Lampa.Storage.set('filmix_device_id', id);
        }
        return id;
    }());

    var _activeControllers = [];

    // ─────────────────────────────────────────────────────────────
    // Authentication
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
    // Network layer (native fetch — Lampa.Reguest is unstable on some builds)
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
                // onFulfilled: exceptions thrown by onSuccess must NOT reach onError,
                // so we use the second argument of then() instead of .catch()
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
        if (params.cat)  url += '&filter='  + params.cat;   // section filter: s0/s7/s14/s93
        if (params.sort) url += '&orderby=' + params.sort;  // date | rating | year | kp_rating
        if (params.page) url += '&page='    + params.page;
        return url;
    }

    function popularUrl(params) {
        var url = API_URL + 'popular?' + authParams();
        if (params && params.section !== undefined) url += '&section=' + params.section; // 999=movies, 7=series
        if (params && params.page) url += '&page=' + params.page;
        return url;
    }

    function searchUrl(query) {
        // search parameter is story= (s= silently returns []); requires a token
        return API_URL + 'search?' + authParams() + '&story=' + encodeURIComponent(query);
    }

    function suggestUrl(query) {
        // autocomplete endpoint; no token required per API docs
        return API_URL + 'suggest?' + authParams() + '&word=' + encodeURIComponent(query);
    }

    // ── On-demand Filmix ID lookup helpers ─────────────────────────────────

    // Extract release year from a TMDB card object (0 if unavailable).
    function cardYear(card) {
        var d = (card && (card.first_air_date || card.release_date)) || '';
        return d ? (parseInt(d.split('-')[0], 10) || 0) : 0;
    }

    // Normalize a title for fuzzy comparison: lowercase, collapse whitespace,
    // strip most punctuation.
    function normTitle(t) {
        return String(t || '').toLowerCase()
            .replace(/[^\wа-яёa-z0-9\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Scan a raw Filmix result list for the first item whose (decoded) title
    // matches any of normTitles, with year within ±1.  Returns filmix id or null.
    // Requires year match to prevent false-positive caching.
    function filmixMatchInList(list, normTitles, year) {
        if (!Array.isArray(list)) return null;
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item || !item.id) continue;
            var fxYear = parseInt(item.year || '', 10) || 0;
            // year must match within ±1 if both sides have a year
            if (year && fxYear && Math.abs(fxYear - year) > 1) continue;
            var fxTitles = [
                normTitle(decodeHtml(item.title || '')),
                normTitle(decodeHtml(item.original_title || ''))
            ];
            for (var a = 0; a < normTitles.length; a++) {
                if (!normTitles[a]) continue;
                for (var b = 0; b < fxTitles.length; b++) {
                    if (fxTitles[b] && fxTitles[b] === normTitles[a]) {
                        return String(item.id);
                    }
                }
            }
        }
        return null;
    }

    // Unwrap Filmix API responses that may come as a plain array or
    // wrapped in { results:[], data:[], items:[] }.
    function unwrapList(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        if (data && Array.isArray(data.data))    return data.data;
        if (data && Array.isArray(data.items))   return data.items;
        return [];
    }

    // On-demand lookup: try to find the Filmix ID for a TMDB card by title+year.
    // Strategy:
    //   1. Build title variants from the TMDB card (title, name, original_title,
    //      original_name) and normalise them.
    //   2. Try /suggest?word= for each variant (no token required, fast).
    //   3. If nothing matched, try /search?story= for each variant (token required).
    // A match is accepted only when year is within ±1 (both sides have a year).
    // Successful lookup is cached in filmix_tmdb_links via rememberTmdbFilmix.
    function findFilmixIdByTitle(card, tmdbId, onFound, onNotFound) {
        var year = cardYear(card);

        // Collect unique non-empty normalised title variants from the TMDB card.
        var rawTitles = [
            card.title,
            card.name,
            card.original_title,
            card.original_name
        ];
        var normTitles = [];
        rawTitles.forEach(function (t) {
            var n = normTitle(t);
            if (n && normTitles.indexOf(n) === -1) normTitles.push(n);
        });
        // Also try raw (non-normalised) for the suggest/search query strings.
        var queryTitles = [];
        rawTitles.forEach(function (t) {
            var s = String(t || '').trim();
            if (s && queryTitles.indexOf(s) === -1) queryTitles.push(s);
        });

        if (!queryTitles.length) { onNotFound(); return; }

        var resolved = false;

        function done(filmixId) {
            if (resolved) return;
            resolved = true;
            rememberTmdbFilmix(tmdbId, filmixId);
            onFound(String(filmixId));
        }

        // Phase 2: /search with token (fallback if suggest found nothing).
        function trySearch(idx) {
            if (resolved) return;
            if (idx >= queryTitles.length) { onNotFound(); return; }
            get(searchUrl(queryTitles[idx]), function (data) {
                if (resolved) return;
                var match = filmixMatchInList(unwrapList(data), normTitles, year);
                if (match) { done(match); } else { trySearch(idx + 1); }
            }, function () { trySearch(idx + 1); });
        }

        // Phase 1: /suggest (no token) — try each title variant in sequence.
        function trySuggest(idx) {
            if (resolved) return;
            if (idx >= queryTitles.length) {
                // Suggest exhausted — fall back to /search if token is present.
                if (token()) { trySearch(0); } else { onNotFound(); }
                return;
            }
            get(suggestUrl(queryTitles[idx]), function (data) {
                if (resolved) return;
                var match = filmixMatchInList(unwrapList(data), normTitles, year);
                if (match) { done(match); } else { trySuggest(idx + 1); }
            }, function () { trySuggest(idx + 1); });
        }

        trySuggest(0);
    }

    function postUrl(id)   { return API_URL + 'post/'   + id + '?' + authParams(); }
    function commentsUrl(id) { return API_URL + 'comments/' + id + '?' + authParams(); }
    function personUrl(id) { return API_URL + 'person/' + id + '?' + authParams(); }
    function tokenRequestUrl() { return API_URL + 'token_request?' + authParams(); }
    // Device authorization check: user_profile with the candidate token (code).
    // Until the device is confirmed on the site it returns {}. After that — {user_data:{...}}.
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
    // TMDB card enrichment (Variant A)
    // The catalog stays Filmix, but the full card is enriched with TMDB
    // data: poster/backdrop/overview/rating + imdb_id (needed by online_mod
    // to match and launch the player). Requests go through the Lampa proxy,
    // falling back to api.themoviedb.org directly.
    // ─────────────────────────────────────────────────────────────
    function tmdbEnabled() {
        return settingEnabled('filmix_tmdb_cards', true);
    }

    function settingEnabled(name, def) {
        var v = Lampa.Storage.field(name);
        if (v === undefined || v === null || v === '') return !!def;
        if (typeof v === 'string') {
            var s = v.toLowerCase();
            if (s === 'false' || s === '0' || s === 'off' || s === 'no') return false;
            if (s === 'true' || s === '1' || s === 'on' || s === 'yes') return true;
        }
        return !!v;
    }

    // Show quality label on cards in lanes/lists (enabled by default)
    function qualityLabelEnabled() {
        return settingEnabled('filmix_quality_label', true);
    }

    // Show the "S<season>E<episode>" badge on series posters (enabled by default)
    function episodeLabelEnabled() {
        return settingEnabled('filmix_episode_label', true);
    }

    // Redirect mode: open the native TMDB card on click (enabled by default)
    function tmdbRedirect() {
        return settingEnabled('filmix_tmdb_redirect', true);
    }

    // Show "Foreign" collection lanes (enabled by default)
    function foreignEnabled() {
        return settingEnabled('filmix_foreign', true);
    }

    // Show "Russian" collection lanes (enabled by default)
    function russianEnabled() {
        return settingEnabled('filmix_russian', true);
    }

    // Show "Now watching" lanes on home/category pages (enabled by default)
    function nowWatchingEnabled() {
        return settingEnabled('filmix_now_lanes', true);
    }

    // Show Filmix comments button on full card (enabled by default)
    function commentsButtonEnabled() {
        return settingEnabled('filmix_comments_button_enabled', true);
    }

    function tmdbKey() {
        try { return (Lampa.TMDB && Lampa.TMDB.key) ? Lampa.TMDB.key() : ''; }
        catch (e) { return ''; }
    }

    // TMDB request: try the Lampa proxy first, then on error OR invalid response
    // fall back to api.themoviedb.org directly. valid(data) is an optional check
    // that the response contains the required data (the proxy sometimes strips
    // append_to_response).
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

    // Pick the best match: exact original-title match → year match → first result
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
        if (det.poster_path)   movie.poster_path   = det.poster_path;   // TMDB poster
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

    // TMDB result → Lampa card (source:'tmdb', opens as a native TMDB card)
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

    // TMDB credits → {cast, crew} with photos (profile_path)
    // Lampa's person click (router.add('actor', ...)) reads data.id + data.source
    // straight off this object — falling back to the *global* default source
    // when source is missing, which opens the wrong person. Always stamp 'tmdb'.
    function tmdbPersons(det, serial) {
        var credits = (det && det.credits) || {};
        var cast = (credits.cast || []).map(function (c) {
            return { id: c.id, source: 'tmdb', name: c.name, character: c.character || '', profile_path: c.profile_path || '', url: '' };
        });
        var crew = (credits.crew || []).map(function (c) {
            return { id: c.id, source: 'tmdb', name: c.name, job: c.job || '', profile_path: c.profile_path || '', url: '' };
        });
        // series often have no directors in crew — use the creators instead
        if (serial && det && det.created_by) {
            det.created_by.forEach(function (p) {
                crew.unshift({ id: p.id, source: 'tmdb', name: p.name, job: 'Creator', profile_path: p.profile_path || '', url: '' });
            });
        }
        return { cast: cast, crew: crew };
    }

    // Enrich movie and pass the full TMDB object (or null) to done(detail)
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
                function (d)   { return d && d.credits; }   // response must contain the append sections
            );
        }

        // 1) search with a year filter; 2) if nothing found — retry without the year
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

    // Lightweight TMDB id lookup by title+year (for redirect mode).
    // done(id|null). serial → search in tv, otherwise in movie.
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

    // Run async tasks with a concurrency limit; call done() when all finish.
    // Each task is function(finish) and must call finish() exactly once.
    function runLimited(tasks, limit, done) {
        var total = tasks.length, i = 0, active = 0, finished = 0;
        if (!total) { done(); return; }
        function pump() {
            while (active < limit && i < total) {
                var task = tasks[i++];
                active++;
                task(function () {
                    active--; finished++;
                    if (finished === total) done();
                    else pump();
                });
            }
        }
        pump();
    }

    // Cache of TMDB metadata by title+year (null = no match). Keeps lane/list
    // enrichment cheap on re-scroll and gives the redirect an instant tmdb_id.
    // Persisted to Lampa.Storage with a 7-day TTL so it survives reloads.
    var CACHE_KEY = 'filmix_tmdb_cache';
    var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days, ms
    var CACHE_MAX = 3000;                       // soft cap on stored entries
    var _tmdbMeta = {};                         // key -> { m: meta|null, ts: time }
    var _saveTimer = null;

    function nowMs() { return Date.now(); }
    function metaKey(title, year, serial) {
        return (serial ? 'tv:' : 'mv:') + (title || '').toLowerCase().trim() + '|' + (year || '');
    }

    // Load cache from Storage, dropping entries older than the TTL.
    function loadMetaCache() {
        try {
            var stored = Lampa.Storage.get(CACHE_KEY, {});
            if (!stored || typeof stored !== 'object') return;
            var t = nowMs(), keep = {};
            Object.keys(stored).forEach(function (k) {
                var e = stored[k];
                if (e && typeof e.ts === 'number' && (t - e.ts) < CACHE_TTL) keep[k] = e;
            });
            _tmdbMeta = keep;
        } catch (e) {}
    }

    function saveMetaCache() {
        try {
            var keys = Object.keys(_tmdbMeta);
            if (keys.length > CACHE_MAX) {
                // keep the freshest CACHE_MAX entries
                keys.sort(function (a, b) { return _tmdbMeta[b].ts - _tmdbMeta[a].ts; });
                var trimmed = {};
                keys.slice(0, CACHE_MAX).forEach(function (k) { trimmed[k] = _tmdbMeta[k]; });
                _tmdbMeta = trimmed;
            }
            Lampa.Storage.set(CACHE_KEY, _tmdbMeta);
        } catch (e) {}
    }

    // Debounced persist (avoid hammering Storage during a burst of lookups).
    function scheduleSave() {
        if (_saveTimer) return;
        _saveTimer = setTimeout(function () { _saveTimer = null; saveMetaCache(); }, 2000);
    }

    // Find {vote_average, poster_path, backdrop_path, tmdb_id} for a card title.
    function tmdbFindMeta(title, year, serial, cb) {
        var key = metaKey(title, year, serial);
        var hit = _tmdbMeta[key];
        if (hit && (nowMs() - hit.ts) < CACHE_TTL) { cb(hit.m); return; }
        var k = tmdbKey();
        if (!title || !k || !Lampa.TMDB || !Lampa.TMDB.api) { cb(null); return; }

        var type   = serial ? 'tv' : 'movie';
        var yparam = serial ? 'first_air_date_year' : 'primary_release_year';
        var base   = 'search/' + type + '?api_key=' + k + '&language=ru&query=' + encodeURIComponent(title);

        function fromResults(data) {
            var m = pickTmdbMatch(data && data.results, title, year, serial);
            return m ? {
                vote_average:  m.vote_average  || 0,
                poster_path:   m.poster_path   || '',
                backdrop_path: m.backdrop_path || '',
                tmdb_id:       m.id,
            } : null;
        }
        function finish(meta) { _tmdbMeta[key] = { m: meta, ts: nowMs() }; scheduleSave(); cb(meta); }

        tmdbGet(base + (year ? ('&' + yparam + '=' + year) : ''), function (data) {
            var meta = fromResults(data);
            if (meta) { finish(meta); return; }
            if (!year) { finish(null); return; }
            tmdbGet(base, function (d2) { finish(fromResults(d2)); }, function () { finish(null); },
                function (d) { return d && d.results; });
        }, function () { finish(null); }, function (d) { return d && d.results; });
    }

    // Enrich a list of cards with TMDB rating/poster/backdrop/tmdb_id, then done().
    // No-op (instant) when TMDB cards are disabled.
    function enrichCards(cards, done) {
        if (!tmdbEnabled() || !cards || !cards.length) { done(); return; }
        var tasks = cards.map(function (card) {
            return function (finish) {
                var serial = isCardSerial(card);
                var title  = serial
                    ? (card.filmix_original_name || card.original_name || card.name)
                    : (card.original_title || card.title);
                var year   = ((serial ? card.first_air_date : card.release_date) || '').slice(0, 4);
                tmdbFindMeta(title, year, serial, function (meta) {
                    if (meta) {
                        if (meta.vote_average)  card.vote_average  = meta.vote_average;
                        if (meta.poster_path)   card.poster_path   = meta.poster_path;
                        if (meta.backdrop_path) card.backdrop_path = meta.backdrop_path;
                        if (meta.tmdb_id)       card.tmdb_id       = meta.tmdb_id;
                    }
                    finish();
                });
            };
        });
        runLimited(tasks, 8, done);
    }

    // ─────────────────────────────────────────────────────────────
    // Card normalization: Filmix API → Lampa card
    // ─────────────────────────────────────────────────────────────

    // API sections: 0=movie, 7=series, 14=cartoon movies, 93=anime.
    // Section 14 holds full-length cartoons only (cartoon series live in
    // section 15, which the plugin does not use) — treat them as movies.
    function isSerial(section) {
        return section === 7 || section === 93;
    }

    // Replaces w140/w220 → w400 in the poster URL (larger image)
    function posterLarge(url) {
        if (!url) return '';
        return url.replace('/w140/', '/w400/').replace('/w220/', '/w400/');
    }

    // Filmix returns titles with HTML entities ("33 d&#237;as"). Decode them,
    // otherwise the TMDB search finds no match and the redirect does not fire.
    function decodeHtml(s) {
        if (!s) return s;
        return String(s)
            .replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
            .replace(/&#(\d+);/g,          function (_, n) { return String.fromCodePoint(parseInt(n, 10)); })
            .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
            .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
            .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
            .replace(/&amp;/g, '&');   // decode &amp; last to avoid double-decoding
    }

    // Filmix returns full poster URLs. Lampa.Api.img always prepends the TMDB
    // base, so we do NOT set poster_path; we put the full URL into poster/img.
    function compactQualityLabel(value) {
        var q = String(value || '');
        var m = q.match(/\b(\d{3,4})\b/);
        return m ? m[1] : '';
    }

    // Formats the latest released episode as "S<season>E<episode>" for the
    // lane poster badge. item.last_episode.episode is often a translated
    // range ("5-9") — use the highest (most recently released) number.
    function episodeLabel(lastEpisode) {
        if (!lastEpisode) return '';
        var season = parseInt(lastEpisode.season, 10);
        var epStr  = String(lastEpisode.episode || '');
        var nums   = epStr.match(/\d+/g);
        if (!season || !nums || !nums.length) return '';
        var episode = Math.max.apply(null, nums.map(Number));
        return 'S' + season + 'E' + episode;
    }

    function convertCard(item) {
        if (!item) return null;

        var serial  = isSerial(item.section);
        var year    = item.year ? String(item.year) : '';
        var poster  = posterLarge(item.poster);
        var t_title = decodeHtml(item.title || '');
        var t_orig  = decodeHtml(item.original_title || '');
        var genres  = (item.categories || []).map(function (name) { return { name: name }; });
        var rating  = parseFloat(item.kp_rating) || parseFloat(item.imdb_rating) || 0;

        var card = {
            id:        item.id,
            filmix_id: item.id,
            alt_name:  item.alt_name || '',
            source:    SOURCE_NAME,          // critical: otherwise clicks route to tmdb

            overview:  decodeHtml(item.short_story || ''),
            genres:    genres,
            vote_average: rating,
            vote_count:   parseInt(item.kp_votes, 10) || 0,
            kp_rating:    parseFloat(item.kp_rating)   || 0,
            imdb_rating:  parseFloat(item.imdb_rating) || 0,
            quality:      qualityLabelEnabled() ? compactQualityLabel(item.quality || item.rip || '') : '',

            // poster: full URL — store in poster/img (not poster_path)
            poster: poster,
            img:    poster,

            production_countries: (item.countries || []).map(function (c) { return { name: c }; }),
            production_companies: [],   // Lampa reads .length without a guard
        };

        // Lampa.Favorite.add() strips custom fields (incl. .genres) when saving
        // "continue watching" history, but keeps .genre_ids — set it for cartoons
        // so continueCardsForCat() can still recognize them after a re-read.
        if (item.section === 14) card.genre_ids = [16];

        // method is computed by Lampa as original_name ? 'tv' : 'movie'
        if (serial) {
            card.filmix_is_serial   = true;
            card.filmix_original_name = t_orig || t_title;
            card.name           = t_title || t_orig;
            // Lampa does not render quality marks for cards with original_name,
            // so keep the value in filmix_original_name and leave original_name empty.
            card.original_name  = '';
            // also set title: the full card renderer reads card.title.length
            // without a guard (does not affect tv/movie — that is by original_name)
            card.title          = t_title || t_orig;
            card.first_air_date = year ? year + '-01-01' : '';
            card.number_of_seasons = 1;
            card.filmix_episode_label = episodeLabelEnabled() ? episodeLabel(item.last_episode) : '';
        } else {
            card.title          = t_title || t_orig;
            card.original_title = t_orig  || t_title;
            card.release_date   = year ? year + '-01-01' : '';
        }

        return card;
    }

    // ─────────────────────────────────────────────────────────────
    // player_links.playlist → Lampa season/episode structures
    // ─────────────────────────────────────────────────────────────

    // Returns { episodes:[...], seasons_count } for the requested season.
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
                    name:           L('filmix_episode') + ' ' + epNum,
                    overview:       '',
                    air_date:       '',
                    still_path:     '',
                    // non-standard fields for a custom player / debugging
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
    // Category parameter parsing
    // cat may arrive as: params.genres ('s0'), or in the URL as ?cat=s0
    // ─────────────────────────────────────────────────────────────
    // url='tv'/'movie' (theme pages) → Filmix section
    function urlToCat(url) {
        if (url === 'tv')    return 's7';
        if (url === 'movie') return 's0';
        return null;
    }

    // Normalizes category tokens that may come from Lampa query params.
    // TMDB genre 16 corresponds to the cartoons section in Filmix (s14).
    function normalizeCat(cat) {
        var v = String(cat || '').trim();
        if (!v) return 's0';
        if (v === '16') return 's14';
        if (/^s\d+$/i.test(v)) return 's' + v.slice(1);
        if (/^\d+$/.test(v)) return 's' + v;
        return v;
    }

    function parseCat(params) {
        var cat  = 's0';
        var sort = 'date';
        var hasExplicitCat = false;

        if (params.genres !== undefined && params.genres !== null && params.genres !== '') {
            cat = normalizeCat(params.genres);
            hasExplicitCat = true;
        }
        if (params.sort)   sort = params.sort;

        var url = params.url || '';

        // direct mapping of theme pages (url=tv / url=movie)
        var mapped = urlToCat(url);
        if (mapped && !hasExplicitCat) cat = mapped;

        var catM  = url.match(/[?&](?:cat|filter)=([^&]+)/);
        var sortM = url.match(/[?&]sort=([^&]+)/);
        if (catM)  cat  = normalizeCat(decodeURIComponent(catM[1]));
        if (sortM) sort = sortM[1];

        cat = normalizeCat(cat);

        return { cat: cat, sort: sort };
    }

    function catTitle(cat) {
        return ({
            s0:  L('filmix_cat_movies'),
            s7:  L('filmix_cat_series'),
            s14: L('filmix_cat_cartoons'),
            s93: L('filmix_cat_anime'),
        })[cat] || L('filmix_cat_default');
    }

    // Activity url for a lane's "more" → category_full → list().
    // filter=/sort= are parsed authoritatively by parseCat().
    function laneUrl(cat, sort) {
        return SOURCE_NAME + '?filter=' + cat + '&sort=' + sort;
    }

    // "Continue watching" lane from Lampa history.
    // type: null = all types (home); 'movie' | 'tv' | 'anime' = filtered (category).
    // Lampa.Favorite.continues() already drops fully-viewed/thrown and filters by type.
    function continueCards(type) {
        if (!Lampa.Favorite) return [];
        try {
            if (type) return Lampa.Favorite.continues(type) || [];
            // all types: history minus fully-viewed / thrown
            var hist   = Lampa.Favorite.get({ type: 'history' }) || [];
            var viewed = Lampa.Favorite.get({ type: 'viewed' })  || [];
            var thrown = Lampa.Favorite.get({ type: 'thrown' })  || [];
            return hist.filter(function (e) {
                return !viewed.some(function (v) { return v.id == e.id; })
                    && !thrown.some(function (t) { return t.id == e.id; });
            }).slice(0, 19);
        } catch (e) { return []; }
    }

    function cardHasGenre16(card) {
        if (!card) return false;

        var ids = card.genre_ids;
        if (Array.isArray(ids)) {
            for (var i = 0; i < ids.length; i++) {
                if (String(ids[i]) === '16') return true;
            }
        }

        var genres = card.genres;
        if (Array.isArray(genres)) {
            for (var j = 0; j < genres.length; j++) {
                var g = genres[j];
                if (g && typeof g === 'object' && String(g.id) === '16') return true;
                if (String(g) === '16') return true;
            }
        }

        return false;
    }

    function isCartoonHistoryCard(card) {
        if (cardHasGenre16(card)) return true;

        var genres = card && card.genres;
        if (!Array.isArray(genres)) return false;

        for (var i = 0; i < genres.length; i++) {
            var g = genres[i];
            var name = '';
            if (g && typeof g === 'object') name = g.name || '';
            else name = String(g || '');
            if (/(animation|cartoon|animated|анимац|мульт)/i.test(name)) return true;
        }

        return false;
    }

    function isCardSerial(card) {
        return !!(card && (card.filmix_is_serial || card.original_name));
    }

    // Maps a Filmix catalog section to the Favorite.continues() type.
    // s14 cards are movies (see isSerial), so their history lands in 'movie'.
    function catToContinueType(cat) {
        if (cat === 's0' || cat === 's14') return 'movie';
        if (cat === 's93') return 'anime';
        return 'tv';   // s7
    }

    // Lampa.Favorite.add() (called internally on playback start) keeps only a
    // fixed field whitelist — .genre_ids survives, .genres does not. A native
    // TMDB full-card object only ever has .genres, so by the time we read a
    // history/continues entry back, cartoon-genre membership is usually gone.
    // Resolve it with a cached TMDB lookup by id when the card itself is silent.
    function cartoonGenreCacheKey(id, serial) {
        return 'gid:' + (serial ? 'tv' : 'mv') + ':' + id;
    }

    function resolveIsCartoon(card, cb) {
        if (isCartoonHistoryCard(card)) { cb(true); return; }
        // genre data present but didn't match → trust it, no need to look up.
        if ((Array.isArray(card.genre_ids) && card.genre_ids.length) ||
            (Array.isArray(card.genres)    && card.genres.length)) { cb(false); return; }
        if (!card || !card.id) { cb(false); return; }

        var serial = isCardSerial(card) || !!card.name;
        var key    = cartoonGenreCacheKey(card.id, serial);
        var hit    = _tmdbMeta[key];
        if (hit && (nowMs() - hit.ts) < CACHE_TTL) { cb(!!hit.m); return; }

        var k = tmdbKey();
        if (!k || !Lampa.TMDB || !Lampa.TMDB.api) { cb(false); return; }

        tmdbGet((serial ? 'tv/' : 'movie/') + card.id + '?api_key=' + k + '&language=ru',
            function (d) {
                var isCartoon = !!(d && Array.isArray(d.genres) &&
                    d.genres.some(function (g) { return String(g && g.id) === '16'; }));
                _tmdbMeta[key] = { m: isCartoon, ts: nowMs() };
                scheduleSave();
                cb(isCartoon);
            },
            function () { cb(false); },
            function (d) { return d && d.id; }
        );
    }

    // "Continue watching" row for a category page: s14 shows only cartoons,
    // s0/s7 show everything except cartoons (cartoons get their own s14 row).
    function continueCardsForCat(cat, cb) {
        var cards = continueCards(catToContinueType(cat));
        if (!cards.length) { cb(cards); return; }

        var tasks = cards.map(function (card) {
            return function (finish) {
                resolveIsCartoon(card, function (isCartoon) {
                    card.__filmix_is_cartoon = isCartoon;
                    finish();
                });
            };
        });
        runLimited(tasks, 8, function () {
            var out = cards.filter(function (c) {
                return cat === 's14' ? c.__filmix_is_cartoon : !c.__filmix_is_cartoon;
            });
            cb(out.slice(0, 19));
        });
    }

    function cleanCommentText(s) {
        if (!s) return '';
        return decodeHtml(String(s || ''))
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\r/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function commentUser(item) {
        var user = item.gast_name || item.user || item.author || item.login || item.name || item.username || '';
        if (user && typeof user === 'object') user = user.name || user.login || user.username || '';
        return String(user || '');
    }

    function commentDate(item) {
        return String(item.date || item.created_at || item.created || item.time || '');
    }

    function commentText(item) {
        return cleanCommentText(item.text || item.comment || item.message || item.body || item.content || '');
    }

    function commentId(item) {
        var id = item.id || item.comment_id || item.cid || item._id || '';
        return String(id || '');
    }

    function commentParentId(item) {
        var pid = item.parent_id;
        if (pid === undefined || pid === null || pid === '') pid = item.parent;
        if (pid === undefined || pid === null || pid === '') pid = item.reply_to;
        if (pid === undefined || pid === null || pid === '') pid = item.answer_id;
        return String(pid || '');
    }

    function hasCommentPayload(item) {
        if (!item || typeof item !== 'object') return false;
        return !!(item.text || item.comment || item.message || item.body || item.content);
    }

    function collectCommentObjects(node, out) {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach(function (x) { collectCommentObjects(x, out); });
            return;
        }
        if (typeof node !== 'object') return;
        if (hasCommentPayload(node)) out.push(node);
        Object.keys(node).forEach(function (k) {
            var v = node[k];
            if (Array.isArray(v) || (v && typeof v === 'object')) collectCommentObjects(v, out);
        });
    }

    function extractCommentsTree(data) {
        var raw = [];
        var seen = {};
        var nodes = [];
        var byId = {};

        collectCommentObjects(data, raw);
        raw.forEach(function (item) {
            var text = commentText(item);
            if (!text) return;
            var id = commentId(item);
            var pid = commentParentId(item);
            var sig = [id, pid, commentUser(item), commentDate(item), text].join('|');
            if (seen[sig]) return;
            seen[sig] = 1;
            nodes.push({
                id: id,
                parent_id: pid,
                user: commentUser(item),
                date: commentDate(item),
                text: text,
                replies: [],
            });
        });

        nodes.forEach(function (n) {
            if (n.id) byId[n.id] = n;
        });

        var roots = [];
        nodes.forEach(function (n) {
            if (n.parent_id && byId[n.parent_id] && byId[n.parent_id] !== n) {
                byId[n.parent_id].replies.push(n);
            } else {
                roots.push(n);
            }
        });

        return roots;
    }

    function ensureCommentsPopupStyles() {
        if (document.getElementById('filmix-comments-popup-style')) return;
        // Only comment-item CSS; Modal provides the container, header, scroll and
        // keyboard/remote navigation out of the box.
        var css = '' +
            '.filmix-comments-popup__item{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;margin-top:10px;}' +
            '.filmix-comments-popup__meta{opacity:.78;font-size:18px;margin-bottom:8px;}' +
            '.filmix-comments-popup__text{font-size:21px;line-height:1.35;white-space:pre-wrap;word-break:break-word;}' +
            '.filmix-comments-popup__item--d1{margin-left:18px;}' +
            '.filmix-comments-popup__item--d2{margin-left:36px;}' +
            '.filmix-comments-popup__item--d3{margin-left:54px;}' +
            '.filmix-comments-popup__item--d4{margin-left:72px;}' +
            '.filmix-comments-popup__empty{font-size:24px;opacity:.8;padding:26px 2px;}';
        var style = document.createElement('style');
        style.id = 'filmix-comments-popup-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function ensureCommentsButtonStyles() {
        if (document.getElementById('filmix-comments-button-style')) return;
        // Use a fresh class name so Lampa's own CSS for full-start__text cannot conflict.
        var css = '' +
            '.button--filmix-comments .full-start__filmix-label{max-width:0;opacity:0;overflow:hidden;white-space:nowrap;' +
            'transition:max-width .18s ease,opacity .18s ease,margin-left .18s ease;margin-left:0;}' +
            '.button--filmix-comments.selected .full-start__filmix-label,' +
            '.button--filmix-comments:hover .full-start__filmix-label,' +
            '.button--filmix-comments:focus .full-start__filmix-label,' +
            '.button--filmix-comments.focus .full-start__filmix-label{max-width:300px;opacity:1;margin-left:6px;}';
        var style = document.createElement('style');
        style.id = 'filmix-comments-button-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderCommentTreeHtml(tree, depth) {
        if (!tree || !tree.length) return '';
        var html = '';
        tree.forEach(function (c) {
            var lvl = Math.min(depth, 4);
            var head = escapeHtml(c.user || 'Filmix');
            if (c.date) head += ' [' + escapeHtml(c.date) + ']';
            html +=
                '<div class="filmix-comments-popup__item filmix-comments-popup__item--d' + lvl + '">' +
                    '<div class="filmix-comments-popup__meta">' + head + '</div>' +
                    '<div class="filmix-comments-popup__text">' + escapeHtml(c.text || '') + '</div>' +
                '</div>';
            if (c.replies && c.replies.length) html += renderCommentTreeHtml(c.replies, depth + 1);
        });
        return html;
    }

    function closeFilmixCommentsModal() {
        try { Lampa.Modal.close(); } catch (ex) {}
    }

    function openFilmixCommentsModal(title, tree) {
        ensureCommentsPopupStyles();

        // Save the currently active controller so we can restore it on close.
        var prevCtrlName = null;
        try {
            var _prev = Lampa.Controller.enabled();
            if (_prev && _prev.name) prevCtrlName = _prev.name;
        } catch (ex) {}

        var content = document.createElement('div');
        content.innerHTML = (tree && tree.length)
            ? renderCommentTreeHtml(tree, 0)
            : '<div class="filmix-comments-popup__empty">' + escapeHtml(L('filmix_noty_comments_empty')) + '</div>';

        // Lampa.Modal provides: container, title bar, Lampa.Scroll (keyboard +
        // remote scroll), Controller context 'modal', Back button, click-outside
        // to close, swipe-down to close, and CSS animations.
        Lampa.Modal.open({
            title: L('filmix_comments_filmix') + (title ? ': ' + title : ''),
            html: $(content),
            size: 'large',
            onBack: function () {
                Lampa.Modal.close();
                try { if (prevCtrlName) Lampa.Controller.toggle(prevCtrlName); } catch (ex) {}
            }
        });
    }

    // filmixId  – resolved id, or null/0 when opened from history (no filmix link)
    // title     – display title for the modal header
    // card      – TMDB card object (optional, used for on-demand ID lookup)
    // tmdbId    – TMDB id of the card (optional, used to persist the lookup)
    function showFilmixCommentsPopup(filmixId, title, card, tmdbId) {
        function loadComments(fxId) {
            Lampa.Noty.show(L('filmix_noty_comments_loading'));
            get(commentsUrl(fxId), function (data) {
                var commentsTree = extractCommentsTree(data);
                openFilmixCommentsModal(title, commentsTree);
            }, function () {
                Lampa.Noty.show(L('filmix_noty_comments_error'));
            });
        }

        if (filmixId) {
            loadComments(filmixId);
            return;
        }

        // No pre-resolved ID — attempt on-demand lookup if we have a card.
        if (card && tmdbId) {
            Lampa.Noty.show(L('filmix_noty_comments_searching'));
            findFilmixIdByTitle(card, tmdbId, function (fxId) {
                loadComments(fxId);
            }, function () {
                Lampa.Noty.show(L('filmix_noty_comments_missing'));
            });
            return;
        }

        Lampa.Noty.show(L('filmix_noty_comments_missing'));
    }

    function getQueryParam(name) {
        try {
            var m = new RegExp('(?:[?&])' + name + '=([^&]+)').exec(window.location.search || '');
            return m ? decodeURIComponent(m[1]) : '';
        } catch (e) {
            return '';
        }
    }

    function rememberTmdbFilmix(tmdbId, filmixId) {
        if (!tmdbId || !filmixId) return;
        try {
            var map = Lampa.Storage.get('filmix_tmdb_links', {}) || {};
            map[String(tmdbId)] = String(filmixId);
            // soft cap: keep latest 1000 mappings
            var keys = Object.keys(map);
            if (keys.length > 1000) {
                var trimmed = {};
                keys.slice(keys.length - 1000).forEach(function (k) { trimmed[k] = map[k]; });
                map = trimmed;
            }
            Lampa.Storage.set('filmix_tmdb_links', map);
        } catch (e) {}
    }

    function resolveFilmixIdForTmdb(tmdbId) {
        if (!tmdbId) return '';
        try {
            var map = Lampa.Storage.get('filmix_tmdb_links', {}) || {};
            return map[String(tmdbId)] || '';
        } catch (e) {
            return '';
        }
    }

    function tryInjectCommentsButton() {
        var act = (Lampa.Activity && Lampa.Activity.active) ? Lampa.Activity.active() : null;
        if (!act || act.component !== 'full') return;

        var card = act.card || {};
        var source = card.source || act.source || getQueryParam('source') || '';
        var sl = String(source).toLowerCase();
        if (sl !== 'tmdb' && sl !== SOURCE_NAME) return;

        var tmdbId = card.id || getQueryParam('card') || '';
        var filmixId = card.filmix_id || getQueryParam('filmix_id') || '';
        if (!filmixId && sl === SOURCE_NAME && card.id) filmixId = card.id;
        if (!filmixId && sl === 'tmdb') filmixId = resolveFilmixIdForTmdb(tmdbId);
        if (!filmixId) {
            var urlSource = getQueryParam('source');
            var urlCard = getQueryParam('card');
            if ((urlSource === SOURCE_NAME || urlSource === 'filmix') && /^\d+$/.test(urlCard || '')) {
                filmixId = parseInt(urlCard, 10);
            }
        }

        var bar = document.querySelector('.full-start-new__buttons');
        if (!bar) return;

        var oldBtn = bar.querySelector('.button--filmix-comments');
        if (!commentsButtonEnabled()) {
            if (oldBtn && oldBtn.parentNode) oldBtn.parentNode.removeChild(oldBtn);
            return;
        }
        if (oldBtn) return;

        ensureCommentsButtonStyles();

        var btn = document.createElement('div');
        btn.className = 'full-start__button selector button--filmix-comments';
        btn.setAttribute('title', L('filmix_comments_filmix'));
        btn.setAttribute('aria-label', L('filmix_comments_filmix'));
        // Inline label — our own class, no conflict with Lampa's full-start__text CSS.
        btn.innerHTML =
            '<div class="full-start__icon">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M4 5h16v10H8l-4 4V5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
            '<path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
            '</svg>' +
            '</div>' +
            '<div class="full-start__filmix-label">' + escapeHtml(L('filmix_comments_button')) + '</div>';

        var opening = false;
        function activateComments(e) {
            if (e) {
                var key = e.key || '';
                if (e.type === 'keydown' || e.type === 'keyup') {
                    if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar' && key !== 'OK') return;
                }
                e.preventDefault && e.preventDefault();
                e.stopPropagation && e.stopPropagation();
                e.stopImmediatePropagation && e.stopImmediatePropagation();
            }
            if (opening) return;
            opening = true;
            showFilmixCommentsPopup(filmixId, card.title || card.name || '', card, tmdbId);
            setTimeout(function () { opening = false; }, 300);
        }

        btn.addEventListener('click', activateComments);
        btn.addEventListener('keydown', activateComments);
        btn.addEventListener('hover:enter', activateComments);
        btn.addEventListener('hover:click', activateComments);

        bar.appendChild(btn);
    }

    function startCommentsButtonWatcher() {
        if (window.filmix_comments_watcher_started) return;
        window.filmix_comments_watcher_started = true;

        // Standard Lampa hook: fired by Lampa itself when the full card is done.
        // 'complite' has e.body (jQuery DOM), e.props, e.data, e.object.
        // We still use tryInjectCommentsButton so filmix_id resolution stays in one place.
        try {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite' || e.type === 'start') {
                    // Toggle fires right after 'complite'; defer one tick so the
                    // controller and DOM settle before we append the button.
                    setTimeout(tryInjectCommentsButton, 0);
                }
            });
        } catch (ex) {}

        // Minimal fallback interval for tab-switch re-renders that don't fire
        // a new 'full' event (Lampa reuses the existing component instance).
        setInterval(tryInjectCommentsButton, 3000);
    }

    // Injects "S<season>E<episode>" onto series poster cards, directly under
    // the quality label. Lampa's card template has no such badge, so we hook
    // the 'line' event (fired on every lane/list render) and append a custom
    // element into '.card__view' for our own (source === filmix) serial cards.
    var EPISODE_BADGE_CSS =
        '.filmix-episode-badge{position:absolute;left:-0.8em;bottom:1em;' +
        'padding:0.4em;background:rgba(0,0,0,.6);color:#fff;font-size:0.8em;' +
        'border-radius:0.3em;z-index:1;}';

    function injectEpisodeBadgeStyle() {
        if (document.getElementById('filmix-episode-badge-style')) return;
        var style = document.createElement('style');
        style.id = 'filmix-episode-badge-style';
        style.textContent = EPISODE_BADGE_CSS;
        document.head.appendChild(style);
    }

    function addEpisodeBadge(item) {
        var data = item && item.data;
        if (!data || data.source !== SOURCE_NAME || !data.filmix_episode_label) return;
        var $el = item.render && item.render();
        var el  = $el && $el[0];
        if (!el || el.querySelector('.filmix-episode-badge')) return;
        var view = el.querySelector('.card__view');
        if (!view) return;
        var badge = document.createElement('div');
        badge.className   = 'filmix-episode-badge';
        badge.textContent = data.filmix_episode_label;
        view.appendChild(badge);
    }

    function startEpisodeBadgeWatcher() {
        if (window.filmix_episode_badge_watcher_started) return;
        window.filmix_episode_badge_watcher_started = true;

        injectEpisodeBadgeStyle();

        try {
            Lampa.Listener.follow('line', function (e) {
                if (e.type !== 'append') return;
                (e.items || []).forEach(addEpisodeBadge);
            });
        } catch (ex) {}
    }

    // Lampa's person click (router.add('actor', ...)) reads id + source
    // straight off the clicked cast/crew object, falling back to the *global*
    // default source (Storage.field('source')) only when it's missing. Native
    // TMDB credits are raw TMDB API objects and never carry a .source field,
    // so on any install where the default source isn't 'tmdb' — e.g. a user
    // who set Filmix as their default browsing source — every actor/director
    // click on a native TMDB full card resolves against the wrong provider
    // and opens an unrelated person (same numeric id, different database).
    // Stamp .source on the persons.cast/crew objects (mutated in place, the
    // same references Lampa's Persons component reads when binding clicks)
    // as soon as they're available, before that binding happens.
    function fixFullPersonsSource(e) {
        try {
            var data = e && e.data;
            var movieSource = data && data.movie && data.movie.source;
            if (!movieSource || !data.persons) return;
            ['cast', 'crew'].forEach(function (key) {
                (data.persons[key] || []).forEach(function (p) {
                    if (p && !p.source) p.source = movieSource;
                });
            });
        } catch (ex) {}
    }

    function startPersonSourceFixWatcher() {
        if (window.filmix_person_source_fix_started) return;
        window.filmix_person_source_fix_started = true;

        try {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'start') fixFullPersonsSource(e);
            });
        } catch (ex) {}
    }

    // The home title is built by a custom-home plugin as "Главная - filmix"
    // (lowercase source key), unlike core sections which uppercase it. Normalize
    // the visible header (and activity title) to the uppercase source name.
    function fixHomeTitle() {
        try {
            var up = SOURCE_TITLE.toUpperCase();              // FILMIX
            var re = new RegExp('\\b' + SOURCE_NAME + '\\b', 'ig');
            var act = Lampa.Activity.active && Lampa.Activity.active();
            if (act && typeof act.title === 'string') act.title = act.title.replace(re, up);
            var el = document.querySelector('.head__title');
            if (el && new RegExp('\\b' + SOURCE_NAME + '\\b', 'i').test(el.textContent)) {
                el.textContent = el.textContent.replace(re, up);
            }
        } catch (e) {}
    }

    // ─────────────────────────────────────────────────────────────
    // Source object
    // Lampa contract: methods receive (params, oncomplite, onerror)
    // ─────────────────────────────────────────────────────────────
    var Source = {
        SOURCE_NAME:  SOURCE_NAME,
        SOURCE_TITLE: SOURCE_TITLE,

        // ── Home screen: array of rows [{title, results:[...]}] ──
        main: function (params, oncomplite, onerror) {
            fixHomeTitle();
            setTimeout(fixHomeTitle, 0);   // also after the header finishes rendering

            var nw = L('filmix_lane_new'), tp = L('filmix_lane_top');
            var rows = [
                { title: nw + ' ' + catTitle('s0').toLowerCase(), cat: 's0',  sort: 'date',   genres: 's0'  },
                { title: L('filmix_lane_new_episodes'),           cat: 's7',  sort: 'date',   genres: 's7'  },
                { title: tp + ' ' + catTitle('s0').toLowerCase(), cat: 's0',  sort: 'rating', genres: 's0'  },
                { title: tp + ' ' + catTitle('s7').toLowerCase(), cat: 's7',  sort: 'rating', genres: 's7'  },
                { title: catTitle('s14'),                         cat: 's14', sort: 'date',   genres: 's14' },
                { title: catTitle('s93'),                         cat: 's93', sort: 'date',   genres: 's93' },
            ];

            // Place "Now watching" lanes under "New series episodes".
            if (nowWatchingEnabled()) {
                rows.splice(2, 0,
                    { title: L('filmix_lane_now_movies'), section: 999, mode: 'popular' },
                    { title: L('filmix_lane_now_series'), section: 7,   mode: 'popular' }
                );
            }

            var results = new Array(rows.length);
            var done = 0;

            function finish() {
                var data = results.filter(function (r) { return r && r.results && r.results.length; });
                // "Continue watching" from history (all types) — first lane, already TMDB cards.
                var cont = continueCards(null);
                var contRow = cont.length ? { title: L('filmix_lane_continue'), results: cont } : null;
                if (!data.length && !contRow) { (onerror || function () {})(); return; }
                // Enrich catalog cards with TMDB rating/poster (history cards already have it), then emit.
                var all = data.reduce(function (acc, r) { return acc.concat(r.results); }, []);
                enrichCards(all, function () {
                    oncomplite(contRow ? [contRow].concat(data) : data);
                });
            }

            rows.forEach(function (row, i) {
                var reqUrl = row.mode === 'popular'
                    ? popularUrl({ section: row.section, page: 1 })
                    : catalogUrl({ cat: row.cat, sort: row.sort, page: 1 });

                get(reqUrl,
                    function (data) {
                        if (Array.isArray(data) && data.length) {
                            if (row.mode === 'popular') {
                                results[i] = {
                                    title:   row.title,
                                    source:  SOURCE_NAME,
                                    results: data.map(convertCard).filter(Boolean),
                                };
                            } else {
                                results[i] = {
                                    title:       row.title,
                                    genres:      row.genres,                  // for onMore → category
                                    sort:        row.sort,
                                    url:         laneUrl(row.cat, row.sort),  // "more" → category_full
                                    page:        1,
                                    total_pages: 999,                         // >1 so the "more" element appears
                                    source:      SOURCE_NAME,
                                    results:     data.map(convertCard).filter(Boolean),
                                };
                            }
                        }
                        if (++done === rows.length) finish();
                    },
                    function () {
                        if (++done === rows.length) finish();
                    }
                );
            });

            // no pagination on the home screen itself (each lane has its own "more")
            return false;
        },

        // ── Catalog menu: [{title, id}] ──
        menu: function (params, oncomplite) {
            oncomplite([
                { title: catTitle('s0'),  id: 's0'  },
                { title: catTitle('s7'),  id: 's7'  },
                { title: catTitle('s14'), id: 's14' },
                { title: catTitle('s93'), id: 's93' },
            ]);
        },

        // ── Category: two lanes — Latest and Top + next() ──
        category: function (params, oncomplite, onerror) {
            var parsed = parseCat(params);
            var cat    = parsed.cat;
            var name   = catTitle(cat);

            var lanes;
            if (cat === 's7') {
                // Series: "New episodes" (recent updates) + "New series" (newest titles) + "Top"
                lanes = [
                    { title: L('filmix_lane_new_episodes'),                    sort: 'date'   },
                    { title: L('filmix_lane_new') + ' ' + name.toLowerCase(),  sort: 'year'   },
                    { title: L('filmix_lane_top') + ' ' + name.toLowerCase(),  sort: 'rating' },
                ];
                // Place "Now watching" under "New series".
                if (nowWatchingEnabled()) {
                    lanes.splice(2, 0, { title: L('filmix_lane_now_series'), section: 7, mode: 'popular' });
                }
            } else {
                lanes = [
                    { title: L('filmix_lane_latest') + ' ' + name.toLowerCase(), sort: 'date'   },
                    { title: L('filmix_lane_top') + ' ' + name.toLowerCase(),    sort: 'rating' },
                ];
                // Place "Now watching" under "Latest".
                if (nowWatchingEnabled()) {
                    lanes.splice(1, 0, cat === 's14'
                        ? { title: L('filmix_lane_now_cartoons'), section: 14, mode: 'popular' }
                        : { title: L('filmix_lane_now_movies'),   section: 999, mode: 'popular' }
                    );
                }
            }

            // Collections "Foreign"/"Russian" (films & series only) via filter=<section>-c996/-c6
            if (cat === 's0' || cat === 's7') {
                if (foreignEnabled()) {
                    lanes.push({ title: L('filmix_coll_foreign') + ' ' + name.toLowerCase(), sort: 'date', cat: cat + '-c996' });
                }
                if (russianEnabled()) {
                    lanes.push({ title: L('filmix_coll_russian') + ' ' + name.toLowerCase(), sort: 'date', cat: cat + '-c6'   });
                }
            }

            // Initial load: all lanes in parallel
            var rows = new Array(lanes.length);
            var done = 0;
            lanes.forEach(function (lane, i) {
                var laneCat = lane.cat || cat;
                var reqUrl = lane.mode === 'popular'
                    ? popularUrl({ section: lane.section, page: 1 })
                    : catalogUrl({ cat: laneCat, sort: lane.sort, page: 1 });

                get(reqUrl,
                    function (data) {
                        if (Array.isArray(data) && data.length) {
                            if (lane.mode === 'popular') {
                                rows[i] = {
                                    title:   lane.title,
                                    source:  SOURCE_NAME,
                                    results: data.map(convertCard).filter(Boolean),
                                };
                            } else {
                                rows[i] = {
                                    title:       lane.title,
                                    genres:      laneCat,
                                    sort:        lane.sort,
                                    url:         laneUrl(laneCat, lane.sort),  // "more" → category_full → list()
                                    page:        1,
                                    total_pages: 999,                         // >1 so the "more" element appears
                                    source:      SOURCE_NAME,
                                    results:     data.map(convertCard).filter(Boolean),
                                };
                            }
                        }
                        if (++done === lanes.length) finish();
                    },
                    function () { if (++done === lanes.length) finish(); }
                );
            });

            function finish() {
                var out = rows.filter(function (r) { return r && r.results && r.results.length; });
                // "Continue watching" filtered by this category's type — first lane.
                continueCardsForCat(cat, function (cont) {
                    var contRow = cont.length ? { title: L('filmix_lane_continue'), results: cont } : null;
                    if (!out.length && !contRow) { (onerror || function () {})(); return; }
                    var all = out.reduce(function (acc, r) { return acc.concat(r.results); }, []);
                    enrichCards(all, function () {
                        oncomplite(contRow ? [contRow].concat(out) : out);
                    });
                });
            }

            // Fixed lanes; each lane paginates via its own "more" (category_full).
            return false;
        },

        // ── Paginated list (component list): {results, total_pages} ──
        list: function (params, oncomplite, onerror) {
            var parsed = parseCat(params);
            var page   = params.page || 1;

            get(catalogUrl({ cat: parsed.cat, sort: parsed.sort, page: page }),
                function (data) {
                    if (!Array.isArray(data) || !data.length) {
                        (onerror || function () {})();
                        return;
                    }
                    var cards = data.map(convertCard).filter(Boolean);
                    enrichCards(cards, function () {
                        oncomplite({
                            results:     cards,
                            total_pages: 999,   // API does not report the page count
                            page:        page,
                        });
                    });
                },
                onerror || function () {}
            );
        },

        // ── Full card: {movie, persons, simular, episodes, videos} ──
        full: function (params, oncomplite, onerror) {
            var id = params.id || (params.card && (params.card.filmix_id || params.card.id));
            if (!id) { (onerror || function () {})(); return; }

            // Enriches result with TMDB data (cast/similar/recommendations/videos) and emits it
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

            // Fallback: post details unavailable (404 etc.) — build the card from
            // catalog data (params.card) + TMDB. No Filmix player (no links available).
            function fallback() {
                var card = params.card;
                if (!card) { (onerror || function () {})(); return; }
                var serial = isCardSerial(card) || !!card.name || params.method === 'tv';
                // Ensure fields the full card renderer reads without a guard
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

            // Load the card from Filmix (our render) — fallback when there is no TMDB match
            function loadFilmix() {
            get(postUrl(id),
                function (data) {
                    if (!data || !data.id) { fallback(); return; }

                    var movie = convertCard(data);
                    var playlist = ((data.player_links || {}).playlist) || {};
                    var seasonsCount = countSeasons(playlist);

                    // runtime, date
                    if (data.duration) movie.runtime = data.duration;

                    // persons — Lampa's person click reads data.id + data.source
                    // straight off these objects (falling back to the *global*
                    // default source when missing, which opens the wrong person),
                    // so stamp source: SOURCE_NAME to match found_actors' Filmix ids.
                    // Filmix gives directors as plain name strings with no id at
                    // all — leave id unset so the click cleanly no-ops instead of
                    // resolving to an unrelated Filmix person by coincidence.
                    var cast = (data.found_actors || []).map(function (a) {
                        return {
                            id: a.id, source: SOURCE_NAME, name: a.name,
                            original_name: a.original_name || '',
                            character: '', profile_path: '',
                        };
                    });
                    var crew = (data.directors || []).map(function (name) {
                        return { source: SOURCE_NAME, name: name, job: 'Director', profile_path: '' };
                    });

                    // series: season count, attach the playlist to the card
                    if (seasonsCount) {
                        movie.number_of_seasons = seasonsCount;
                        movie.seasons_count     = seasonsCount;
                        movie.filmix_playlist   = playlist;
                    }

                    // trailers
                    var trailers = (data.player_links || {}).trailer || [];
                    var videos = {
                        results: trailers.map(function (t, i) {
                            return {
                                name: L('filmix_trailer') + ' ' + (i + 1),
                                key:  (t && t.link) ? t.link : t,
                                site: 'direct', type: 'Trailer',
                            };
                        }),
                    };

                    // direct links for a movie
                    var movieLinks = (data.player_links || {}).movie || [];
                    if (movieLinks.length) movie.filmix_links = movieLinks;

                    var result = {
                        movie:   movie,
                        persons: { cast: cast, crew: crew },
                        simular: { results: (data.relates || []).map(convertCard).filter(Boolean) },
                        videos:  videos,
                    };

                    // first-season episodes (for series)
                    if (seasonsCount) {
                        var firstSeason = Object.keys(playlist).sort(function (a, b) { return +a - +b; })[0];
                        var built = buildSeasonEpisodes(playlist, firstSeason, movie);
                        result.episodes = {
                            episodes:      built.episodes,
                            seasons_count: built.seasons_count,
                            name:          L('filmix_season') + ' ' + firstSeason,
                        };
                    }

                    // Enrich the card with TMDB data and emit the result.
                    var serial = isSerial(data.section);
                    emit(result, movie, serial);
                },
                fallback
            );
            }

            // Redirect mode: open the NATIVE TMDB card (reviews, seasons/episodes,
            // everything native). List comes from Filmix, card from TMDB.
            // If there is no match — show our Filmix card.
            if (tmdbEnabled() && tmdbRedirect()) {
                var rc      = params.card || {};
                var rserial = isCardSerial(rc) || !!rc.name || params.method === 'tv';

                function redirectTo(tmdbId) {
                    // Defer: Activity.replace must run AFTER full()/onCreate returns,
                    // otherwise it races the activity being created and hangs on a spinner.
                    setTimeout(function () {
                        rememberTmdbFilmix(tmdbId, id);
                        Lampa.Activity.replace({
                            component: 'full',
                            source:    'tmdb',
                            id:        tmdbId,
                            method:    rserial ? 'tv' : 'movie',
                            card:      { id: tmdbId, source: 'tmdb', filmix_id: id },
                        });
                    }, 0);
                }

                // tmdb_id already resolved during lane enrichment → redirect instantly
                if (rc.tmdb_id) { redirectTo(rc.tmdb_id); return; }

                var rtitle  = rserial
                    ? (rc.filmix_original_name || rc.original_name || rc.name || rc.original_title || rc.title)
                    : (rc.original_title || rc.title || rc.name);
                var ryear   = ((rserial ? rc.first_air_date : rc.release_date) || '').slice(0, 4);

                if (rtitle) {
                    tmdbFindId(rtitle, ryear, rserial, function (tmdbId) {
                        if (tmdbId) redirectTo(tmdbId);
                        else loadFilmix();   // no TMDB match — our card
                    });
                    return;
                }
            }

            loadFilmix();
        },

        // ── Seasons: (tv, from, oncomplite) → {[n]:{episodes, seasons_count}} ──
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

            // playlist is already on the card (from full) — use it
            if (playlist && Object.keys(playlist).length) { emit(playlist); return; }

            // otherwise request the post
            if (!id) { oncomplite({}); return; }
            get(postUrl(id),
                function (data) {
                    var pl = ((data && data.player_links) || {}).playlist || {};
                    emit(pl);
                },
                function () { oncomplite({}); }
            );
        },

        // ── Search (requires a token) ──
        search: function (params, oncomplite, onerror) {
            var query = params.query || params.search || '';
            if (!query) { oncomplite({ movie: { results: [] }, tv: { results: [] } }); return; }

            if (!token()) {
                Lampa.Noty.show(L('filmix_noty_need_token'));
                oncomplite({ movie: { results: [] }, tv: { results: [] } });
                return;
            }

            get(searchUrl(query),
                function (data) {
                    var cards = (Array.isArray(data) ? data : []).map(convertCard).filter(Boolean);
                    // global search expects {movie:{...}, tv:{...}} OR an array — return an array of rows
                    oncomplite([{ title: 'Filmix: ' + query, results: cards }]);
                },
                onerror || function () {}
            );
        },

        // ── Person: {person, credits:{knownFor:[{name, credits:[...]}]}} ──
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
                                { name: data.career || L('filmix_filmography'), credits: movies },
                            ] : [],
                        },
                    });
                },
                onerror || function () {}
            );
        },

        // ── Reset network requests ──
        clear: function () {
            clearRequests();
        },

        // ── Other interface methods (stubs) ──
        img: function (path) { return path || ''; },
        menuCategory: function (params, oncomplite) { (oncomplite || function () {})([]); },
        company:     function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
        favorite:    function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
        relise:      function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
        genres:      function (params, oncomplite) { (oncomplite || function () {})([]); },
        collections: function (params, oncomplite) { (oncomplite || function () {})({ results: [] }); },
    };

    // ─────────────────────────────────────────────────────────────
    // Device activation flow (Smart TV style):
    //   1. Request token_request → get a user_code (4 letters)
    //   2. Show the user the code and the filmix.me/activate link
    //   3. Poll user_profile every 5 seconds
    //   4. When user_data appears — save the token and stop polling
    // ─────────────────────────────────────────────────────────────
    var _activationTimer = null;

    function stopActivation() {
        if (_activationTimer) { clearInterval(_activationTimer); _activationTimer = null; }
    }

    function startDeviceActivation() {
        stopActivation();
        Lampa.Noty.show(L('filmix_noty_requesting'));
        fetch(tokenRequestUrl())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data || data.status !== 'ok' || !data.code) {
                    Lampa.Noty.show(L('filmix_noty_code_fail'));
                    return;
                }
                // The long code is the candidate token. It becomes valid as soon
                // as the user confirms the device on the Filmix site.
                var candidateToken = data.code;
                var userCode       = data.user_code || '';

                // Show a dialog that stays on screen until the token is received
                Lampa.Select.show({
                    title: L('filmix_link_dialog_title') + ' ' + userCode,
                    items: [
                        { title: L('filmix_link_your_code') + ' ' + userCode },
                        { title: L('filmix_link_instr') },
                        { title: L('filmix_close'), cancel: true },
                    ],
                    onSelect: function () { stopActivation(); Lampa.Controller.toggle('settings_component'); },
                    onBack:   function () { stopActivation(); Lampa.Controller.toggle('settings_component'); },
                });

                var attempts = 0;
                var MAX = 60; // ~5 min (60 × 5 sec)
                _activationTimer = setInterval(function () {
                    attempts++;
                    if (attempts > MAX) {
                        stopActivation();
                        Lampa.Noty.show(L('filmix_noty_timeout'));
                        return;
                    }
                    // Poll user_profile with the candidate token.
                    // user_data appeared → the device is confirmed, the token works.
                    fetch(userProfileUrl(candidateToken))
                        .then(function (r) { return r.json(); })
                        .then(function (resp) {
                            if (resp && resp.user_data) {
                                stopActivation();
                                Lampa.Storage.set('filmix_token', candidateToken);
                                if (Lampa.Controller) Lampa.Controller.toggle('settings_component');
                                Lampa.Noty.show(L('filmix_noty_linked'));
                            }
                        })
                        .catch(function () {});
                }, 5000);
            })
            .catch(function () {
                Lampa.Noty.show(L('filmix_noty_net_error'));
            });
    }

    // ─────────────────────────────────────────────────────────────
    // "MediaSources" settings section (via Lampa.SettingsApi)
    // The token is NOT stored in code — it is entered by the user and saved
    // in Lampa.Storage['filmix_token'] (read by token()).
    // ─────────────────────────────────────────────────────────────
    function registerSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: SETTINGS_COMPONENT,
            name:      PLUGIN_TITLE,
            icon:      SETTINGS_ICON,
        });

        // Filmix section title
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param:     { type: 'title' },
            field:     { name: 'Filmix' },
        });

        // Token input field (type input — the value is saved to Storage automatically)
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:        'filmix_token',
                type:        'input',
                values:      '',
                'default':   '',
                placeholder: L('filmix_token_placeholder'),
            },
            field: {
                name:        L('filmix_token_name'),
                description: L('filmix_token_desc'),
            },
            onChange: function (value) {
                Lampa.Storage.set('filmix_token', (value || '').trim());
                Lampa.Noty.show((value || '').trim()
                    ? L('filmix_noty_token_saved')
                    : L('filmix_noty_token_cleared'));
            },
        });

        // TMDB card enrichment toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_tmdb_cards',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_tmdb_cards_name'),
                description: L('filmix_tmdb_cards_desc'),
            },
        });

        // Quality label on lane/list cards toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_quality_label',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_quality_label_name'),
                description: L('filmix_quality_label_desc'),
            },
        });

        // Episode label ("S3E1") on series poster cards toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_episode_label',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_episode_label_name'),
                description: L('filmix_episode_label_desc'),
            },
        });

        // "Now watching" lanes toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_now_lanes',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_now_lanes_name'),
                description: L('filmix_now_lanes_desc'),
            },
        });

        // Filmix comments button toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_comments_button_enabled',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_comments_toggle_name'),
                description: L('filmix_comments_toggle_desc'),
            },
        });

        // Redirect-to-native-TMDB-card toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_tmdb_redirect',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_redirect_name'),
                description: L('filmix_redirect_desc'),
            },
        });

        // "Foreign" collections toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_foreign',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_foreign_name'),
                description: L('filmix_foreign_desc'),
            },
        });

        // "Russian" collections toggle
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name:      'filmix_russian',
                type:      'trigger',
                'default': true,
            },
            field: {
                name:        L('filmix_russian_name'),
                description: L('filmix_russian_desc'),
            },
        });

        // Account linking button via the device activation flow
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param:     { type: 'button' },
            field: {
                name:        L('filmix_link_name'),
                description: L('filmix_link_desc'),
            },
            onChange:  startDeviceActivation,
        });

        // Token check button
        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param:     { type: 'button' },
            field:     { name: L('filmix_check_name') },
            onChange:  function () {
                if (!token()) { Lampa.Noty.show(L('filmix_noty_token_not_set')); return; }
                Lampa.Noty.show(L('filmix_noty_checking'));
                get(searchUrl('matrix'),
                    function (data) {
                        Lampa.Noty.show(Array.isArray(data) && data.length
                            ? L('filmix_noty_token_works')
                            : L('filmix_noty_token_empty'));
                    },
                    function () { Lampa.Noty.show(L('filmix_noty_token_invalid')); }
                );
            },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────
    function init() {
        if (window.filmix_plugin_loaded) return;
        window.filmix_plugin_loaded = true;

        // Keep TMDB redirect enabled by default for fresh installs/profiles.
        if (Lampa.Storage.field('filmix_tmdb_redirect') === undefined) {
            Lampa.Storage.set('filmix_tmdb_redirect', true);
        }

        registerLang();
        loadMetaCache();
        startCommentsButtonWatcher();
        startEpisodeBadgeWatcher();
        startPersonSourceFixWatcher();

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
