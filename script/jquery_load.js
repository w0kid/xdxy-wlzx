(function() {
    const root = document.documentElement;
    root.style.display = 'none'; // 初始隐藏

    // jQuery 拦截器
    window._jqQueue = [];
    window.$ = window.jQuery = function(arg) {
        if (typeof arg === 'function') window._jqQueue.push(arg);
        const proxy = {
            ready: (fn) => window._jqQueue.push(fn),
            on: function() { return proxy; },
            attr: function() { return proxy; },
            css: function() { return proxy; }
        };
        return proxy;
    };

    const timestamp = Date.now();
    const CONFIG_SOURCES = [
          `https://cdn.jsdelivr.net/gh/w0kid/xdxy-wlzx/check.json?t=${timestamp}`,
          `https://raw.githubusercontent.com/w0kid/xdxy-wlzx/main/check.json?t=${timestamp}`
    ];

    const ASSETS = {
        css: [
            './style/index.vsb.css',
            './style/index.css',
            './script/swiper/swiper.min.css',   
            './script/swiper/swiper-bundle.min.css',
            { url: './style/phone.css', media: 'screen and (max-width: 800px)' }
        ],
        js: [
            './script/jquery.min.js', 
            './script/TweenMax.min.js',
            './script/set.js', 
            './script/js.js', 
            './script/swiper/swiper.jquery.min.js',
            //'https://cdn.jsdelivr.net/gh/w0kid/shell@main/page-agent.js'
            {
                url: 'https://cdn.jsdelivr.net/gh/w0kid/shell@main/page-agent.js',
                defer: true,
                crossorigin: true
            }
        ]
    };

    const loadResource = (type, item) => {
        return new Promise((resolve) => {
            const url = typeof item === 'string' ? item : item.url;
            const el = document.createElement(type === 'css' ? 'link' : 'script');
            if (type === 'css') {
                el.rel = 'stylesheet';
                el.href = url;
                if (typeof item === 'object' && item.media) {
                    el.media = item.media;
                }
            } else {
                el.src = url;
                el.async = false; // 保证 JS 按数组顺序执行
            }
            el.onload = () => resolve(true);
            el.onerror = () => resolve(false);
            document.head.appendChild(el);
        });
    };

    async function init() {
        const failSafe = setTimeout(() => { root.style.display = ''; }, 5000);
        
        let config = null;
        for (const url of CONFIG_SOURCES) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    config = await res.json();
                    break;
                }
            } catch (e) {}
        }

        if (config && config.enableProtection === true) {
            // 1. 顺序加载所有 JS
            for (const url of ASSETS.js) {
                await loadResource('js', url);
            }

            // 2. 并行加载所有 CSS
            await Promise.all(ASSETS.css.map(item => loadResource('css', item)));

            // 3. 等待字体下载完毕
            if (document.fonts) {
                try { await document.fonts.ready; } catch (e) {}
            }

            // 4. 先让页面显示出来，DOM 元素获得真实的宽高
            clearTimeout(failSafe);
            root.style.display = ''; 

            // 5. 页面显示后，再执行 jQuery 缓存的 ready 函数（此时 Swiper 就能正常初始化了）
            if (window._jqQueue.length > 0) {
                window._jqQueue.forEach(fn => { try { fn(window.jQuery); } catch(e){} });
            }
        } else {
            // 如果未启用保护或加载失败，直接显示页面
            clearTimeout(failSafe);
            root.style.display = '';
        }
    }

    init();
})();
