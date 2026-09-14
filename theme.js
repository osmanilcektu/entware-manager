// Entware Manager — единый механизм тем (пресеты + день/ночь)
// Copyright (c) 2026 Di1r1 — https://github.com/Di1r1/entware-manager
// Ставит data-theme="violet|ocean|forest|teal|amber|ruby|rose" и класс night на <html>.

(function() {
    'use strict';

    var THEMES = [
        { id: 'violet', label: 'Фиолетовый', color: '#8b5cf6' },
        { id: 'ocean',   label: 'Океан',      color: '#0ea5e9' },
        { id: 'forest',  label: 'Изумруд',    color: '#10b981' },
        { id: 'teal',    label: 'Бирюза',     color: '#14b8a6' },
        { id: 'amber',   label: 'Янтарь',     color: '#f59e0b' },
        { id: 'ruby',    label: 'Рубин',      color: '#ef4444' },
        { id: 'rose',    label: 'Роза',        color: '#ec4899' }
    ];

    var STORAGE_KEY = 'entware_theme';
    var NIGHT_KEY = 'entware_night';

    function readStorage(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function writeStorage(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    }
    function removeStorage(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }

    function migrate() {
        var v = readStorage(STORAGE_KEY);
        if (v === 'day' || v === 'night') {
            writeStorage(STORAGE_KEY, 'violet');
            if (v === 'night') writeStorage(NIGHT_KEY, '1');
            else removeStorage(NIGHT_KEY);
        }
    }

    function currentTheme() {
        var id = readStorage(STORAGE_KEY);
        if (!id) return 'violet';
        return THEMES.some(function(t) { return t.id === id; }) ? id : 'violet';
    }

    function automaticNight() {
        var h = new Date().getHours();
        return h >= 20 || h < 6;
    }

    function isNight() {
        var stored = readStorage(NIGHT_KEY);
        if (stored === '1') return true;
        if (stored === '0') return false;
        return automaticNight();
    }

    function applyTheme(themeId, night) {
        var el = document.documentElement;
        el.setAttribute('data-theme', themeId || 'violet');
        if (night) el.classList.add('night');
        else el.classList.remove('night');
    }

    function applyFromStorage() {
        migrate();
        var stored = readStorage(NIGHT_KEY);
        var night = stored === '1' ? true : stored === '0' ? false : automaticNight();
        applyTheme(currentTheme(), night);
    }

    function init() {
        applyFromStorage();
        window.addEventListener('storage', function(e) {
            if (e.key === STORAGE_KEY || e.key === NIGHT_KEY) applyFromStorage();
        });
    }

    function set(themeId, night) {
        writeStorage(STORAGE_KEY, themeId);
        if (night !== undefined) writeStorage(NIGHT_KEY, night ? '1' : '0');
        applyTheme(themeId, night === undefined ? isNight() : night);
    }

    window.Theme = {
        THEMES: THEMES,
        init: init,
        set: set,
        current: currentTheme,
        isNight: isNight,
        applyFromStorage: applyFromStorage
    };
})();

// Router UI stability hotfix: serializes tab navigation and makes legacy
// network/monitor module loading use the shared race-safe loadScript().
(function() {
    'use strict';

    function installStabilityHotfix() {
        if (window.__ENTWARE_UI_STABILITY_INSTALLED) return;
        if (typeof window.loadTab !== 'function' || typeof window.loadScript !== 'function') return;
        window.__ENTWARE_UI_STABILITY_INSTALLED = true;

        var pendingTab = null;
        var navRunning = false;
        var navPromise = Promise.resolve();

        function stopTabUpdates() {
            try {
                if (typeof settingsInterval !== 'undefined' && settingsInterval) {
                    clearInterval(settingsInterval);
                    settingsInterval = null;
                }
            } catch (_) {}
            try {
                if (typeof servicesInterval !== 'undefined' && servicesInterval) {
                    clearInterval(servicesInterval);
                    servicesInterval = null;
                }
            } catch (_) {}
            try { if (typeof stopCpuLive === 'function') stopCpuLive(); } catch (_) {}
            try { if (typeof MONITOR !== 'undefined' && MONITOR.stopUpdates) MONITOR.stopUpdates(); } catch (_) {}
            try { if (typeof SMART !== 'undefined' && SMART.stopUpdates) SMART.stopUpdates(); } catch (_) {}
            try { if (typeof RDP !== 'undefined' && RDP.stopUpdates) RDP.stopUpdates(); } catch (_) {}
            try {
                if (typeof NETWORK !== 'undefined' && NETWORK.intervalId) {
                    clearInterval(NETWORK.intervalId);
                    NETWORK.intervalId = null;
                }
            } catch (_) {}
            try {
                if (typeof SERVICE_WATCHDOG !== 'undefined' && SERVICE_WATCHDOG.intervalId) {
                    clearInterval(SERVICE_WATCHDOG.intervalId);
                    SERVICE_WATCHDOG.intervalId = null;
                }
            } catch (_) {}
        }

        window.loadNetworkTab = async function() {
            if (typeof initNetworkTab === 'function') {
                initNetworkTab();
                return;
            }
            try {
                await loadScript('/entware-manager/network.js?v=17');
                if (typeof initNetworkTab !== 'function') throw new Error('network module init missing');
                initNetworkTab();
            } catch (err) {
                var target = document.getElementById('content');
                if (target) target.innerHTML = '<p class="error">Не удалось загрузить модуль сети</p>';
                throw err;
            }
        };

        window.loadMonitorTab = async function() {
            if (typeof initMonitorTab === 'function') {
                initMonitorTab();
                return;
            }
            try {
                await loadScript('/entware-manager/monitor.js?v=9');
                if (typeof initMonitorTab !== 'function') throw new Error('monitor module init missing');
                initMonitorTab();
            } catch (err) {
                var target = document.getElementById('content');
                if (target) target.innerHTML = '<p class="error">Не удалось загрузить модуль защиты</p>';
                throw err;
            }
        };

        async function runTab(tabName) {
            var ver = window.APP_VERSION || 'loading...';
            console.log('[v' + ver + '] Загрузка вкладки:', tabName);
            stopTabUpdates();

            if (tabName === 'packages' || tabName === 'available' || tabName === 'updates') {
                renderPackagesTab(tabName);
                Menu.setActiveTab('packages');
                return;
            }
            if (tabName === 'processes') { renderProcessesTab(); Menu.setActiveTab(tabName); return; }
            if (tabName === 'terminal') { renderTerminalTab(); Menu.setActiveTab(tabName); return; }
            if (tabName === 'settings') { await renderSettingsTab(); Menu.setActiveTab(tabName); return; }
            if (tabName === 'system-services') { await loadSystemServicesTab(); Menu.setActiveTab(tabName); return; }
            if (tabName === 'monitor') { await window.loadMonitorTab(); Menu.setActiveTab(tabName); return; }
            if (tabName === 'logs') { await Promise.resolve(loadLogsTab()); Menu.setActiveTab(tabName); return; }
            if (tabName === 'network') { await window.loadNetworkTab(); Menu.setActiveTab(tabName); return; }
            if (tabName === 'bridge') { await renderBridgeTab(); Menu.setActiveTab(tabName); return; }

            if (tabName === 'help') {
                contentDiv.innerHTML = '<p>Загрузка...</p>';
                try {
                    var helpResponse = await apiFetch('/help.cgi');
                    var helpHtml = await helpResponse.text();
                    contentDiv.innerHTML = helpHtml;
                    initHelpSearch();
                    Menu.setActiveTab(tabName);
                } catch (err) {
                    contentDiv.innerHTML = '<p class="error">Ошибка загрузки: ' + escapeHtml(err.message) + '</p>';
                    Menu.setActiveTab(tabName);
                }
                return;
            }

            if (tabName === 'smart') {
                if (!window.SMART_LOADED) {
                    await loadScript('/entware-manager/smart.js?v=11');
                    window.SMART_LOADED = true;
                }
                SMART.init();
                Menu.setActiveTab(tabName);
                return;
            }

            if (tabName === 'rdp') {
                if (!window.RDP_LOADED) {
                    await loadScript('/entware-manager/rdp.js?v=27');
                    window.RDP_LOADED = true;
                }
                RDP.init();
                Menu.setActiveTab(tabName);
                return;
            }

            contentDiv.innerHTML = '<p>Загрузка...</p>';
            try {
                var response = await apiFetch('/' + tabName + '.cgi');
                var html = await response.text();
                contentDiv.innerHTML = html;
                if (tabName === 'stats') {
                    initStatsTabs();
                    loadNetworkStatus();
                    setTimeout(function() {
                        renderLinksOnStats();
                        renderBridgeCardsOnStats();
                        enableTableSorting();
                    }, 100);
                    startCpuLive();
                }
                Menu.setActiveTab(tabName);
            } catch (err) {
                contentDiv.innerHTML = '<p class="error">Ошибка загрузки: ' + escapeHtml(err.message) + '</p>';
                Menu.setActiveTab(tabName);
            }
        }

        window.loadTab = function(tabName) {
            pendingTab = tabName;
            if (navRunning) return navPromise;

            navRunning = true;
            navPromise = (async function() {
                while (pendingTab !== null) {
                    var nextTab = pendingTab;
                    pendingTab = null;
                    try {
                        await runTab(nextTab);
                    } catch (err) {
                        console.error('Entware tab load failed:', nextTab, err);
                        var target = document.getElementById('content');
                        if (target) target.innerHTML = '<p class="error">Ошибка загрузки: ' + escapeHtml(err.message || err) + '</p>';
                    }
                }
            })().finally(function() {
                navRunning = false;
                if (pendingTab !== null) window.loadTab(pendingTab);
            });
            return navPromise;
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installStabilityHotfix, { once: true });
    } else {
        setTimeout(installStabilityHotfix, 0);
    }
})();
