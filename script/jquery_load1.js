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
            './style/index.css', // 你的字体定义在这里面
            { url: './style/phone.css', media: 'screen and (max-width: 800px)' }
        ],
        js: [
            './script/jquery.min.js', 
            './script/set.js', 
            './script/js.js', 
            './script/swiper/swiper.jquery.min.js'
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
                el.async = false;
            }
            el.onload = () => resolve(true);
            el.onerror = () => resolve(false);
            document.head.appendChild(el);
        });
    };

    async function init() {
        // 设置 5 秒兜底，防止网络极差时页面永久空白
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
            // 1. 先加载 JS
            for (const url of ASSETS.js) {
                await loadResource('js', url);
            }

            // 2. 加载所有 CSS (包括含有 @font-face 的 index.css)
            await Promise.all(ASSETS.css.map(item => loadResource('css', item)));

            // 3. 【核心优化】等待字体文件下载完成
            // document.fonts.ready 会等待 CSS 中引用的所有字体下载完毕
            if (document.fonts) {
                try {
                    await document.fonts.ready;
                } catch (e) {
                    console.warn("字体加载超时或失败，跳过等待");
                }
            }

            // 4. 释放 jQuery 队列
            if (window._jqQueue.length > 0) {
                window._jqQueue.forEach(fn => { try { fn(window.jQuery); } catch(e){} });
            }
        }

        clearTimeout(failSafe);
        root.style.display = ''; // 所有资源（JS/CSS/字体）就绪后，显示网页
    }

    init();
})();
