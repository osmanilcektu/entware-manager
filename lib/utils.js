// Entware Manager - общие утилиты для JavaScript
// Версия: 1.3 (race-safe loadScript)
// Дата: 2026-09-14

const API_BASE = '/entware-cgi';
const UI_BASE = '/entware-manager';
const ICONS = UI_BASE + '/icons.svg?v=6';

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

function apiFetch(path, options) {
    var url = API_BASE + path;
    if (!options || !options.method || options.method === 'GET') {
        var sep = path.indexOf('?') > -1 ? '&' : '?';
        url += sep + '_=' + Date.now();
    }
    return fetch(url, options).then(function(r) {
        if (r.status === 401 && path.indexOf('/login.cgi') === -1 && path.indexOf('/session.cgi') === -1) {
            if (typeof showLogin === 'function') showLogin();
            throw new Error('unauthorized');
        }
        if (!r.ok) throw new Error(r.statusText);
        return r;
    });
}

function apiGet(path) {
    return apiFetch(path).then(function(r) { return r.json(); });
}

function apiPost(path, body) {
    return apiFetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body
    }).then(function(r) { return r.json(); });
}

function apiPostJSON(path, data) {
    return apiFetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
}

function initTableSearch(inputId, tableId, cellIndex) {
    var input = document.getElementById(inputId);
    var table = document.getElementById(tableId);
    if (!input || !table) return;
    if (input.dataset.tableSearchInit === '1') return;
    input.dataset.tableSearchInit = '1';
    input.addEventListener('keyup', function() {
        var tbl = document.getElementById(tableId);
        if (!tbl) return;
        var rows = tbl.getElementsByTagName('tr');
        var filter = input.value.toLowerCase();
        var i;
        for (i = 1; i < rows.length; i++) {
            if (rows[i].className.indexOf('smart-usage-row') > -1) continue;
            var show = false;
            var cells = rows[i].getElementsByTagName('td');
            if (cellIndex < 0) {
                for (var j = 0; j < cells.length; j++) {
                    if (cells[j] && cells[j].textContent.toLowerCase().indexOf(filter) > -1) {
                        show = true;
                        break;
                    }
                }
            } else {
                var cell = cells[cellIndex || 0];
                if (cell) show = cell.textContent.toLowerCase().indexOf(filter) > -1;
            }
            if (filter === '') rows[i].style.removeProperty('display');
            else rows[i].style.display = show ? '' : 'none';
        }
        for (i = 1; i < rows.length; i++) {
            if (rows[i].className.indexOf('smart-usage-row') === -1) continue;
            var parent = rows[i].previousElementSibling;
            if (parent && parent.style.display !== 'none' && parent.className.indexOf('usage-open') > -1) rows[i].style.removeProperty('display');
            else rows[i].style.display = 'none';
        }
    });
}

var scriptLoadPromises = Object.create(null);

function loadScript(src) {
    if (scriptLoadPromises[src]) return scriptLoadPromises[src];

    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
        if (existing.dataset.entwareLoaded === '1') return Promise.resolve();
        if (existing.dataset.entwareDynamicScript === '1') {
            scriptLoadPromises[src] = new Promise(function(resolve, reject) {
                existing.addEventListener('load', function() { resolve(); }, { once: true });
                existing.addEventListener('error', function(err) { reject(err); }, { once: true });
            });
            return scriptLoadPromises[src];
        }
        return Promise.resolve();
    }

    var promise = new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.dataset.entwareDynamicScript = '1';
        script.onload = function() {
            script.dataset.entwareLoaded = '1';
            resolve();
        };
        script.onerror = function(err) {
            delete scriptLoadPromises[src];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(err);
        };
        document.head.appendChild(script);
    });

    scriptLoadPromises[src] = promise;
    return promise;
}

function parseSize(str) {
    if (!str) return 0;
    str = String(str).trim();
    if (!str || str === '—' || str === '-') return 0;
    var units = {
        'B': 1, 'K': 1024, 'M': 1048576, 'G': 1073741824, 'T': 1099511627776,
        'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1099511627776,
        'КБ': 1024, 'МБ': 1048576, 'ГБ': 1073741824, 'ТБ': 1099511627776
    };
    var m = str.match(/^([\d.,]+)\s*([A-Za-zА-Яа-я]+)?$/);
    if (!m) return 0;
    var val = parseFloat(m[1].replace(',', '.'));
    if (isNaN(val)) return 0;
    if (!m[2]) return val;
    var unit = m[2].toUpperCase();
    return units[unit] !== undefined ? val * units[unit] : val;
}

function formatSize(bytes) {
    var n = parseInt(bytes);
    if (!n || isNaN(n)) return '—';
    var KB = 1024, MB = 1048576, GB = 1073741824;
    if (n >= GB * 1024) return (n / (GB * 1024)).toFixed(1) + ' TB';
    if (n >= GB) return Math.round(n / GB) + ' GB';
    if (n >= MB) return Math.round(n / MB) + ' MB';
    if (n >= KB) return Math.round(n / KB) + ' KB';
    return n + ' B';
}
